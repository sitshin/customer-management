import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import axios from 'axios'

const getToday = () => new Date().toISOString().slice(0, 10)

export default function SendSMSPage() {
  const [customers, setCustomers] = useState([])
  const [selectedCustomers, setSelectedCustomers] = useState([])

  const [fromDate, setFromDate] = useState(getToday())
  const [toDate, setToDate] = useState(getToday())
  const [minAmount, setMinAmount] = useState('')

  const [message, setMessage] = useState('')
  const [image, setImage] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loading, setLoading] = useState(false)

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10

  const fetchCustomers = async () => {
    let query = supabase
      .from('customer_sales')
      .select(`
        id,
        customer_flg,
        sale_date,
        customer_name,
        customer_phone1,
        customer_amount,
        customer_item,
        customer_phone2,
        customer_address
      `)
      .gte('sale_date', fromDate)
      .lte('sale_date', toDate)

    if (minAmount) {
      query = query.gte('customer_amount', Number(minAmount))
    }
  // 정렬 추가
    query = query.order('sale_date', { ascending: false }).order('customer_amount', { ascending: false })

    const { data, error } = await query
    if (error) {
      alert('데이터 조회 실패')
      console.error(error)
    } else {
      const numbered = data.map((item, index) => ({
        ...item,
        rownum: index + 1
      }))
      setCustomers(numbered)
      setCurrentPage(1) // 새로 조회 시 페이지 초기화
    }
  }

  const toggleCustomer = (id) => {
    setSelectedCustomers((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    )
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImage(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const sendSMS = async () => {
    if (!message.trim() || selectedCustomers.length === 0) {
      alert('문자 내용과 대상 고객을 선택하세요.')
      return
    }

    setLoading(true)
    const targets = customers.filter((c) => selectedCustomers.includes(c.id))
    const phoneNumbers = targets.map((t) => t.customer_phone1.replaceAll('-', '').trim())

    try {
      const formData = new FormData()
      formData.append('message', message)
      formData.append('receivers', JSON.stringify(phoneNumbers))
      if (image) formData.append('image', image)

      const res = await axios.post('/api/send-sms', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      const { results } = res.data
      const successCount = results.filter(r => r.success).length

      alert(`전송 완료 (${successCount}명 성공)`)
    } catch (err) {
      alert('문자 전송 실패')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // 페이지네이션 계산
  const indexOfLast = currentPage * rowsPerPage
  const indexOfFirst = indexOfLast - rowsPerPage
  const currentCustomers = customers.slice(indexOfFirst, indexOfLast)
  const totalPages = Math.ceil(customers.length / rowsPerPage)

  // 페이지 이동 함수
  const goToPage = (pageNum) => {
    if (pageNum < 1 || pageNum > totalPages) return
    setCurrentPage(pageNum)
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">SMS 문자보내기</h1>

      {/* 조회 조건 */}
      <div style={{ marginBottom: 12, display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
        <div>
          <label>매출일자 From:</label><br />
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <label>To:</label><br />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div>
          <label>금액 이상:</label><br />
          <input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
        </div>
        <div>
          <button onClick={fetchCustomers}>조회</button>
        </div>
      </div>

      {/* 좌우 레이아웃 (70% / 30%) */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* 고객 테이블 (70%) */}
        <div style={{ flex: '7 1 0%' }}>
          <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th>선택</th><th>순번</th><th>구분</th><th>매출일자</th><th>성명</th>
                <th>전화번호</th><th>금액</th><th>상품명</th><th>전화번호2</th><th>주소</th>
              </tr>
            </thead>
            <tbody>
              {currentCustomers.map((cust) => (
                <tr key={cust.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedCustomers.includes(cust.id)}
                      onChange={() => toggleCustomer(cust.id)}
                    />
                  </td>
                  <td>{cust.rownum}</td>
                  <td>{cust.customer_flg}</td>
                  <td>{cust.sale_date}</td>
                  <td>{cust.customer_name}</td>
                  <td>{cust.customer_phone1}</td>
                  <td>{cust.customer_amount}</td>
                  <td>{cust.customer_item}</td>
                  <td>{cust.customer_phone2}</td>
                  <td>{cust.customer_address}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 페이지 네비게이션 */}
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
              이전
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => goToPage(i + 1)}
                style={{
                  fontWeight: currentPage === i + 1 ? 'bold' : 'normal',
                  margin: '0 4px'
                }}
              >
                {i + 1}
              </button>
            ))}
            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
              다음
            </button>
          </div>
        </div>

        {/* 문자 입력 영역 (30%) */}
        <div style={{ flex: '3 1 0%' }}>
          <div style={{ marginBottom: 12 }}>
            <label>문자 내용</label><br />
            <textarea
              placeholder="보낼 문자 내용을 입력하세요"
              rows={10}
              style={{ width: '100%' }}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>이미지 첨부 (선택)</label><br />
            <input type="file" accept="image/*" onChange={handleImageChange} />
            {previewUrl && (
              <div style={{ marginTop: 10 }}>
                <strong>미리보기:</strong><br />
                <img src={previewUrl} alt="미리보기" style={{ maxWidth: '100%', maxHeight: 200 }} />
              </div>
            )}
          </div>

          <button
            onClick={sendSMS}
            disabled={loading}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {loading ? '전송 중...' : '📨 문자 보내기'}
          </button>
        </div>
      </div>
    </div>
  )
}