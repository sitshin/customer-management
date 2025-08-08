// /pages/api/send-sms.js
import fs from 'fs'
import axios from 'axios'
import crypto from 'crypto'

export const config = {
  api: {
    bodyParser: false
  }
}

const apiKey = process.env.NEXT_PUBLIC_SMS_API_KEY
const apiSecret = process.env.NEXT_PUBLIC_SMS_API_SECRET
const senderNumber = process.env.NEXT_PUBLIC_SMS_SENDER

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const formidable = await import('formidable')
  const form = formidable.default({ multiples: false })

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('폼 파싱 실패:', err)
      return res.status(500).json({ error: '폼 파싱 실패' })
    }

    const { message, receivers } = fields
    let receiverList = []

    try {
      receiverList = JSON.parse(receivers)
    } catch (e) {
      return res.status(400).json({ error: '수신자 형식 오류' })
    }

    if (!message || !Array.isArray(receiverList)) {
      return res.status(400).json({ error: '메시지와 수신자 목록이 필요합니다' })
    }

    const date = new Date().toISOString()
    const salt = crypto.randomBytes(32).toString('hex')
    const hmacData = date + salt
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(hmacData)
      .digest('hex')

    let imageId = null

    // 이미지가 있다면 Solapi에 업로드
if (files.image) {
  try {
    const FormData = (await import('form-data')).default
    const formData = new FormData()

    // 배열 여부 확인
    const imageFile = Array.isArray(files.image) ? files.image[0] : files.image

    if (!imageFile) {
      return res.status(400).json({ error: '이미지 파일이 없습니다.' })
    }

    const filePath = imageFile.filepath || imageFile.filePath || imageFile.path
    if (!filePath) {
      return res.status(400).json({ error: '이미지 파일 경로를 찾을 수 없습니다.' })
    }

    formData.append('file', fs.createReadStream(filePath))

    // Solapi 이미지 업로드 요청...
  } catch (e) {
    console.error('이미지 업로드 실패:', e.response?.data || e.message)
    return res.status(500).json({ error: '이미지 업로드 실패' })
  }
}

    const results = []

    for (const to of receiverList) {
      try {
        const response = await axios.post(
          'https://api.solapi.com/messages/v4/send',
          {
            message: {
              to,
              from: senderNumber,
              text: String(message), // ✅ 문자열로 명시적 변환
              ...(imageId && { imageId })
            }
          },
          {
            headers: {
              Authorization: `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`,
              'Content-Type': 'application/json'
            }
          }
        )

        results.push({ to, status: 'success', data: response.data })
      } catch (err) {
        console.error(`Failed to send to ${to}`, err.response?.data || err.message)
        results.push({
          to,
          status: 'fail',
          error: err.response?.data || err.message
        })
      }
    }

    // ✅ 반드시 응답 보내기
    return res.status(200).json({ results })
  })
}