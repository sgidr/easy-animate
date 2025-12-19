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
  const [animationDuration, setAnimationDuration] = useState(10) // 假设动画总时长10秒
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    fetchAnimation()
  }, [id, isAuthenticated])

  // 播放计时器
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setPlayTime(prev => prev + 0.1)
      }, 100)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [isPlaying])

  const fetchAnimation = async () => {
    setLoading(true)
    try {
      try {
        const res = await api.get(`/community/animations/${id}`)
        setAnimation(res.data)
        return
      } catch (err) {
        if (err.response?.status !== 404) {
          throw err
        }
      }
      
      if (isAuthenticated) {
        const res = await api.get(`/animations/${id}`)
        setAnimation(res.data)
        return
      }
      
      error('动画不存在或无权访问')
      setTimeout(() => navigate(-1), 1500)
    } catch (err) {
      console.error('Failed to fetch animation:', err)
      if (err.response?.status === 404) {
        error('动画不存在')
      } else if (err.response?.status === 403) {
        error('无权访问此动画')
      } else {
        error('加载动画失败: ' + (err.response?.data?.error || err.message))
      }
      setTimeout(() => navigate(-1), 1500)
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    try {
      const res = await api.post(`/community/animations/${id}/like`)
      setLiked(res.data.liked)
      setAnimation(prev => ({ ...prev, likes_count: res.data.likes_count }))
    } catch (error) {
      console.error('Failed to like:', error)
    }
  }

  const handleFavorite = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    try {
      const res = await api.post(`/community/animations/${id}/favorite`)
      setFavorited(res.data.favorited)
      setAnimation(prev => ({ ...prev, favorites_count: res.data.favorites_count }))
    } catch (error) {
      console.error('Failed to favorite:', error)
    }
  }

  const handleFork = () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    // 跳转到创作页，传递动画数据供修改
    navigate('/create', { 
      state: { 
        baseAnimation: animation,
        prompt: animation.prompt 
      } 
    })
    success('已加载到创作页，可以开始修改')
  }

  const handleToggleShare = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    try {
      if (animation.is_public) {
        await api.post(`/animations/${id}/unpublish`)
        setAnimation({ ...animation, is_public: false })
        success('已取消分享')
      } else {
        await api.post(`/animations/${id}/publish`)
        setAnimation({ ...animation, is_public: true })
        success('已分享到社区')
      }
    } catch (err) {
      error(err.response?.data?.error || '操作失败')
    }
  }

  // 判断当前用户是否是作者
  const isOwner = user && animation && animation.user_id === user.id

  const handleExportSVG = () => {
    if (exportSVG(svgRef.current, animation?.title || 'animation')) {
      success('SVG已导出')
    } else {
      error('导出失败')
    }
  }

  const handleExportMP4 = async () => {
    if (!animation?.id) {
      error('动画不存在')
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
      error('动画不存在')
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

  const togglePlayPause = () => {
    if (svgRef.current) {
      const svgs = svgRef.current.querySelectorAll('svg')
      svgs.forEach(svg => {
        svg.style.animationPlayState = isPlaying ? 'paused' : 'running'
        const animatedElements = svg.querySelectorAll('*')
        animatedElements.forEach(el => {
          el.style.animationPlayState = isPlaying ? 'paused' : 'running'
        })
      })
    }
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
    
    // 重新渲染 SVG
    svgRef.current.innerHTML = animation.svg_content
    
    // 设置负的 animation-delay 来跳转到指定时间
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

  // 处理进度条拖动
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
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setPlayTime(prev => prev + 0.1)
      }, 100)
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-gray-500">加载中...</div>
  }

  if (!animation) {
    return <div className="text-center py-20 text-gray-500">动画不存在</div>
  }

  return (
    <div className="py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>

        <div className="grid grid-cols1 lg:grid-cols-3 gap-8">
          {/* Preview */}
          <div className="lg:col-span-2">
            <div className="bg-dark-100 rounded-2xl border border-dark-300 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-dark-300 bg-dark-200">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-400 flex items-center gap-2">
                    <span className="w-2 h-2 bg-accent rounded-full breathing"></span>
                    动画预览
                  </span>
                  {/* 播放计时器 */}
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
                </div>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={togglePlayPause}
                    className="p-2 hover:bg-dark-300 rounded-lg transition-colors"
                    title={isPlaying ? '暂停' : '播放'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={handleExportSVG} 
                    className="px-3 py-1.5 bg-dark-300 hover:bg-dark-400 rounded-lg text-sm flex items-center gap-1 border border-dark-400 transition-colors"
                  >
                    <Download className="w-4 h-4" /> SVG
                  </button>
                  
                  {/* 导出选项按钮 - 仅登录用户可用 */}
                  {isAuthenticated && (
                  <div className="relative">
                    <button 
                      onClick={() => setShowExportOptions(!showExportOptions)}
                      disabled={exporting}
                      className="px-3 py-1.5 bg-gradient-to-r from-primary to-accent rounded-lg text-sm flex items-center gap-1 disabled:opacity-50 transition-colors min-w-[140px]"
                      title={exportMessage}
                    >
                      <Download className="w-4 h-4" /> 
                      {exporting ? (
                        <span className="truncate">{exportProgress}% {exportMessage}</span>
                      ) : '导出视频/GIF'}
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
                  )}
                </div>
              </div>
              <div
                ref={svgRef}
                className="aspect-video bg-dark-200 p-4"
                dangerouslySetInnerHTML={{ __html: animation.svg_content || '' }}
              />
              
              {/* 播放进度条 */}
              <div className="p-4 border-t border-dark-300 bg-dark-200">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-16 font-mono">{formatTime(playTime)}</span>
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
                    className="flex-1 h-2 bg-dark-400 rounded-lg appearance-none cursor-pointer accent-accent
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-accent/30
                      [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full 
                      [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
                    style={{
                      background: `linear-gradient(to right, #22d3ee ${(playTime % animationDuration) / animationDuration * 100}%, #334155 ${(playTime % animationDuration) / animationDuration * 100}%)`
                    }}
                  />
                  <span className="text-xs text-slate-500 w-16 font-mono text-right">{formatTime(animationDuration)}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-500">拖动进度条可跳转到指定时间</span>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500">动画周期:</label>
                    <select
                      value={animationDuration}
                      onChange={(e) => setAnimationDuration(Number(e.target.value))}
                      className="bg-dark-300 border border-dark-400 rounded px-2 py-1 text-xs"
                    >
                      <option value={5}>5秒</option>
                      <option value={10}>10秒</option>
                      <option value={15}>15秒</option>
                      <option value={20}>20秒</option>
                      <option value={30}>30秒</option>
                      <option value={60}>60秒</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="space-y-6 ">
            <div className="bg-dark-100 rounded-2xl border border-dark-300 p-6">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold">{animation.title}</h1>
                {animation.is_public ? (
                  <span className="w-20 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
                    <Globe className="w-3 h-3" /> 已公开
                  </span>
                ) : (
                  <span className="w-20 px-2 py-0.5 bg-slate-500/20 text-slate-400 text-xs rounded-full flex items-center gap-1">
                    <Lock className="w-3 h-3" /> 私有
                  </span>
                )}
              </div>
              <p className="text-gray-400 mb-4">{animation.description}</p>
              
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                <span>作者: {animation.author}</span>
                <span>分类: {animation.category}</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleLike}
                  className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors ${
                    liked ? 'bg-red-500/20 text-red-400' : 'bg-dark-200 hover:bg-dark-300'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
                  {animation.likes_count}
                </button>
                <button
                  onClick={handleFavorite}
                  className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors ${
                    favorited ? 'bg-yellow-500/20 text-yellow-400' : 'bg-dark-200 hover:bg-dark-300'
                  }`}
                >
                  <Star className={`w-5 h-5 ${favorited ? 'fill-current' : ''}`} />
                  {animation.favorites_count}
                </button>
              </div>
            </div>

            <div className="bg-dark-100 rounded-2xl border border-dark-300 p-6">
              <h3 className="font-medium mb-4">操作</h3>
              <div className="space-y-3">
                {isOwner && (
                  <button
                    onClick={handleToggleShare}
                    className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 transition-colors ${
                      animation.is_public 
                        ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    }`}
                  >
                    {animation.is_public ? (
                      <>
                        <Lock className="w-4 h-4" />
                        取消分享
                      </>
                    ) : (
                      <>
                        <Globe className="w-4 h-4" />
                        分享到社区
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={handleFork}
                  className="w-full py-3 bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-accent-hover rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                  <Copy className="w-4 h-4" />
                  复用此动画
                </button>
              </div>
            </div>

            <div className="bg-dark-100 rounded-2xl border border-dark-300 p-6">
              <h3 className="font-medium mb-2">原始描述</h3>
              <p className="text-sm text-gray-400">{animation.prompt}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnimationDetail
