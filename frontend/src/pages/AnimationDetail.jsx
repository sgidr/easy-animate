import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Heart, Star, Copy, Download, ArrowLeft, Play, Pause, Clock, Globe, Lock } from 'lucide-react'
import api from '../services/api'
import useAuthStore from '../store/authStore'
import useToastStore from '../store/toastStore'
import { exportSVG, exportVideo, exportGIF } from '../utils/exportUtils'

function AnimationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const { success, error } = useToastStore()
  const svgRef = useRef(null)
  const timerRef = useRef(null)
  const [animation, setAnimation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [favorited, setFavorited] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportMessage, setExportMessage] = useState('')
  const [playTime, setPlayTime] = useState(0)
  const [exportDuration, setExportDuration] = useState(5)
  const [showExportOptions, setShowExportOptions] = useState(false)
  const [animationDuration, setAnimationDuration] = useState(10)
  const [exportBgColor, setExportBgColor] = useState('#1e293b')
  const [showExportColorPicker, setShowExportColorPicker] = useState(false)

  useEffect(() => { fetchAnimation() }, [id, isAuthenticated])
  useEffect(() => {
    if (isPlaying) { timerRef.current = setInterval(() => setPlayTime(prev => prev + 0.1), 100) }
    else { clearInterval(timerRef.current) }
    return () => clearInterval(timerRef.current)
  }, [isPlaying])

  const fetchAnimation = async () => {
    setLoading(true)
    try {
      try { const res = await api.get(`/community/animations/${id}`); setAnimation(res.data); return }
      catch (err) { if (err.response?.status !== 404) throw err }
      if (isAuthenticated) { const res = await api.get(`/animations/${id}`); setAnimation(res.data); return }
      error('动画不存在或无权访问'); setTimeout(() => navigate(-1), 1500)
    } catch (err) {
      if (err.response?.status === 404) error('动画不存在')
      else if (err.response?.status === 403) error('无权访问此动画')
      else error('加载失败')
      setTimeout(() => navigate(-1), 1500)
    } finally { setLoading(false) }
  }

  const handleLike = async () => {
    if (!isAuthenticated) { navigate('/login'); return }
    try { const res = await api.post(`/community/animations/${id}/like`); setLiked(res.data.liked); setAnimation(prev => ({ ...prev, likes_count: res.data.likes_count })) }
    catch (e) { console.error(e) }
  }

  const handleFavorite = async () => {
    if (!isAuthenticated) { navigate('/login'); return }
    try { const res = await api.post(`/community/animations/${id}/favorite`); setFavorited(res.data.favorited); setAnimation(prev => ({ ...prev, favorites_count: res.data.favorites_count })) }
    catch (e) { console.error(e) }
  }

  const handleFork = () => {
    if (!isAuthenticated) { navigate('/login'); return }
    navigate('/create', { state: { baseAnimation: animation, prompt: animation.prompt } })
    success('已加载到创作页')
  }

  const handleToggleShare = async () => {
    if (!isAuthenticated) { navigate('/login'); return }
    try {
      if (animation.is_public) { await api.post(`/animations/${id}/unpublish`); setAnimation({ ...animation, is_public: false }); success('已取消分享') }
      else { await api.post(`/animations/${id}/publish`); setAnimation({ ...animation, is_public: true }); success('已分享到社区') }
    } catch (err) { error(err.response?.data?.error || '操作失败') }
  }

  const isOwner = user && animation && animation.user_id === user.id
  const handleExportSVG = () => { if (exportSVG(svgRef.current, animation?.title || 'animation', exportBgColor)) success('SVG已导出'); else error('导出失败') }

  const handleExportMP4 = async () => {
    if (!animation?.id) { error('动画不存在'); return }
    setExporting(true); setExportProgress(0); setExportMessage(''); setShowExportOptions(false)
    try { await exportVideo(animation.id, animation?.title || 'animation', exportDuration, (p, m) => { setExportProgress(p); if (m) setExportMessage(m) }, exportBgColor); success('视频已导出') }
    catch (err) { error('导出失败: ' + err.message) }
    finally { setExporting(false); setExportProgress(0); setExportMessage('') }
  }

  const handleExportGIF = async () => {
    if (!animation?.id) { error('动画不存在'); return }
    setExporting(true); setExportProgress(0); setExportMessage(''); setShowExportOptions(false)
    try { await exportGIF(animation.id, animation?.title || 'animation', exportDuration, (p, m) => { setExportProgress(p); if (m) setExportMessage(m) }, exportBgColor); success('GIF已导出') }
    catch (err) { error('导出失败: ' + err.message) }
    finally { setExporting(false); setExportProgress(0); setExportMessage('') }
  }

  const togglePlayPause = () => {
    if (svgRef.current) {
      svgRef.current.querySelectorAll('svg, svg *').forEach(el => { el.style.animationPlayState = isPlaying ? 'paused' : 'running' })
    }
    setIsPlaying(!isPlaying)
  }

  const resetTimer = () => { setPlayTime(0); if (svgRef.current && animation?.svg_content) { svgRef.current.innerHTML = animation.svg_content; setIsPlaying(true) } }
  const formatTime = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}.${Math.floor((s%1)*10)}`

  const seekToTime = (t) => {
    if (!svgRef.current || !animation?.svg_content) return
    svgRef.current.innerHTML = animation.svg_content
    svgRef.current.querySelectorAll('*').forEach(el => {
      const style = window.getComputedStyle(el)
      if (style.animationName && style.animationName !== 'none') { el.style.animationDelay = `-${t}s`; el.style.animationPlayState = isPlaying ? 'running' : 'paused' }
    })
    setPlayTime(t)
  }
  const handleProgressChange = (e) => seekToTime(parseFloat(e.target.value))

  if (loading) return <div className="text-center py-20 text-gray-500">加载中...</div>
  if (!animation) return <div className="text-center py-20 text-gray-500">动画不存在</div>

  return (
    <div className="py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-7xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 sm:mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" />返回
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Preview */}
          <div className="lg:col-span-2">
            <div className="bg-dark-100 rounded-xl lg:rounded-2xl border border-dark-300 overflow-hidden">
              <div className="flex items-center justify-between p-3 sm:p-4 border-b border-dark-300 bg-dark-200 gap-2">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                  <span className="text-xs sm:text-sm text-slate-400 flex items-center gap-1 sm:gap-2">
                    <span className="w-2 h-2 bg-accent rounded-full"></span>
                    <span className="hidden sm:inline">动画预览</span>
                  </span>
                  <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-slate-500" />
                    <span className="font-mono text-accent">{formatTime(playTime)}</span>
                    <button onClick={resetTimer} className="text-xs text-slate-500 hover:text-white hidden sm:inline">重置</button>
                  </div>
                </div>
                <div className="flex gap-1 sm:gap-2 items-center">
                  <button onClick={togglePlayPause} className="p-1.5 sm:p-2 hover:bg-dark-300 rounded-lg">
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  {isAuthenticated && (
                    <div className="relative">
                      <button onClick={() => setShowExportOptions(!showExportOptions)} disabled={exporting}
                        className="px-2 sm:px-3 py-1.5 bg-gradient-to-r from-primary to-accent rounded-lg text-xs sm:text-sm flex items-center gap-1 disabled:opacity-50">
                        <Download className="w-4 h-4" /><span className="hidden sm:inline">{exporting ? `${exportProgress}%` : '导出'}</span><span className="sm:hidden">{exporting ? `${exportProgress}%` : ''}</span>
                      </button>
                      {showExportOptions && !exporting && (
                        <div className="absolute right-0 top-full mt-2 bg-dark-200 border border-dark-400 rounded-xl p-3 sm:p-4 shadow-xl z-10 w-56 sm:min-w-[240px]">
                          <div className="mb-3">
                            <label className="text-xs text-slate-400 block mb-1">导出时长</label>
                            <select value={exportDuration} onChange={(e) => setExportDuration(Number(e.target.value))} className="w-full bg-dark-300 border border-dark-400 rounded-lg px-3 py-2 text-sm">
                              <option value={3}>3秒</option><option value={5}>5秒</option><option value={10}>10秒</option><option value={15}>15秒</option><option value={30}>30秒</option>
                            </select>
                          </div>
                          <div className="mb-3">
                            <label className="text-xs text-slate-400 block mb-1">背景颜色</label>
                            <div className="flex gap-1 items-center flex-wrap">
                              {['#1e293b', '#0f172a', '#000000', '#ffffff', 'transparent'].map(c => (
                                <button key={c} onClick={() => setExportBgColor(c)} className={`w-6 h-6 rounded border-2 ${exportBgColor === c ? 'border-accent' : 'border-dark-400'}`}
                                  style={{ background: c === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : c, backgroundSize: c === 'transparent' ? '8px 8px' : 'auto' }} />
                              ))}
                              <div className="relative">
                                <button onClick={() => setShowExportColorPicker(!showExportColorPicker)} className={`w-6 h-6 rounded border-2 ${!['#1e293b', '#0f172a', '#000000', '#ffffff', 'transparent'].includes(exportBgColor) ? 'border-accent' : 'border-dark-400'}`}
                                  style={{ background: !['#1e293b', '#0f172a', '#000000', '#ffffff', 'transparent'].includes(exportBgColor) ? exportBgColor : 'linear-gradient(135deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }} />
                                {showExportColorPicker && (
                                  <div className="absolute top-full right-0 mt-2 p-2 bg-dark-300 border border-dark-400 rounded-lg shadow-xl z-20">
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
                  )}
                </div>
              </div>
              <div className="relative">
                <div ref={svgRef} className="aspect-video bg-dark-200 p-2 sm:p-4" dangerouslySetInnerHTML={{ __html: animation.svg_content || '' }} />
                {exporting && (
                  <div className="absolute inset-0 bg-dark/80 flex flex-col items-center justify-center gap-3">
                    <div className="w-3/4 max-w-xs bg-dark-400 rounded-full h-3 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300" style={{ width: `${exportProgress}%` }} />
                    </div>
                    <div className="text-sm text-white">{exportMessage || '导出中...'} {exportProgress}%</div>
                  </div>
                )}
              </div>
              <div className="p-2 sm:p-4 border-t border-dark-300 bg-dark-200">
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-xs text-slate-500 w-12 sm:w-16 font-mono">{formatTime(playTime)}</span>
                  <input type="range" min="0" max={animationDuration} step="0.1" value={playTime % animationDuration} onChange={handleProgressChange}
                    className="flex-1 h-2 bg-dark-400 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
                    style={{ background: `linear-gradient(to right, #22d3ee ${(playTime % animationDuration) / animationDuration * 100}%, #334155 ${(playTime % animationDuration) / animationDuration * 100}%)` }} />
                  <select value={animationDuration} onChange={(e) => setAnimationDuration(Number(e.target.value))} className="bg-dark-300 border border-dark-400 rounded px-1 sm:px-2 py-0.5 text-xs w-14 sm:w-16">
                    <option value={5}>5秒</option><option value={10}>10秒</option><option value={15}>15秒</option><option value={30}>30秒</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-dark-100 rounded-xl lg:rounded-2xl border border-dark-300 p-4 sm:p-6">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">{animation.title}</h1>
                {animation.is_public ? (
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1"><Globe className="w-3 h-3" />公开</span>
                ) : (
                  <span className="px-2 py-0.5 bg-slate-500/20 text-slate-400 text-xs rounded-full flex items-center gap-1"><Lock className="w-3 h-3" />私有</span>
                )}
              </div>
              <p className="text-gray-400 mb-3 sm:mb-4 text-sm">{animation.description}</p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
                <span>作者: {animation.author}</span>
                <span>分类: {animation.category}</span>
              </div>
              <div className="flex gap-2 sm:gap-3">
                <button onClick={handleLike} className={`flex-1 py-2.5 sm:py-3 rounded-xl flex items-center justify-center gap-1 sm:gap-2 text-sm ${liked ? 'bg-red-500/20 text-red-400' : 'bg-dark-200 hover:bg-dark-300'}`}>
                  <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${liked ? 'fill-current' : ''}`} />{animation.likes_count}
                </button>
                <button onClick={handleFavorite} className={`flex-1 py-2.5 sm:py-3 rounded-xl flex items-center justify-center gap-1 sm:gap-2 text-sm ${favorited ? 'bg-yellow-500/20 text-yellow-400' : 'bg-dark-200 hover:bg-dark-300'}`}>
                  <Star className={`w-4 h-4 sm:w-5 sm:h-5 ${favorited ? 'fill-current' : ''}`} />{animation.favorites_count}
                </button>
              </div>
            </div>

            <div className="bg-dark-100 rounded-xl lg:rounded-2xl border border-dark-300 p-4 sm:p-6">
              <h3 className="font-medium mb-3 sm:mb-4 text-sm sm:text-base">操作</h3>
              <div className="space-y-2 sm:space-y-3">
                {isOwner && (
                  <button onClick={handleToggleShare} className={`w-full py-2.5 sm:py-3 rounded-xl flex items-center justify-center gap-2 text-sm ${animation.is_public ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}>
                    {animation.is_public ? <><Lock className="w-4 h-4" />取消分享</> : <><Globe className="w-4 h-4" />分享到社区</>}
                  </button>
                )}
                <button onClick={handleFork} className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-primary to-accent rounded-xl flex items-center justify-center gap-2 text-sm btn-glow">
                  <Copy className="w-4 h-4" />复用此动画
                </button>
              </div>
            </div>

            <div className="bg-dark-100 rounded-xl lg:rounded-2xl border border-dark-300 p-4 sm:p-6">
              <h3 className="font-medium mb-2 text-sm sm:text-base">原始描述</h3>
              <p className="text-xs sm:text-sm text-gray-400">{animation.prompt}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnimationDetail
