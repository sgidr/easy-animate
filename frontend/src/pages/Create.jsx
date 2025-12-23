import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Sparkles, Download, Share2, Play, Pause, Trash2, Clock, Globe, Lock, Copy, Menu, X } from 'lucide-react'
import api from '../services/api'
import useAuthStore from '../store/authStore'
import useToastStore from '../store/toastStore'
import ConfirmDialog from '../components/ConfirmDialog'
import { exportSVG, exportVideo, exportGIF, toggleSVGAnimation } from '../utils/exportUtils'

function Create() {
  const location = useLocation()
  const { user, fetchUser } = useAuthStore()
  const { success, error } = useToastStore()
  const svgRef = useRef(null)
  const timerRef = useRef(null)
  
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
  const [bgColor, setBgColor] = useState('#1e293b')
  const [showContactModal, setShowContactModal] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [exportBgColor, setExportBgColor] = useState('#1e293b')
  const [showExportColorPicker, setShowExportColorPicker] = useState(false)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)

  useEffect(() => { fetchHistory() }, [])
  useEffect(() => { if (baseAnimation) { setAnimation(baseAnimation); setPlayTime(0) } }, [baseAnimation])
  useEffect(() => {
    if (isPlaying && animation) {
      timerRef.current = setInterval(() => setPlayTime(prev => prev + 0.1), 100)
    } else { clearInterval(timerRef.current) }
    return () => clearInterval(timerRef.current)
  }, [isPlaying, animation])

  const fetchHistory = async () => {
    try { const res = await api.get('/animations/', { params: { per_page: 10 } }); setHistory(res.data.animations) }
    catch (e) { console.error('Failed to fetch history:', e) }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    if (user?.quota <= 0) { error('生成次数已用完，请联系管理员'); return }
    setGenerating(true)
    try {
      const requestData = { 
        prompt: animation ? `基于以下动画进行修改，生成一个新的动画：\n原动画标题：${animation.title}\n原动画描述：${animation.description}\n\n修改要求：${prompt}` : prompt,
        params: { bgColor: bgColor === 'transparent' ? 'transparent' : bgColor }
      }
      const res = await api.post('/animations/generate', requestData)
      setAnimation(res.data.animation); setPrompt(''); setPlayTime(0)
      success(animation ? '新动画已生成' : '动画生成成功')
      fetchUser(); fetchHistory()
    } catch (err) { error(err.response?.data?.error || '生成失败') }
    finally { setGenerating(false) }
  }

  const handlePublish = async () => {
    if (!animation) return
    try { await api.post(`/animations/${animation.id}/publish`); success('发布成功'); setAnimation({ ...animation, is_public: true }) }
    catch (err) { error(err.response?.data?.error || '发布失败') }
  }

  const handleExportSVG = () => {
    if (exportSVG(svgRef.current, animation?.title || 'animation', exportBgColor)) { success('SVG已导出') }
    else { error('导出失败') }
  }

  const handleExportMP4 = async () => {
    if (!animation?.id) { error('请先生成动画'); return }
    setExporting(true); setExportProgress(0); setExportMessage(''); setShowExportOptions(false)
    try {
      await exportVideo(animation.id, animation?.title || 'animation', exportDuration, (progress, message) => {
        setExportProgress(progress); if (message) setExportMessage(message)
      }, exportBgColor)
      success('视频已导出')
    } catch (err) { error('导出失败: ' + err.message) }
    finally { setExporting(false); setExportProgress(0); setExportMessage('') }
  }

  const handleExportGIF = async () => {
    if (!animation?.id) { error('请先生成动画'); return }
    setExporting(true); setExportProgress(0); setExportMessage(''); setShowExportOptions(false)
    try {
      await exportGIF(animation.id, animation?.title || 'animation', exportDuration, (progress, message) => {
        setExportProgress(progress); if (message) setExportMessage(message)
      }, exportBgColor)
      success('GIF已导出')
    } catch (err) { error('导出失败: ' + err.message) }
    finally { setExporting(false); setExportProgress(0); setExportMessage('') }
  }

  const handleDeleteHistory = async (id, e) => {
    e.stopPropagation()
    setConfirmDialog({
      title: '删除历史记录', message: '确定要删除这条历史记录吗？此操作不可撤销。', isDangerous: true,
      onConfirm: async () => {
        try { await api.delete(`/animations/${id}`); success('已删除'); fetchHistory(); if (animation?.id === id) setAnimation(null) }
        catch (err) { error(err.response?.data?.error || '删除失败') }
        setConfirmDialog(null)
      },
      onCancel: () => setConfirmDialog(null)
    })
  }

  const handleToggleShare = async (item, e) => {
    e.stopPropagation()
    try {
      if (item.is_public) { await api.post(`/animations/${item.id}/unpublish`); success('已取消分享') }
      else { await api.post(`/animations/${item.id}/publish`); success('已分享到社区') }
      fetchHistory()
      if (animation?.id === item.id) setAnimation({ ...animation, is_public: !item.is_public })
    } catch (err) { error(err.response?.data?.error || '操作失败') }
  }

  const handleLoadHistory = async (item) => {
    try {
      const res = await api.get(`/animations/${item.id}`)
      setAnimation(res.data); setPrompt(''); setPlayTime(0); setIsPlaying(true)
      success('已加载动画'); setShowMobileSidebar(false)
    } catch (err) { error('加载失败: ' + (err.response?.data?.error || err.message)) }
  }

  const handleCopyWechat = () => { navigator.clipboard.writeText('huang_7830'); success('微信号已复制'); setShowContactModal(false) }
  const togglePlayPause = () => { toggleSVGAnimation(svgRef.current, isPlaying); setIsPlaying(!isPlaying) }
  const resetTimer = () => { setPlayTime(0); if (svgRef.current && animation?.svg_content) { svgRef.current.innerHTML = animation.svg_content; setIsPlaying(true) } }
  const formatTime = (seconds) => { const mins = Math.floor(seconds / 60); const secs = Math.floor(seconds % 60); const ms = Math.floor((seconds % 1) * 10); return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}` }

  const seekToTime = (targetTime) => {
    if (!svgRef.current || !animation?.svg_content) return
    svgRef.current.innerHTML = animation.svg_content
    svgRef.current.querySelectorAll('*').forEach(el => {
      const style = window.getComputedStyle(el)
      if (style.animationName && style.animationName !== 'none') { el.style.animationDelay = `-${targetTime}s`; el.style.animationPlayState = isPlaying ? 'running' : 'paused' }
    })
    setPlayTime(targetTime)
  }
  const handleProgressChange = (e) => seekToTime(parseFloat(e.target.value))

  // Sidebar content renderer
  const renderHistoryItems = () => (
    <>
      {history.map(item => (
        <div key={item.id} className={`bg-dark-100 rounded-lg overflow-hidden ${animation?.id === item.id ? 'ring-2 ring-accent' : ''}`}>
          <button onClick={() => handleLoadHistory(item)} className="w-full text-left p-3 hover:bg-dark-200 transition-colors">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate flex-1">{item.title}</p>
            </div>
            <p className="text-xs text-gray-500 mt-1 truncate">{item.prompt}</p>
            <p className="text-xs text-gray-600 mt-1">{new Date(item.created_at).toLocaleDateString()}</p>
          </button>
          <div className="flex gap-1 px-3 pb-3 border-t border-dark-300 pt-2">
            <button onClick={(e) => handleToggleShare(item, e)} className={`flex-1 py-1.5 rounded text-xs flex items-center justify-center gap-1 ${item.is_public ? 'bg-green-500/20 text-green-400' : 'bg-dark-300 text-slate-400 hover:text-white'}`}>
              {item.is_public ? <><Globe className="w-3 h-3" />已分享</> : <><Lock className="w-3 h-3" />分享</>}
            </button>
            <button onClick={(e) => handleDeleteHistory(item.id, e)} className="px-3 py-1.5 bg-dark-300 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded text-xs flex items-center gap-1 transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
      {history.length === 0 && <p className="text-sm text-slate-500 text-center py-4">暂无历史记录</p>}
    </>
  )

  return (
    <div className="min-h-screen bg-dark">
      <div className="flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-64 xl:w-72 border-r border-dark-200 p-4 h-[calc(100vh-64px)] overflow-y-auto flex-shrink-0">
          <h3 className="text-sm font-medium text-slate-400 mb-4">历史创作</h3>
          <div className="space-y-2">
            {renderHistoryItems()}
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden">
          {/* 顶部操作栏 */}
          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="flex items-center gap-2">
              <button onClick={() => setShowMobileSidebar(true)} className="lg:hidden p-2 bg-dark-100 rounded-lg"><Menu className="w-5 h-5" /></button>
              <h2 className="text-base sm:text-lg font-medium gradient-text-animate">作品创作</h2>
            </div>
            <button onClick={() => { setAnimation(null); setPrompt(''); setPlayTime(0) }} className="px-3 sm:px-4 py-2 bg-gradient-to-r from-primary to-accent rounded-lg text-xs sm:text-sm flex items-center gap-1 sm:gap-2 btn-glow">
              <Sparkles className="w-4 h-4" /><span className="hidden sm:inline">创建新作品</span><span className="sm:hidden">新建</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Preview */}
            <div className="bg-dark-100 rounded-xl lg:rounded-2xl border border-dark-200 overflow-hidden">
              <div className="flex items-center justify-between p-3 sm:p-4 border-b border-dark-200 gap-2">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                  <span className="text-xs sm:text-sm text-slate-400 flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <span className="w-2 h-2 bg-accent rounded-full breathing"></span>
                    <span className="hidden sm:inline">动画预览</span><span className="sm:hidden">预览</span>
                  </span>
                  {animation && (
                    <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-slate-500" />
                      <span className="font-mono text-accent">{formatTime(playTime)}</span>
                      <button onClick={resetTimer} className="text-xs text-slate-500 hover:text-white hidden sm:inline">重置</button>
                    </div>
                  )}
                </div>
                <div className="flex gap-1 sm:gap-2 items-center flex-shrink-0">
                  <button onClick={togglePlayPause} className="p-1.5 sm:p-2 hover:bg-dark-200 rounded-lg">
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <div className="relative">
                    <button onClick={() => setShowExportOptions(!showExportOptions)} disabled={exporting || !animation}
                      className="px-2 sm:px-3 py-1.5 bg-gradient-to-r from-primary to-accent rounded-lg text-xs sm:text-sm flex items-center gap-1 disabled:opacity-50">
                      <Download className="w-4 h-4" /><span className="hidden sm:inline">{exporting ? `${exportProgress}%` : '导出'}</span><span className="sm:hidden">{exporting ? `${exportProgress}%` : ''}</span>
                    </button>
                    {showExportOptions && !exporting && (
                      <div className="absolute right-0 top-full mt-2 bg-dark-200 border border-dark-400 rounded-xl p-3 sm:p-4 shadow-xl z-10 w-56 sm:min-w-[240px]">
                        <div className="mb-3">
                          <label className="text-xs text-slate-400 block mb-1">导出时长</label>
                          <select value={exportDuration} onChange={(e) => setExportDuration(Number(e.target.value))} className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-sm">
                            <option value={3}>3 秒</option><option value={5}>5 秒</option><option value={10}>10 秒</option><option value={15}>15 秒</option><option value={30}>30 秒</option>
                          </select>
                        </div>
                        <div className="mb-3">
                          <label className="text-xs text-slate-400 block mb-1">背景颜色</label>
                          <div className="flex gap-1 items-center flex-wrap">
                            {['#1e293b', '#0f172a', '#000000', '#ffffff', 'transparent'].map(color => (
                              <button key={color} onClick={() => setExportBgColor(color)} className={`w-6 h-6 sm:w-7 sm:h-7 rounded border-2 ${exportBgColor === color ? 'border-accent' : 'border-dark-400'}`}
                                style={{ background: color === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : color, backgroundSize: color === 'transparent' ? '8px 8px' : 'auto' }} />
                            ))}
                            <div className="relative">
                              <button onClick={() => setShowExportColorPicker(!showExportColorPicker)} className={`w-6 h-6 sm:w-7 sm:h-7 rounded border-2 ${!['#1e293b', '#0f172a', '#000000', '#ffffff', 'transparent'].includes(exportBgColor) ? 'border-accent' : 'border-dark-400'}`}
                                style={{ background: !['#1e293b', '#0f172a', '#000000', '#ffffff', 'transparent'].includes(exportBgColor) ? exportBgColor : 'linear-gradient(135deg, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)' }} />
                              {showExportColorPicker && (
                                <div className="absolute top-full left-0 mt-2 p-2 bg-dark-300 border border-dark-400 rounded-lg shadow-xl z-20">
                                  <input type="color" value={exportBgColor === 'transparent' ? '#1e293b' : exportBgColor} onChange={(e) => setExportBgColor(e.target.value)} className="w-20 h-20 cursor-pointer rounded" />
                                  <button onClick={() => setShowExportColorPicker(false)} className="w-full mt-2 px-2 py-1 bg-accent/20 text-accent rounded text-xs">确定</button>
                                </div>
                              )}
                            </div>
                          </div>
                          {exportBgColor === 'transparent' && <p className="text-xs text-slate-500 mt-1">透明仅支持GIF/SVG</p>}
                        </div>
                        <div className="space-y-2">
                          <button onClick={handleExportSVG} className="w-full py-2 bg-dark-300 hover:bg-dark-400 border border-dark-400 rounded-lg text-xs sm:text-sm flex items-center justify-center gap-2"><Download className="w-4 h-4" />SVG</button>
                          <button onClick={handleExportGIF} className="w-full py-2 bg-dark-300 hover:bg-dark-400 border border-dark-400 rounded-lg text-xs sm:text-sm flex items-center justify-center gap-2"><Download className="w-4 h-4" />GIF</button>
                          <button onClick={handleExportMP4} disabled={exportBgColor === 'transparent'} className={`w-full py-2 rounded-lg text-xs sm:text-sm flex items-center justify-center gap-2 ${exportBgColor === 'transparent' ? 'bg-dark-400 text-slate-500' : 'bg-gradient-to-r from-primary to-accent'}`}><Download className="w-4 h-4" />MP4</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="relative">
                <div ref={svgRef} className="aspect-video bg-dark-200 flex items-center justify-center p-2 sm:p-4" dangerouslySetInnerHTML={{ __html: animation?.svg_content || '<svg viewBox="0 0 800 600"><text x="400" y="300" text-anchor="middle" fill="#666">预览区域</text></svg>' }} />
                {exporting && (
                  <div className="absolute inset-0 bg-dark/80 flex flex-col items-center justify-center gap-3">
                    <div className="w-3/4 max-w-xs bg-dark-400 rounded-full h-3 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300" style={{ width: `${exportProgress}%` }} />
                    </div>
                    <div className="text-sm text-white">{exportMessage || '导出中...'} {exportProgress}%</div>
                  </div>
                )}
              </div>
              {animation && (
                <div className="p-2 sm:p-3 border-t border-dark-300 bg-dark-200">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-xs text-slate-500 w-12 sm:w-14 font-mono">{formatTime(playTime)}</span>
                    <input type="range" min="0" max={animationDuration} step="0.1" value={playTime % animationDuration} onChange={handleProgressChange}
                      className="flex-1 h-2 bg-dark-400 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
                      style={{ background: `linear-gradient(to right, #22d3ee ${(playTime % animationDuration) / animationDuration * 100}%, #334155 ${(playTime % animationDuration) / animationDuration * 100}%)` }} />
                    <select value={animationDuration} onChange={(e) => setAnimationDuration(Number(e.target.value))} className="bg-dark-300 border border-dark-400 rounded px-1 sm:px-2 py-0.5 text-xs w-14 sm:w-16">
                      <option value={5}>5秒</option><option value={10}>10秒</option><option value={15}>15秒</option><option value={30}>30秒</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Input Panel */}
            <div className="space-y-4">
              <div className="glow-border p-4 sm:p-6">
                <h3 className="font-medium mb-3 sm:mb-4 gradient-text-animate inline-block text-sm sm:text-base">{animation ? '动画修改' : '动画描述'}</h3>
                <p className="text-xs sm:text-sm text-slate-500 mb-3 sm:mb-4">{animation ? `当前：${animation.title}，输入修改意见` : '描述动画内容，AI将为你生成'}</p>
                {!animation && (
                  <div className="mb-3 sm:mb-4">
                    <p className="text-xs text-slate-500 mb-2">快速示例：</p>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {['太阳系行星运动', '细胞分裂过程', '水循环演示', '电路工作原理'].map(example => (
                        <button key={example} onClick={() => setPrompt(example)} className="px-2 sm:px-3 py-1 sm:py-1.5 bg-dark-200 hover:bg-dark-300 border border-dark-300 rounded-lg text-xs text-slate-400 hover:text-accent">{example}</button>
                      ))}
                    </div>
                  </div>
                )}
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={animation ? '输入修改意见...' : '例如：带电粒子在磁场中的运动过程'}
                  className="w-full bg-dark/50 rounded-xl p-3 sm:p-4 text-white placeholder-slate-500 resize-none h-24 sm:h-32 focus:outline-none input-glow border border-dark-300 text-sm sm:text-base" />
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 sm:mt-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs sm:text-sm text-slate-400">背景</label>
                    <div className="flex gap-1">
                      {['#1e293b', '#0f172a', '#000000', '#ffffff', 'transparent'].map(color => (
                        <button key={color} onClick={() => setBgColor(color)} className={`w-5 h-5 sm:w-6 sm:h-6 rounded border-2 ${bgColor === color ? 'border-accent' : 'border-dark-400'}`}
                          style={{ background: color === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : color, backgroundSize: color === 'transparent' ? '6px 6px' : 'auto' }} />
                      ))}
                      <div className="relative">
                        <button onClick={() => setShowColorPicker(!showColorPicker)} className={`w-5 h-5 sm:w-6 sm:h-6 rounded border-2 ${!['#1e293b', '#0f172a', '#000000', '#ffffff', 'transparent'].includes(bgColor) ? 'border-accent' : 'border-dark-400'}`}
                          style={{ background: !['#1e293b', '#0f172a', '#000000', '#ffffff', 'transparent'].includes(bgColor) ? bgColor : 'linear-gradient(135deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }} />
                        {showColorPicker && (
                          <div className="absolute top-full left-0 mt-2 p-2 bg-dark-200 border border-dark-400 rounded-lg shadow-xl z-20">
                            <input type="color" value={bgColor === 'transparent' ? '#1e293b' : bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-24 h-24 cursor-pointer rounded" />
                            <button onClick={() => setShowColorPicker(false)} className="w-full mt-2 px-2 py-1 bg-accent/20 text-accent rounded text-xs">确定</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {animation && (
                  <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-accent/10 border border-accent/30 rounded-lg">
                    <p className="text-xs text-accent">💡 基于「{animation.title}」修改</p>
                    <button onClick={() => { setAnimation(null); setPrompt('') }} className="text-xs text-slate-400 hover:text-white mt-1">清除，创建新动画</button>
                  </div>
                )}
                <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
                  <button onClick={handlePublish} disabled={!animation || animation.is_public}
                    className="flex-1 py-2.5 sm:py-3 bg-dark-200 hover:bg-dark-300 rounded-xl flex items-center justify-center gap-1 sm:gap-2 disabled:opacity-50 border border-dark-300 text-xs sm:text-sm">
                    <Share2 className="w-4 h-4" /><span className="hidden sm:inline">{animation?.is_public ? '已分享' : '分享到社区'}</span><span className="sm:hidden">{animation?.is_public ? '已分享' : '分享'}</span>
                  </button>
                  <button onClick={handleGenerate} disabled={generating || !prompt.trim()}
                    className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-primary to-accent rounded-xl flex items-center justify-center gap-1 sm:gap-2 disabled:opacity-50 btn-glow text-xs sm:text-sm">
                    <Sparkles className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />{generating ? '生成中...' : (animation ? '修改' : '生成')}
                  </button>
                </div>
                <p className="text-center text-xs sm:text-sm text-slate-500 mt-3 sm:mt-4">
                  遇到问题？<button onClick={() => setShowContactModal(true)} className="text-accent hover:underline ml-1">联系作者</button>
                </p>
              </div>
              {animation && (
                <div className="bg-dark-100 rounded-xl lg:rounded-2xl border border-dark-200 p-4 sm:p-6">
                  <h3 className="font-medium mb-2 text-sm sm:text-base">{animation.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-400">{animation.description}</p>
                  <div className="flex gap-3 sm:gap-4 mt-3 sm:mt-4 text-xs sm:text-sm text-slate-500">
                    <span>时长: {animation.duration}</span><span>分类: {animation.category}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <div className="fixed inset-0 bg-black/50 z-50 lg:hidden" onClick={() => setShowMobileSidebar(false)}>
          <div className="w-72 h-full bg-dark-100 p-4 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-400">历史创作</h3>
              <button onClick={() => setShowMobileSidebar(false)} className="p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2">
              {renderHistoryItems()}
            </div>
          </div>
        </div>
      )}

      {confirmDialog && <ConfirmDialog title={confirmDialog.title} message={confirmDialog.message} isDangerous={confirmDialog.isDangerous} onConfirm={confirmDialog.onConfirm} onCancel={confirmDialog.onCancel} />}

      {showContactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowContactModal(false)}>
          <div className="bg-dark-100 border border-dark-300 rounded-2xl p-4 sm:p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4">联系作者</h3>
            <p className="text-slate-400 text-xs sm:text-sm mb-3 sm:mb-4">添加作者微信获取帮助</p>
            <div className="flex items-center gap-3 bg-dark-200 rounded-lg p-3">
              <span className="text-accent font-mono text-base sm:text-lg">huang_7830</span>
              <button onClick={handleCopyWechat} className="ml-auto px-3 py-1.5 bg-accent/20 text-accent rounded-lg text-xs sm:text-sm flex items-center gap-1"><Copy className="w-4 h-4" />复制</button>
            </div>
            <button onClick={() => setShowContactModal(false)} className="w-full mt-4 py-2 bg-dark-200 hover:bg-dark-300 rounded-lg text-sm">关闭</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Create
