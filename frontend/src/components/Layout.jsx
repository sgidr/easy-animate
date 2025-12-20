import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { Sparkles, User, LogOut, Menu, X } from 'lucide-react'
import useAuthStore from '../store/authStore'

function Layout() {
  const location = useLocation()
  const { isAuthenticated, user, logout } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { path: '/', label: '首页' },
    { path: '/gallery', label: '作品展' },
    { path: '/create', label: '创作工坊' },
    { path: '/profile', label: '用户中心', auth: true }
  ]

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <div className="min-h-screen bg-dark">
      <header className="border-b border-dark-200 bg-dark-100/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-accent twinkle group-hover:scale-110 transition-transform" />
            <span className="text-lg sm:text-xl font-bold gradient-text-animate">Easy Animate</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
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

          {/* Desktop User Info */}
          <div className="hidden md:flex items-center gap-4">
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

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-dark-200 bg-dark-100">
            <nav className="flex flex-col p-4 space-y-3">
              {navItems.map(item => (
                (!item.auth || isAuthenticated) && (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={closeMobileMenu}
                    className={`text-sm py-2 px-3 rounded-lg transition-colors ${
                      location.pathname === item.path
                        ? 'text-primary bg-primary/10'
                        : 'text-gray-400 hover:text-white hover:bg-dark-200'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              ))}
              {user?.is_admin && (
                <Link
                  to="/admin"
                  onClick={closeMobileMenu}
                  className={`text-sm py-2 px-3 rounded-lg transition-colors ${
                    location.pathname === '/admin' ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-white hover:bg-dark-200'
                  }`}
                >
                  管理后台
                </Link>
              )}
              
              <div className="border-t border-dark-200 pt-3 mt-2">
                {isAuthenticated ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">
                      {user?.username} | 剩余: {user?.quota}次
                    </span>
                    <button
                      onClick={() => { logout(); closeMobileMenu(); }}
                      className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors text-sm"
                    >
                      <LogOut className="w-4 h-4" />
                      退出
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    onClick={closeMobileMenu}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-accent rounded-lg btn-glow"
                  >
                    <User className="w-4 h-4" />
                    登录
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-dark-200 py-6 sm:py-8 mt-8 sm:mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-xs sm:text-sm">
          © 2025 Easy Animate - AI教学动画生成器
        </div>
      </footer>
    </div>
  )
}

export default Layout
