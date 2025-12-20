import { useState, useEffect } from 'react'
import { User, Star, Clock, LogOut, Edit2, Save, X, Trash2 } from 'lucide-react'
import api from '../services/api'
import useAuthStore from '../store/authStore'
import useToastStore from '../store/toastStore'
import AnimationCard from '../components/AnimationCard'
import ConfirmDialog from '../components/ConfirmDialog'

function Profile() {
  const { user, logout, fetchUser } = useAuthStore()
  const { success, error } = useToastStore()
  const [tab, setTab] = useState('my')
  const [animations, setAnimations] = useState([])
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editEmail, setEditEmail] = useState(user?.email || '')
  const [editAvatar, setEditAvatar] = useState(user?.avatar || '')
  const [saving, setSaving] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState(null)

  useEffect(() => {
    if (tab === 'my') {
      fetchMyAnimations()
    } else {
      fetchFavorites()
    }
  }, [tab])

  const fetchMyAnimations = async () => {
    setLoading(true)
    try {
      const res = await api.get('/animations/')
      setAnimations(res.data.animations)
    } catch (error) {
      console.error('Failed to fetch animations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFavorites = async () => {
    setLoading(true)
    try {
      const res = await api.get('/community/favorites')
      setFavorites(res.data.animations)
    } catch (error) {
      console.error('Failed to fetch favorites:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      await api.put('/auth/me', {
        email: editEmail,
        avatar: editAvatar
      })
      await fetchUser()
      setIsEditing(false)
      success('个人信息已保存')
    } catch (err) {
      error('保存失败: ' + (err.response?.data?.error || err.message))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAnimation = async (id) => {
    setConfirmDialog({
      title: '删除作品',
      message: '确定要删除这个作品吗？此操作不可撤销。',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await api.delete(`/animations/${id}`)
          success('已删除')
          fetchMyAnimations()
        } catch (err) {
          error(err.response?.data?.error || '删除失败')
        }
        setConfirmDialog(null)
      },
      onCancel: () => setConfirmDialog(null)
    })
  }

  const tabs = [
    { id: 'my', label: '我的作品', icon: User },
    { id: 'favorites', label: '我的收藏', icon: Star }
  ]

  return (
    <div className="py-8 sm:py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <div className="glow-border p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center border border-primary/30 pulse-glow flex-shrink-0">
                <User className="w-7 h-7 sm:w-10 sm:h-10 text-accent" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">{user?.username}</h1>
                <p className="text-slate-400 text-sm sm:text-base">{user?.email}</p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm">
                  <span className="flex items-center gap-1 text-accent">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                    剩余: {user?.quota}次
                  </span>
                  {user?.is_admin && (
                    <span className="px-2 py-0.5 bg-primary/20 text-primary rounded text-xs">
                      管理员
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-2 sm:p-3 bg-dark-200 hover:bg-dark-300 rounded-lg transition-colors self-end sm:self-auto"
            >
              {isEditing ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>

          {/* Edit Form */}
          {isEditing && (
            <div className="mt-6 pt-6 border-t border-dark-200 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">邮箱</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-dark/50 border border-dark-300 rounded-lg px-4 py-2 text-white focus:outline-none input-glow text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">头像URL</label>
                <input
                  type="text"
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full bg-dark/50 border border-dark-300 rounded-lg px-4 py-2 text-white focus:outline-none input-glow text-sm sm:text-base"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 py-2 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center gap-2 btn-glow disabled:opacity-50 text-sm sm:text-base"
                >
                  <Save className="w-4 h-4" />
                  {saving ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2 bg-dark-200 hover:bg-dark-300 rounded-lg transition-colors text-sm sm:text-base"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 sm:gap-4 mb-6 sm:mb-8">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-xl transition-all text-sm ${
                tab === id
                  ? 'bg-gradient-to-r from-primary to-accent text-white btn-glow'
                  : 'bg-dark-100 text-slate-400 hover:text-white border border-dark-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{id === 'my' ? '作品' : '收藏'}</span>
            </button>
          ))}
          <button
            onClick={logout}
            className="ml-auto flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">退出登录</span>
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-16 sm:py-20 text-slate-500">加载中...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {(tab === 'my' ? animations : favorites).map(animation => (
              <div key={animation.id} className="relative group">
                <AnimationCard animation={animation} showAuthor={false} />
                {tab === 'my' && (
                  <button
                    onClick={() => handleDeleteAnimation(animation.id)}
                    className="absolute top-3 right-3 p-2 bg-red-500/20 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/30 z-10"
                    title="删除作品"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && (tab === 'my' ? animations : favorites).length === 0 && (
          <div className="text-center py-16 sm:py-20 text-slate-500">
            {tab === 'my' ? '还没有创作任何动画' : '还没有收藏任何动画'}
          </div>
        )}
      </div>

      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          isDangerous={confirmDialog.isDangerous}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
    </div>
  )
}

export default Profile
