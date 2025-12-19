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
    <div className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <div className="glow-border p-8 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center border border-primary/30 pulse-glow">
                <User className="w-10 h-10 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{user?.username}</h1>
                <p className="text-slate-400">{user?.email}</p>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="flex items-center gap-1 text-accent">
                    <Clock className="w-4 h-4" />
                    剩余生成次数: {user?.quota}
                  </span>
                  {user?.is_admin && (
                    <span className="px-2 py-1 bg-primary/20 text-primary rounded text-xs">
                      管理员
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-3 bg-dark-200 hover:bg-dark-300 rounded-lg transition-colors"
            >
              {isEditing ? <X className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
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
                  className="w-full bg-dark/50 border border-dark-300 rounded-lg px-4 py-2 text-white focus:outline-none input-glow"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">头像URL</label>
                <input
                  type="text"
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full bg-dark/50 border border-dark-300 rounded-lg px-4 py-2 text-white focus:outline-none input-glow"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 py-2 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center gap-2 btn-glow disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2 bg-dark-200 hover:bg-dark-300 rounded-lg transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${
                tab === id
                  ? 'bg-gradient-to-r from-primary to-accent text-white btn-glow'
                  : 'bg-dark-100 text-slate-400 hover:text-white border border-dark-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
          <button
            onClick={logout}
            className="ml-auto flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-20 text-slate-500">加载中...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <div className="text-center py-20 text-slate-500">
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
