import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Sparkles, Download, Share2, Play, Pause, Trash2, Clock, Globe, Lock, Copy } from 'lucide-react'
import api from '../services/api'
import useAuthStore from '../store/authStore'
import useToastStore from '../store/toastStore'
import ConfirmDialog from '../components/ConfirmDialog'
import { exportSVG, exportVideo, exportGIF, toggleSVGAnimation } from '../utils/exportUtils'

function Create() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, fetchUser } = useAuthStore()
  const { success, error } = useToastStore()
  const svgRef = useRef(null)
  const timerRef = useRef(null)
  
  // 从路由状态获取基础动画（复用功能）
  const baseAnimation = location.state?.baseAnimation || null
  const [prompt, setPrompt] = useState(location.state?.prompt || '')
  const [generating, setGenerating] = useState(false)
  const [animation, setAnimation] = useState(baseAnimation)
  const [history, setHistory] = useState([])
  const [isPlaying, setIsPlaying] = useState(true)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportMessage, setExportMessage] = useState('')
  const [playTime, setPlayTime] = useState(0)
  const [exportDuration, setExportDuration] = useState(5)
  const [showExportOptions, setShowExportOptions] = useState(false)
  const [animationDuration, setAnimationDuration] = useState(10)
  const [isDragging, setIsDragging] = useState(false)
  const [bgColor, setBgColor] = useState('#1e293b')
  const [showContactModal, setShowContactModal] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)

  useEffect(() => {
    fetchHistory()
  }, [])

  // 如果有基础动画，初始化时加载
  useEffect(() => {
    if (baseAnimation) {
      setAnimation(baseAnimation)
      setPlayTime(0)
    }
  }, [baseAnimation])

  // 播放计时器
  useEffect(() => {
    if (isPlaying && animation) {
      timerRef.current = setInterval(() => {
        setPlayTime(prev => prev + 0.1)
      }, 100)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [isPlaying, animation])

  const fetchHistory = async () => {
    try {
      const res = await api.get('/animations/', { params: { per_page: 10 } })
      setHistory(res.data.animations)
    } catch (error) {
      console.error('Failed to fetch history:', error)
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    if (user?.quota <= 0) {
      error('生成次数已用完，请联系管理员')
      return
    }

    setGenerating(true)
    try {
      // 如果有当前动画，自动作为修改基础，但生成的是新作品
      const requestData = { 
        prompt: animation 
          ? `基于以下动画进行修改，生成一个新的动画：\n原动画标题：${animation.title}\n原动画描述：${animation.description}\n\n修改要求：${prompt}` 
          : prompt,
        params: { bgColor: bgColor === 'transparent' ? 'transparent' : bgColor }
      }
      
      const res = await api.post('/animations/generate', requestData)
      // 修改后的动画作为新作品，清除原动画引用
      setAnimation(res.data.animation)
      setPrompt('') // 清空输入
      setPlayTime(0)
      success(animation ? '新动画已生成' : '动画生成成功')
      fetchUser()
      fetchHistory()
    } catch (err) {
      error(err.response?.data?.error || '生成失败')
    } finally {
      setGenerating(false)
    }
  }

  const handlePublish = async () => {
    if (!animation) return
    try {
      await api.post(`/animations/${animation.id}/publish`)
      success('发布成功')
      setAnimation({ ...animation, is_public: true })
    } catch (err) {
      error(err.response?.data?.error || '发布失败')
    }
  }

  const handleExportSVG = () => {
    if (exportSVG(svgRef.current, animation?.title || 'animation')) {
      success('SVG已导出')
    } else {
      error('导出失败')
    }
  }

  const handleExportMP4 = async () => {
    if (!animation?.id) {
      error('请先生成动画')
      return
    }
    setExporting(true)
    setExportProgress(0)
    setExportMessage('')
    setShowExportOptions(false)
    try {
      await exportVideo(animation.id, animation?.title || 'animation', exportDuration, (progress, message) => {
        setExportProgress(progress)
        if (message) setExportMessage(message)
      })
      success('视频已导出')
    } catch (err) {
      error('导出失败: ' + err.message)
    } finally {
      setExporting(false)
      setExportProgress(0)
      setExportMessage('')
    }
  }

  const handleExportGIF = async () => {
    if (!animation?.id) {
      error('请先生成动画')
      return
    }
    setExporting(true)
    setExportProgress(0)
    setExportMessage('')
    setShowExportOptions(false)
    try {
      await exportGIF(animation.id, animation?.title || 'animation', exportDuration, (progress, message) => {
        setExportProgress(progress)
        if (message) setExportMessage(message)
      })
      success('GIF已导出')
    } catch (err) {
      error('导出失败: ' + err.message)
    } finally {
      setExporting(false)
      setExportProgress(0)
      setExportMessage('')
    }
  }

  const handleDeleteHistory = async (id, e) => {
    e.stopPropagation()
    setConfirmDialog({
      title: '删除历史记录',
      message: '确定要删除这条历史记录吗？此操作不可撤销。',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await api.delete(`/animations/${id}`)
          success('已删除')
          fetchHistory()
          if (animation?.id === id) {
            setAnimation(null)
          }
        } catch (err) {
          error(err.response?.data?.error || '删除失败')
        }
        setConfirmDialog(null)
      },
      onCancel: () => setConfirmDialog(null)
    })
  }

  const handleToggleShare = async (item, e) => {
    e.stopPropagation()
    try {
      if (item.is_public) {
        await api.post(`/animations/${item.id}/unpublish`)
        success('已取消分享')
      } else {
        await api.post(`/animations/${item.id}/publish`)
        success('已分享到社区')
      }
      fetchHistory()
      // 如果当前正在查看这个动画，也更新状态
      if (animation?.id === item.id) {
        setAnimation({ ...animation, is_public: !item.is_public })
      }
    } catch (err) {
      error(err.response?.data?.error || '操作失败')
    }
  }

  // 加载历史记录到预览区
  const handleLoadHistory = async (item) => {
    try {
      const res = await api.get(`/animations/${item.id}`)
      setAnimation(res.data)
      setPrompt('') // 清空描述，让用户输入修改意见
      setPlayTime(0)
      setIsPlaying(true)
      success('已加载动画，可以输入修改意见')
    } catch (err) {
      error('加载失败: ' + (err.response?.data?.error || err.message))
    }
  }

  // 复制微信号
  const handleCopyWechat = () => {
    navigator.clipboard.writeText('huang_7830')
    success('微信号已复制')
    setShowContactModal(false)
  }

  const togglePlayPause = () => {
    toggleSVGAnimation(svgRef.current, isPlaying)
    setIsPlaying(!isPlaying)
  }

  const resetTimer = () => {
    setPlayTime(0)
    // 重新播放动画 - 通过重新渲染 SVG 来重置动画
    if (svgRef.current && animation?.svg_content) {
      svgRef.current.innerHTML = animation.svg_content
      setIsPlaying(true)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 10)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`
  }

  // 跳转到指定时间点
  const seekToTime = (targetTime) => {
    if (!svgRef.current || !animation?.svg_content) return
    
    svgRef.current.innerHTML = animation.svg_content
    
    const allElements = svgRef.current.querySelectorAll('*')
    allElements.forEach(el => {
      const style = window.getComputedStyle(el)
      if (style.animationName && style.animationName !== 'none') {
        el.style.animationDelay = `-${targetTime}s`
        el.style.animationPlayState = isPlaying ? 'running' : 'paused'
      }
    })
    
    setPlayTime(targetTime)
  }

  const handleProgressChange = (e) => {
    const newTime = parseFloat(e.target.value)
    seekToTime(newTime)
  }

  const handleProgressMouseDown = () => {
    setIsDragging(true)
    clearInterval(timerRef.current)
  }

  const handleProgressMouseUp = () => {
    setIsDragging(false)
    if (isPlaying && animation) {
      timerRef.current = setInterval(() => {
        setPlayTime(prev => prev + 0.1)
      }, 100)
    }
  }

  return (
    <div className="min-h-screen bg-dark">
      <div className="flex">
        {/* Sidebar - History */}
        <aside className="w-72 border-r border-dark-200 p-4 h-[calc(100vh-64px)] overflow-y-auto">
          <h3 className="text-sm font-medium text-slate-400 mb-4">历史创作</h3>
          <div className="space-y-2">
            {history.map(item => (
              <div
                key={item.id}
                className={`group relative ${animation?.id === item.id ? 'ring-2 ring-accent rounded-lg' : ''}`}
              >
                <button
                  onClick={() => handleLoadHistory(item)}
                  className="w-full text-left p-3 bg-dark-100 rounded-lg hover:bg-dark-200 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate flex-1">{item.title}</p>
                    {item.is_public ? (
                      <Globe className="w-3.5 h-3.5 text-green-400 flex-shrink-0" title="已公开" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" title="私有" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">{item.prompt}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </button>
                <div className="absolute top-2 right-6 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleToggleShare(item, e)}
                    className={`p-1.5 rounded ${item.is_public ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
                    title={item.is_public ? '取消分享' : '分享到社区'}
                  >
                    {item.is_public ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={(e) => handleDeleteHistory(item.id, e)}
                    className="p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                    title="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="grid grid-cols-2 gap-6 h-full">
            {/* Preview */}
            <div className="bg-dark-100 rounded-2xl border border-dark-200 overflow-hidden scan-line">
              <div className="flex items-center justify-between p-4 border-b border-dark-200">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-400 flex items-center gap-2">
                    <span className="w-2 h-2 bg-accent rounded-full breathing"></span>
                    动画预览
                  </span>
                  {/* 播放计时器 */}
                  {animation && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span className="font-mono text-accent">{formatTime(playTime)}</span>
                      <button
                        onClick={resetTimer}
                        className="text-xs text-slate-500 hover:text-white"
                      >
                        重置
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={togglePlayPause}
                    className="p-2 hover:bg-dark-200 rounded-lg transition-colors"
                    title={isPlaying ? '暂停' : '播放'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={handleExportSVG} 
                    className="px-3 py-1.5 bg-dark-200 hover:bg-dark-300 rounded-lg text-sm flex items-center gap-1 border border-dark-300 transition-colors"
                  >
                    <Download className="w-4 h-4" /> SVG
                  </button>
                  
                  {/* 导出选项按钮 */}
                  <div className="relative">
                    <button 
                      onClick={() => setShowExportOptions(!showExportOptions)}
                      disabled={exporting || !animation}
                      className="px-3 py-1.5 bg-gradient-to-r from-primary to-accent rounded-lg text-sm flex items-center gap-1 disabled:opacity-50 transition-colors min-w-[100px]"
                      title={exportMessage}
                    >
                      <Download className="w-4 h-4" /> 
                      {exporting ? <span className="truncate">{exportProgress}%</span> : '导出'}
                    </button>
                    
                    {/* 导出选项下拉菜单 */}
                    {showExportOptions && !exporting && (
                      <div className="absolute right-0 top-full mt-2 bg-dark-200 border border-dark-400 rounded-xl p-4 shadow-xl z-10 min-w-[200px]">
                        <div className="mb-3">
                          <label className="text-xs text-slate-400 block mb-1">导出时长</label>
                          <select
                            value={exportDuration}
                            onChange={(e) => setExportDuration(Number(e.target.value))}
                            className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-sm"
                          >
                            <option value={3}>3 秒</option>
                            <option value={5}>5 秒</option>
                            <option value={10}>10 秒</option>
                            <option value={15}>15 秒</option>
                            <option value={20}>20 秒</option>
                            <option value={30}>30 秒</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <button
                            onClick={handleExportMP4}
                            className="w-full py-2 bg-gradient-to-r from-primary to-accent rounded-lg text-sm flex items-center justify-center gap-2"
                          >
                            <Download className="w-4 h-4" /> 导出 MP4
                          </button>
                          <button
                            onClick={handleExportGIF}
                            className="w-full py-2 bg-dark-300 hover:bg-dark-400 border border-dark-400 rounded-lg text-sm flex items-center justify-center gap-2"
                          >
                            <Download className="w-4 h-4" /> 导出 GIF
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          提示：时长越长，导出越慢
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div 
                ref={svgRef}
                className="aspect-video bg-dark-200 flex items-center justify-center p-4"
                dangerouslySetInnerHTML={{ 
                  __html: animation?.svg_content || '<svg viewBox="0 0 800 600"><text x="400" y="300" text-anchor="middle" fill="#666">预览区域</text></svg>'
                }}
              />
              
              {/* 播放进度条 */}
              {animation && (
                <div className="p-3 border-t border-dark-300 bg-dark-200">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-14 font-mono">{formatTime(playTime)}</span>
                    <input
                      type="range"
                      min="0"
                      max={animationDuration}
                      step="0.1"
                      value={playTime % animationDuration}
                      onChange={handleProgressChange}
                      onMouseDown={handleProgressMouseDown}
                      onMouseUp={handleProgressMouseUp}
                      onTouchStart={handleProgressMouseDown}
                      onTouchEnd={handleProgressMouseUp}
                      className="flex-1 h-2 bg-dark-400 rounded-lg appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full 
                        [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
                      style={{
                        background: `linear-gradient(to right, #22d3ee ${(playTime % animationDuration) / animationDuration * 100}%, #334155 ${(playTime % animationDuration) / animationDuration * 100}%)`
                      }}
                    />
                    <select
                      value={animationDuration}
                      onChange={(e) => setAnimationDuration(Number(e.target.value))}
                      className="bg-dark-300 border border-dark-400 rounded px-2 py-0.5 text-xs w-16"
                      title="动画周期"
                    >
                      <option value={5}>5秒</option>
                      <option value={10}>10秒</option>
                      <option value={15}>15秒</option>
                      <option value={30}>30秒</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Input Panel */}
            <div className="space-y-4">
              <div className="glow-border p-6">
                <h3 className="font-medium mb-4 gradient-text-animate inline-block">
                  {animation ? '动画修改' : '动画描述'}
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                  {animation 
                    ? `当前动画：${animation.title}，输入修改意见后点击生成` 
                    : '描述你想要的动画内容，AI将为你生成教学演示动画'}
                </p>

                {/* 示例提示 - 仅在没有动画时显示 */}
                {!animation && (
                  <div className="mb-4 space-y-2">
                    <p className="text-xs text-slate-500">快速示例：</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        '太阳系行星运动轨道',
                        '细胞分裂过程',
                        '水循环演示',
                        '电路工作原理',
                        'DNA双螺旋结构',
                        '光的折射现象'
                      ].map(example => (
                        <button
                          key={example}
                          onClick={() => setPrompt(example)}
                          className="px-3 py-1.5 bg-dark-200 hover:bg-dark-300 border border-dark-300 hover:border-accent/50 rounded-lg text-xs text-slate-400 hover:text-accent transition-all"
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={animation ? '输入修改意见，例如：把颜色改成红色、加快动画速度...' : '例如：带电粒子在磁场中的运动过程'}
                  className="w-full bg-dark/50 rounded-xl p-4 text-white placeholder-slate-500 resize-none h-32 focus:outline-none input-glow border border-dark-300 transition-all"
                />

                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2 relative">
                    <label className="text-sm text-slate-400">背景颜色</label>
                    <div className="flex gap-1 items-center">
                      {['#1e293b', '#0f172a', '#000000', '#ffffff', 'transparent'].map(color => (
                        <button
                          key={color}
                          onClick={() => setBgColor(color)}
                          className={`w-7 h-7 rounded border-2 ${bgColor === color ? 'border-accent' : 'border-dark-400'}`}
                          style={{ 
                            background: color === 'transparent' 
                              ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                              : color,
                            backgroundSize: color === 'transparent' ? '8px 8px' : 'auto',
                            backgroundPosition: color === 'transparent' ? '0 0, 0 4px, 4px -4px, -4px 0px' : 'auto'
                          }}
                          title={color === 'transparent' ? '透明' : color}
                        />
                      ))}
                      {/* 自定义颜色选择器 */}
                      <div className="relative">
                        <button
                          onClick={() => setShowColorPicker(!showColorPicker)}
                          className={`w-7 h-7 rounded border-2 ${!['#1e293b', '#0f172a', '#000000', '#ffffff', 'transparent'].includes(bgColor) ? 'border-accent' : 'border-dark-400'} overflow-hidden`}
                          style={{ background: !['#1e293b', '#0f172a', '#000000', '#ffffff', 'transparent'].includes(bgColor) ? bgColor : 'linear-gradient(135deg, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)' }}
                          title="自定义颜色"
                        />
                        {showColorPicker && (
                          <div className="absolute top-full left-0 mt-2 p-3 bg-dark-200 border border-dark-400 rounded-lg shadow-xl z-20">
                            <input
                              type="color"
                              value={bgColor === 'transparent' ? '#1e293b' : bgColor}
                              onChange={(e) => setBgColor(e.target.value)}
                              className="w-32 h-32 cursor-pointer rounded"
                            />
                            <div className="mt-2 flex items-center gap-2">
                              <input
                                type="text"
                                value={bgColor}
                                onChange={(e) => setBgColor(e.target.value)}
                                className="flex-1 bg-dark-300 border border-dark-400 rounded px-2 py-1 text-xs font-mono"
                                placeholder="#000000"
                              />
                              <button
                                onClick={() => setShowColorPicker(false)}
                                className="px-2 py-1 bg-accent/20 text-accent rounded text-xs"
                              >
                                确定
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">语言</label>
                    <select className="ml-2 bg-dark-200 rounded px-2 py-1 text-sm border border-dark-300">
                      <option>中文</option>
                      <option>English</option>
                    </select>
                  </div>
                </div>

                {/* 当前动画提示 */}
                {animation && (
                  <div className="mt-4 p-3 bg-accent/10 border border-accent/30 rounded-lg">
                    <p className="text-xs text-accent">
                      💡 系统将基于当前动画「{animation.title}」进行修改，输入你的修改意见即可
                    </p>
                    <button 
                      onClick={() => { setAnimation(null); setPrompt(''); }}
                      className="text-xs text-slate-400 hover:text-white mt-1"
                    >
                      清除当前动画，创建全新动画
                    </button>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handlePublish}
                    disabled={!animation || animation.is_public}
                    className="flex-1 py-3 bg-dark-200 hover:bg-dark-300 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 border border-dark-300"
                  >
                    <Share2 className="w-4 h-4" />
                    {animation?.is_public ? '已分享' : '分享到社区'}
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={generating || !prompt.trim()}
                    className="flex-1 py-3 bg-gradient-to-r from-primary to-accent rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 btn-glow"
                  >
                    <Sparkles className={`w-4 h-4 ${generating ? 'animate-spin' : 'twinkle'}`} />
                    {generating ? '生成中...' : (animation ? '修改动画' : '生成动画')}
                  </button>
                </div>

                <p className="text-center text-sm text-slate-500 mt-4">
                  遇到问题？
                  <button 
                    onClick={() => setShowContactModal(true)} 
                    className="text-accent hover:underline ml-1"
                  >
                    联系作者
                  </button>
                </p>
              </div>

              {/* Animation Info */}
              {animation && (
                <div className="bg-dark-100 rounded-2xl border border-dark-200 p-6">
                  <h3 className="font-medium mb-2">{animation.title}</h3>
                  <p className="text-sm text-slate-400">{animation.description}</p>
                  <div className="flex gap-4 mt-4 text-sm text-slate-500">
                    <span>时长: {animation.duration}</span>
                    <span>分类: {animation.category}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
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

      {/* 联系方式弹窗 */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowContactModal(false)}>
          <div className="bg-dark-100 border border-dark-300 rounded-2xl p-6 max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-medium mb-4">联系作者</h3>
            <p className="text-slate-400 text-sm mb-4">添加作者微信获取帮助</p>
            <div className="flex items-center gap-3 bg-dark-200 rounded-lg p-3">
              <span className="text-accent font-mono text-lg">huang_7830</span>
              <button
                onClick={handleCopyWechat}
                className="ml-auto px-3 py-1.5 bg-accent/20 text-accent rounded-lg text-sm flex items-center gap-1 hover:bg-accent/30"
              >
                <Copy className="w-4 h-4" />
                复制
              </button>
            </div>
            <button
              onClick={() => setShowContactModal(false)}
              className="w-full mt-4 py-2 bg-dark-200 hover:bg-dark-300 rounded-lg text-sm"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Create
