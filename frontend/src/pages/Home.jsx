import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Zap, Monitor, Users, ArrowRight, Star } from 'lucide-react'
import api from '../services/api'
import AnimationCard from '../components/AnimationCard'
import useAuthStore from '../store/authStore'

function Home() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const [prompt, setPrompt] = useState('')
  const [featured, setFeatured] = useState([])

  useEffect(() => {
    api.get('/community/featured').then(res => {
      setFeatured(res.data.animations)
    }).catch(() => {})
  }, [])

  const handleCreate = () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    navigate('/create', { state: { prompt } })
  }

  const features = [
    { icon: Sparkles, title: '智能生成', desc: '输入描述，AI自动生成动画' },
    { icon: Zap, title: '快速高效', desc: '秒级生成，即时预览' },
    { icon: Monitor, title: '视频导出', desc: '支持MP4多分辨率导出' },
    { icon: Users, title: '社区分享', desc: '分享作品，复用他人创意' }
  ]

  return (
    <div className="particles-bg">
      {/* 装饰性星星 - 移动端减少数量 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <Star
            key={i}
            className="absolute text-primary/20 twinkle hidden sm:block"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 10 + 5}px`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Hero Section */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 relative">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full text-accent text-xs sm:text-sm mb-4 sm:mb-6 border border-accent/30 pulse-glow">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 twinkle" />
            基于AI智能体
          </div>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 float-animation">
            EASY ANIMATE
            <br />
            <span className="gradient-text-animate mt-2 block">让动画触手可及</span>
          </h1>
          
          <p className="text-slate-400 text-sm sm:text-base lg:text-lg mb-6 sm:mb-8 px-4">
            零代码、零门槛！输入知识点，AI 秒速为你打造高质量矢量动画。
          </p>

          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 px-2">
            {['适合', '教育工作者', '科普博主', 'B站UP主'].map((tag, i) => (
              <span 
                key={tag} 
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-dark-100 rounded-full text-xs sm:text-sm border border-dark-200 hover:border-primary/50 transition-all cursor-default"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Input Section */}
        <div className="max-w-3xl mx-auto px-2 sm:px-0">
          <div className="glow-border p-4 sm:p-6">
            <div className="flex items-center gap-2 text-slate-400 mb-3 sm:mb-4">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-accent breathing flex-shrink-0" />
              <span className="text-xs sm:text-sm">描述动画内容，例如："太阳系行星运动的动画"</span>
            </div>
            
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="描述你想要的动画内容..."
              className="w-full bg-dark/50 rounded-xl p-3 sm:p-4 text-white placeholder-slate-500 resize-none h-20 sm:h-24 focus:outline-none input-glow border border-dark-200 transition-all text-sm sm:text-base"
            />

            <div className="flex items-center justify-end mt-3 sm:mt-4">
              <button
                onClick={handleCreate}
                className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg flex items-center gap-2 bg-gradient-to-r from-primary to-accent text-white btn-glow text-sm sm:text-base"
              >
                开始生成
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 sm:py-16 px-4 bg-dark-100/50 relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <div 
                key={title} 
                className="text-center p-4 sm:p-6 card-hover rounded-xl sm:rounded-2xl bg-dark-100/50 border border-dark-200"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg sm:rounded-xl flex items-center justify-center border border-primary/30 pulse-glow">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                </div>
                <h3 className="font-medium mb-1 sm:mb-2 text-sm sm:text-base">{title}</h3>
                <p className="text-xs sm:text-sm text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="py-12 sm:py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <span className="text-accent">✦</span> 精选推荐
              </h2>
              <button
                onClick={() => navigate('/gallery')}
                className="text-gray-400 hover:text-white flex items-center gap-1 text-sm"
              >
                查看全部 <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {featured.slice(0, 3).map(animation => (
                <AnimationCard key={animation.id} animation={animation} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default Home
