import { Outlet, Link, useLocation } from 'react-router-dom'
import { Sparkles, User, LogOut } from 'lucide-react'
import useAuthStore from '../store/authStore'

function Layout() {
  const location = useLocation()
  const { isAuthenticated, user, logout } = useAuthStore()

  const navItems = [
    { path: '/', label: '首页' },
    { path: '/gallery', label: '作品展' },
    { path: '/create', label: '创作工坊' },
    { path: '/profile', label: '用户中心', auth: true }
  ]

  return (
    <div className="min-h-screen bg-dark">
      <header className="border-b border-dark-200 bg-dark-100/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <Sparkles className="w-8 h-8 text-accent twinkle group-hover:scale-110 transition-transform" />
            <span className="text-xl font-bold gradient-text-animate">Easy Animate</span>
          </Link>

          <nav className="flex items-center gap-8">
            {navItems.map(item => (
              (!item.auth || isAuthenticated) && (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm transition-colors ${
                    location.pathname === item.path
                      ? 'text-primary'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              )
            ))}
            {user?.is_admin && (
              <Link
                to="/admin"
                className={`text-sm transition-colors ${
                  location.pathname === '/admin' ? 'text-primary' : 'text-gray-400 hover:text-white'
                }`}
              >
                管理后台
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-gray-400">
                  {user?.username} | 剩余: {user?.quota}次
                </span>
                <button
                  onClick={logout}
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-accent rounded-lg btn-glow"
              >
                <User className="w-4 h-4" />
                登录
              </Link>
            )}
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-dark-200 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          © 2025 Easy Animate - AI教学动画生成器
        </div>
      </footer>
    </div>
  )
}

export default Layout
