import { useState, useEffect } from 'react'
import { Users, Film, BarChart3, Trash2, Shield, Plus, Settings, Cpu, Save } from 'lucide-react'
import api from '../services/api'
import useToastStore from '../store/toastStore'
import ConfirmDialog from '../components/ConfirmDialog'

function Admin() {
  const { success, error } = useToastStore()
  const [tab, setTab] = useState('stats')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [animations, setAnimations] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [quotaInput, setQuotaInput] = useState('')
  const [addQuotaInput, setAddQuotaInput] = useState('')
  const [models, setModels] = useState([])
  const [currentModel, setCurrentModel] = useState(null)
  const [modelLoading, setModelLoading] = useState(false)
  const [defaultQuota, setDefaultQuota] = useState(10)
  const [confirmDialog, setConfirmDialog] = useState(null)

  useEffect(() => {
    fetchData()
  }, [tab, page])

  useEffect(() => {
    if (tab === 'settings') {
      fetchModels()
      fetchSettings()
    }
  }, [tab])

  const fetchSettings = async () => {
    try {
      const res = await api.get('/admin/settings')
      if (res.data.default_quota !== undefined) {
        setDefaultQuota(res.data.default_quota)
      }
    } catch (err) {
      console.error('获取设置失败:', err)
    }
  }

  const fetchModels = async () => {
    try {
      const res = await api.get('/admin/models')
      setModels(res.data.models)
      setCurrentModel(res.data.current)
    } catch (err) {
      error('获取模型失败: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleModelChange = async (modelId) => {
    setModelLoading(true)
    try {
      await api.put('/admin/models/current', { model_id: modelId })
      await fetchModels()
      success('模型已更新')
    } catch (err) {
      error('更新失败: ' + (err.response?.data?.error || err.message))
    } finally {
      setModelLoading(false)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      if (tab === 'stats') {
        const res = await api.get('/admin/stats')
        setStats(res.data)
      } else if (tab === 'settings') {
        setLoading(false)
        return
      } else if (tab === 'users') {
        const res = await api.get('/admin/users', { 
          params: { page, per_page: 15, search } 
        })
        setUsers(res.data.users)
        setTotalPages(res.data.pages)
      } else if (tab === 'animations') {
        const res = await api.get('/admin/animations', { 
          params: { page, per_page: 15, search } 
        })
        setAnimations(res.data.animations)
        setTotalPages(res.data.pages)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    fetchData()
  }

  const updateQuota = async (userId, newQuota) => {
    try {
      await api.put(`/admin/users/${userId}/quota`, { quota: parseInt(newQuota) })
      fetchData()
      setSelectedUser(null)
      setQuotaInput('')
      success('配额已更新')
    } catch (err) {
      error('更新失败: ' + (err.response?.data?.error || err.message))
    }
  }

  const addQuota = async (userId, amount) => {
    try {
      await api.post(`/admin/users/${userId}/quota/add`, { amount: parseInt(amount) })
      fetchData()
      setSelectedUser(null)
      setAddQuotaInput('')
      success('配额已增加')
    } catch (err) {
      error('增加失败: ' + (err.response?.data?.error || err.message))
    }
  }

  const toggleAdmin = async (userId) => {
    setConfirmDialog({
      title: '切换管理员状态',
      message: '确定要切换此用户的管理员状态吗？',
      onConfirm: async () => {
        try {
          await api.put(`/admin/users/${userId}/admin`)
          fetchData()
          success('用户权限已更新')
        } catch (err) {
          error('操作失败: ' + (err.response?.data?.error || err.message))
        }
        setConfirmDialog(null)
      },
      onCancel: () => setConfirmDialog(null)
    })
  }

  const deleteUser = async (userId) => {
    setConfirmDialog({
      title: '删除用户',
      message: '确定要删除此用户及其所有数据吗？此操作不可撤销！',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await api.delete(`/admin/users/${userId}`)
          fetchData()
          success('用户已删除')
        } catch (err) {
          error('删除失败: ' + (err.response?.data?.error || err.message))
        }
        setConfirmDialog(null)
      },
      onCancel: () => setConfirmDialog(null)
    })
  }

  const deleteAnimation = async (animationId) => {
    setConfirmDialog({
      title: '删除动画',
      message: '确定要删除此动画吗？',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await api.delete(`/admin/animations/${animationId}`)
          fetchData()
          success('动画已删除')
        } catch (err) {
          error('删除失败: ' + (err.response?.data?.error || err.message))
        }
        setConfirmDialog(null)
      },
      onCancel: () => setConfirmDialog(null)
    })
  }

  const handleSaveDefaultQuota = async () => {
    try {
      await api.put('/admin/settings', { default_quota: parseInt(defaultQuota) })
      success('默认配额已保存')
    } catch (err) {
      error('保存失败: ' + (err.response?.data?.error || err.message))
    }
  }

  const tabs = [
    { id: 'stats', label: '统计', icon: BarChart3 },
    { id: 'users', label: '用户', icon: Users },
    { id: 'animations', label: '内容', icon: Film },
    { id: 'settings', label: '设置', icon: Settings }
  ]

  // Mobile card component for users
  const UserCard = ({ user }) => (
    <div className="glow-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{user.username}</div>
          <div className="text-sm text-slate-400 truncate">{user.email}</div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${user.is_admin ? 'bg-primary/20 text-primary' : 'bg-dark-300 text-slate-400'}`}>
          {user.is_admin ? '管理员' : '用户'}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-slate-400">配额: <span className="text-accent">{user.quota}</span></span>
        <span className="text-slate-400">动画: <span className="text-white">{user.animations_count}</span></span>
      </div>
      <div className="flex gap-2 pt-2 border-t border-dark-300">
        <button
          onClick={() => setSelectedUser(user.id)}
          className="flex-1 px-3 py-2 bg-dark-300 hover:bg-dark-400 rounded-lg text-xs transition-colors"
        >
          编辑配额
        </button>
        <button
          onClick={() => toggleAdmin(user.id)}
          className="px-3 py-2 bg-dark-300 hover:bg-dark-400 rounded-lg text-xs transition-colors"
        >
          <Shield className="w-4 h-4" />
        </button>
        <button
          onClick={() => deleteUser(user.id)}
          className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-xs text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  // Mobile card component for animations
  const AnimationCard = ({ animation }) => (
    <div className="glow-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{animation.title}</div>
          <div className="text-sm text-slate-400">作者: {animation.author}</div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${animation.is_public ? 'bg-green-500/20 text-green-400' : 'bg-dark-300 text-slate-400'}`}>
          {animation.is_public ? '公开' : '私密'}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-slate-400">分类: <span className="text-white">{animation.category}</span></span>
        <span className="text-slate-400">点赞: <span className="text-accent">{animation.likes_count}</span></span>
      </div>
      <div className="pt-2 border-t border-dark-300">
        <button
          onClick={() => deleteAnimation(animation.id)}
          className="w-full px-3 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-xs text-red-400 transition-colors flex items-center justify-center gap-1"
        >
          <Trash2 className="w-4 h-4" />
          删除动画
        </button>
      </div>
    </div>
  )

  return (
    <div className="py-6 md:py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 gradient-text-animate inline-block">管理后台</h1>

        {/* Tabs - scrollable on mobile */}
        <div className="flex gap-2 md:gap-4 mb-6 md:mb-8 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setPage(1) }}
              className={`flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-xl transition-all whitespace-nowrap shrink-0 text-sm md:text-base ${
                tab === id
                  ? 'bg-gradient-to-r from-primary to-accent text-white btn-glow'
                  : 'bg-dark-100 text-slate-400 hover:text-white border border-dark-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">加载中...</div>
        ) : (
          <>
            {/* Stats */}
            {tab === 'stats' && stats && (
              <div className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                  <div className="glow-border p-4 md:p-6 card-hover">
                    <div className="text-2xl md:text-3xl font-bold gradient-text-animate">{stats.total_users}</div>
                    <div className="text-slate-400 mt-1 md:mt-2 text-xs md:text-sm">总用户数</div>
                  </div>
                  <div className="glow-border p-4 md:p-6 card-hover">
                    <div className="text-2xl md:text-3xl font-bold gradient-text-animate">{stats.total_animations}</div>
                    <div className="text-slate-400 mt-1 md:mt-2 text-xs md:text-sm">总动画数</div>
                  </div>
                  <div className="glow-border p-4 md:p-6 card-hover">
                    <div className="text-2xl md:text-3xl font-bold gradient-text-animate">{stats.public_animations}</div>
                    <div className="text-slate-400 mt-1 md:mt-2 text-xs md:text-sm">公开动画</div>
                  </div>
                  <div className="glow-border p-4 md:p-6 card-hover">
                    <div className="text-2xl md:text-3xl font-bold gradient-text-animate">{stats.avg_quota.toFixed(1)}</div>
                    <div className="text-slate-400 mt-1 md:mt-2 text-xs md:text-sm">平均配额</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
                  <div className="glow-border p-4 md:p-6">
                    <div className="text-xl md:text-2xl font-bold text-accent">{stats.new_users_7d}</div>
                    <div className="text-slate-400 mt-1 md:mt-2 text-xs md:text-sm">7天新增用户</div>
                  </div>
                  <div className="glow-border p-4 md:p-6">
                    <div className="text-xl md:text-2xl font-bold text-accent">{stats.new_animations_7d}</div>
                    <div className="text-slate-400 mt-1 md:mt-2 text-xs md:text-sm">7天新增动画</div>
                  </div>
                  <div className="glow-border p-4 md:p-6">
                    <div className="text-xl md:text-2xl font-bold text-accent">{stats.total_likes + stats.total_favorites}</div>
                    <div className="text-slate-400 mt-1 md:mt-2 text-xs md:text-sm">总互动数</div>
                  </div>
                </div>
              </div>
            )}

            {/* Users */}
            {tab === 'users' && (
              <div className="space-y-4">
                <form onSubmit={handleSearch} className="glow-border p-3 md:p-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="搜索用户名或邮箱..."
                      className="flex-1 bg-transparent rounded-lg px-3 md:px-4 py-2 text-white placeholder-slate-500 focus:outline-none text-sm md:text-base"
                    />
                    <button
                      type="submit"
                      className="px-4 md:px-6 py-2 bg-gradient-to-r from-primary to-accent rounded-lg text-sm btn-glow"
                    >
                      搜索
                    </button>
                  </div>
                </form>

                {/* Desktop table */}
                <div className="hidden md:block glow-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-dark-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">用户名</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">邮箱</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">配额</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">动画数</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">角色</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-200">
                        {users.map(user => (
                          <tr key={user.id} className="hover:bg-dark-200/50 transition-colors">
                            <td className="px-6 py-4 text-sm">{user.username}</td>
                            <td className="px-6 py-4 text-sm text-slate-400">{user.email}</td>
                            <td className="px-6 py-4 text-sm">
                              <span className="px-3 py-1 bg-dark-300 rounded-full text-accent">
                                {user.quota}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm">{user.animations_count}</td>
                            <td className="px-6 py-4 text-sm">
                              <span className={user.is_admin ? 'text-primary' : 'text-slate-500'}>
                                {user.is_admin ? '管理员' : '用户'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setSelectedUser(user.id)}
                                  className="px-3 py-1 bg-dark-300 hover:bg-dark-400 rounded text-xs transition-colors"
                                >
                                  编辑
                                </button>
                                <button
                                  onClick={() => toggleAdmin(user.id)}
                                  className="px-3 py-1 bg-dark-300 hover:bg-dark-400 rounded text-xs flex items-center gap-1 transition-colors"
                                >
                                  <Shield className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => deleteUser(user.id)}
                                  className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-xs text-red-400 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {users.map(user => (
                    <UserCard key={user.id} user={user} />
                  ))}
                </div>

                {/* User Edit Modal */}
                {selectedUser && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="glow-border p-4 md:p-6 max-w-md w-full">
                      <h3 className="text-lg font-bold mb-4">编辑用户配额</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">设置配额</label>
                          <input
                            type="number"
                            value={quotaInput}
                            onChange={(e) => setQuotaInput(e.target.value)}
                            placeholder="输入新配额"
                            className="w-full bg-dark/50 border border-dark-300 rounded-lg px-4 py-2 text-white focus:outline-none input-glow"
                          />
                          <button
                            onClick={() => updateQuota(selectedUser, quotaInput)}
                            className="w-full mt-2 py-2 bg-gradient-to-r from-primary to-accent rounded-lg text-sm btn-glow"
                          >
                            更新配额
                          </button>
                        </div>

                        <div>
                          <label className="block text-sm text-slate-400 mb-2">增加配额</label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={addQuotaInput}
                              onChange={(e) => setAddQuotaInput(e.target.value)}
                              placeholder="输入增加数量"
                              className="flex-1 bg-dark/50 border border-dark-300 rounded-lg px-4 py-2 text-white focus:outline-none input-glow"
                            />
                            <button
                              onClick={() => addQuota(selectedUser, addQuotaInput)}
                              className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg text-sm transition-colors flex items-center gap-1"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedUser(null)}
                        className="w-full mt-6 py-2 bg-dark-200 hover:bg-dark-300 rounded-lg text-sm transition-colors"
                      >
                        关闭
                      </button>
                    </div>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-6">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 md:px-4 py-2 bg-dark-100 rounded-lg disabled:opacity-50 text-sm"
                    >
                      上一页
                    </button>
                    <span className="px-3 md:px-4 py-2 text-sm">{page} / {totalPages}</span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 md:px-4 py-2 bg-dark-100 rounded-lg disabled:opacity-50 text-sm"
                    >
                      下一页
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Animations */}
            {tab === 'animations' && (
              <div className="space-y-4">
                <form onSubmit={handleSearch} className="glow-border p-3 md:p-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="搜索动画标题或描述..."
                      className="flex-1 bg-transparent rounded-lg px-3 md:px-4 py-2 text-white placeholder-slate-500 focus:outline-none text-sm md:text-base"
                    />
                    <button
                      type="submit"
                      className="px-4 md:px-6 py-2 bg-gradient-to-r from-primary to-accent rounded-lg text-sm btn-glow"
                    >
                      搜索
                    </button>
                  </div>
                </form>

                {/* Desktop table */}
                <div className="hidden md:block glow-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-dark-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">标题</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">作者</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">分类</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">点赞</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">公开</th>
                          <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-200">
                        {animations.map(animation => (
                          <tr key={animation.id} className="hover:bg-dark-200/50 transition-colors">
                            <td className="px-6 py-4 text-sm truncate max-w-[200px]">{animation.title}</td>
                            <td className="px-6 py-4 text-sm text-slate-400">{animation.author}</td>
                            <td className="px-6 py-4 text-sm text-slate-400">{animation.category}</td>
                            <td className="px-6 py-4 text-sm text-accent">{animation.likes_count}</td>
                            <td className="px-6 py-4 text-sm">
                              <span className={animation.is_public ? 'text-green-400' : 'text-slate-500'}>
                                {animation.is_public ? '是' : '否'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <button
                                onClick={() => deleteAnimation(animation.id)}
                                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-xs text-red-400 transition-colors flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                删除
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {animations.map(animation => (
                    <AnimationCard key={animation.id} animation={animation} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-6">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 md:px-4 py-2 bg-dark-100 rounded-lg disabled:opacity-50 text-sm"
                    >
                      上一页
                    </button>
                    <span className="px-3 md:px-4 py-2 text-sm">{page} / {totalPages}</span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 md:px-4 py-2 bg-dark-100 rounded-lg disabled:opacity-50 text-sm"
                    >
                      下一页
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Settings */}
            {tab === 'settings' && (
              <div className="space-y-4 md:space-y-6">
                {/* AI模型配置 */}
                <div className="glow-border p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-medium mb-3 md:mb-4 flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-accent" />
                    AI 模型配置
                  </h3>
                  <p className="text-xs md:text-sm text-slate-400 mb-4">
                    选择系统使用的AI模型，不同模型有不同的生成效果和速度
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {models.map(model => (
                      <div
                        key={model.id}
                        onClick={() => !modelLoading && handleModelChange(model.id)}
                        className={`p-3 md:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          currentModel?.id === model.id
                            ? 'border-accent bg-accent/10'
                            : 'border-dark-300 hover:border-primary/50 bg-dark-200'
                        } ${modelLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm md:text-base">{model.name}</span>
                          {currentModel?.id === model.id && (
                            <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full">
                              当前
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">{model.id}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          提供商: {model.provider === 'claude' ? 'Anthropic' : 'Google'}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  {modelLoading && (
                    <p className="text-sm text-accent mt-4">正在切换模型...</p>
                  )}
                </div>

                {/* 其他设置 */}
                <div className="glow-border p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-medium mb-3 md:mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    其他设置
                  </h3>
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 md:p-4 bg-dark-200 rounded-lg">
                      <div>
                        <p className="font-medium text-sm md:text-base">新用户默认配额</p>
                        <p className="text-xs md:text-sm text-slate-400">新注册用户的初始生成次数</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={defaultQuota}
                          onChange={(e) => setDefaultQuota(e.target.value)}
                          className="w-20 bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-center text-sm"
                        />
                        <button
                          onClick={handleSaveDefaultQuota}
                          className="px-4 py-2 bg-gradient-to-r from-primary to-accent rounded-lg text-sm flex items-center gap-1 btn-glow"
                        >
                          <Save className="w-4 h-4" />
                          <span className="hidden sm:inline">保存</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
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

export default Admin
