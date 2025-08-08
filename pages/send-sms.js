import { IncomingForm } from 'formidable';
import { SolapiMessageService } from 'solapi';

export const config = {
  api: {
    bodyParser: false,
  },
};

const messageService = new SolapiMessageService(
  'NCSKIFZNISNKQ5PM',
  'DG4K9K4L79GJUIBDJJ2OEDXTTHNIINPZ'
);

const SMS_SENDER_NUMBER = '01025670099';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const form = new IncomingForm({ uploadDir: './uploads', keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('❌ Form parsing error:', err);
      return res.status(500).json({ success: false, error: 'Form parsing failed' });
    }

    try {
      const message = fields.message?.[0];
      const receivers = JSON.parse(fields.receivers?.[0] || '[]');
      const image = files.image?.[0];

      if (!message || receivers.length === 0) {
        return res.status(400).json({ success: false, error: '문자 내용 또는 대상 없음' });
      }

      // 1️⃣ 이미지 업로드
      let imageId = null;
      if (image) {
        const uploadRes = await messageService.uploadFile(image.filepath, 'MMS');
        imageId = uploadRes.fileId;
      }

      // 2️⃣ Promise.all로 병렬 발송
      const results = await Promise.all(
        receivers.map(async (to) => {
          const msgData = {
            to,
            from: SMS_SENDER_NUMBER,
            text: message,
            ...(imageId ? { imageId } : {})
          };

          try {
            const sendRes = await messageService.sendOne(msgData);
            console.log(`✅ ${to} 발송 성공`, sendRes);
            return { to, success: true, data: sendRes };
          } catch (err) {
            console.error(`❌ ${to} 발송 실패`, err);
            return { to, success: false, error: err.message || err };
          }
        })
      );

      res.status(200).json({ success: true, results });
    } catch (error) {
      console.error('❌ 전송 중 에러:', error.response?.data || error.message);
      res.status(500).json({
        success: false,
        error: error.message,
        details: error.response?.data,
      });
    }
  });
}