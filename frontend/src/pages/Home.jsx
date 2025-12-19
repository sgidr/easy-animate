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
      {/* 装饰性星星 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <Star
            key={i}
            className="absolute text-primary/20 twinkle"
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
      <section className="py-20 px-4 relative">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full text-accent text-sm mb-6 border border-accent/30 pulse-glow">
            <Sparkles className="w-4 h-4 twinkle" />
            基于AI智能体
          </div>
          
          <h1 className="text-5xl font-bold mb-6 float-animation">
            Easy Animate
            <br />
            <br />
            <span className="gradient-text-animate">让知识触手可及</span>
          </h1>
          
          <p className="text-slate-400 text-lg mb-8">
            零代码、零门槛！输入知识点，AI 秒速为你打造高质量矢量动画。
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {['适合', '教育工作者', '科普博主', 'B站UP主'].map((tag, i) => (
              <span 
                key={tag} 
                className="px-4 py-2 bg-dark-100 rounded-full text-sm border border-dark-200 hover:border-primary/50 transition-all cursor-default"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Input Section */}
        <div className="max-w-3xl mx-auto">
          <div className="glow-border p-6">
            <div className="flex items-center gap-2 text-slate-400 mb-4">
              <Sparkles className="w-5 h-5 text-accent breathing" />
              <span>描述动画内容，例如："生科系行星运动的动画"</span>
            </div>
            
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="描述你想要的动画内容..."
              className="w-full bg-dark/50 rounded-xl p-4 text-white placeholder-slate-500 resize-none h-24 focus:outline-none input-glow border border-dark-200 transition-all"
            />

            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-3">
                
                <button
                  onClick={handleCreate}
                  className="px-6 py-3 rounded-lg flex items-center gap-2 bg-gradient-to-r from-primary to-accent text-white btn-glow"
                >
                  开始生成
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-dark-100/50 relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <div 
                key={title} 
                className="text-center p-6 card-hover rounded-2xl bg-dark-100/50 border border-dark-200"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center border border-primary/30 pulse-glow">
                  <Icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-medium mb-2">{title}</h3>
                <p className="text-sm text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-accent">✦</span> 精选推荐
              </h2>
              <button
                onClick={() => navigate('/gallery')}
                className="text-gray-400 hover:text-white flex items-center gap-1"
              >
                查看全部 <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
