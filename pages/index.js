// pages/index.js
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import Link from 'next/link'

export default function Home() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.push('/login')
      } else {
        setUser(data.session.user)
      }
      setLoading(false)
    }

    checkSession()
  }, [router])

  if (loading) return <div>로딩 중...</div>

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">환영합니다, {user?.email}</h1>

      {/* 🔻 기능 메뉴 */}
      <div className="grid grid-cols-1 gap-4">
        <Link href="/upload">
         <h1 className="text-2xl font-bold mb-4">엑셀 자료 업로드 / 다운로드</h1>
        </Link>
      </div>
     <div className="grid grid-cols-1 gap-4">
        <Link href="/search-date">
         <h1 className="text-2xl font-bold mb-4">기간별 매출 조회</h1>
        </Link>
     </div>
     <div className="grid grid-cols-1 gap-4">
        <Link href="/search-name">
          <h1 className="text-2xl font-bold mb-4">성명 / 전화번호 조회</h1>
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <Link href="/send-sms">
           <h1 className="text-2xl font-bold mb-4">SMS 문자 보내기</h1>
        </Link>
      </div>

      {/* 🔻 로그아웃 */}
      <button
        onClick={async () => {
          await supabase.auth.signOut()
          router.push('/login')
        }}
        className="mt-6 bg-red-500 text-white px-4 py-2 rounded"
      >
        로그아웃
      </button>
    </div>
  )
}
