import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMsg(error.message)
    } else {
      router.push('/')
    }
  }

  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setErrorMsg(error.message)
    } else {
      alert('가입 성공! 이메일을 확인하세요.')
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">로그인</h1>

      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border p-2 mb-2 w-full"
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="border p-2 mb-2 w-full"
        />

        {errorMsg && <p className="text-red-500 mb-2">{errorMsg}</p>}

        <button
          type="submit"
          className="bg-blue-500 text-white w-full py-2 mb-2"
        >
          로그인
        </button>
      </form>
      {/*
      <button
        onClick={handleSignup}
        className="bg-gray-500 text-white w-full py-2"
      >
        회원가입
      </button>
      */}
    </div>
  )
}