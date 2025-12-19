import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import useAuthStore from '../store/authStore'

function Login() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4 particles-bg">
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold float-animation">
            <Sparkles className="w-8 h-8 text-accent twinkle" />
            <span className="gradient-text-animate">Easy Animate</span>
          </Link>
          <p className="text-slate-400 mt-2">登录你的账户</p>
        </div>

        <div className="glow-border p-8">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-2">用户名或邮箱</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-dark/50 border border-dark-300 rounded-xl px-4 py-3 text-white focus:outline-none input-glow transition-all"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm text-slate-400 mb-2">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-dark/50 border border-dark-300 rounded-xl px-4 py-3 text-white focus:outline-none input-glow transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-primary to-accent rounded-xl font-medium transition-all disabled:opacity-50 btn-glow"
            >
              {loading ? '登录中...' : '登录'}
            </button>

            <p className="text-center text-slate-400 mt-6">
              还没有账户？{' '}
              <Link to="/register" className="text-accent hover:underline hover:text-accent-hover transition-colors">
                立即注册
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
