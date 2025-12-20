import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import api from '../services/api'
import AnimationCard from '../components/AnimationCard'

function Gallery() {
  const [animations, setAnimations] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('全部')
  const [categories, setCategories] = useState(['全部'])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchAnimations()
  }, [category, page])

  const fetchAnimations = async () => {
    setLoading(true)
    try {
      const params = { page, per_page: 12 }
      if (category !== '全部') {
        params.category = category
      }
      if (search) {
        params.search = search
      }
      const res = await api.get('/community/animations', { params })
      setAnimations(res.data.animations)
      setTotalPages(res.data.pages)
      if (res.data.categories) {
        setCategories(res.data.categories)
      }
    } catch (error) {
      console.error('Failed to fetch animations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    fetchAnimations()
  }

  return (
    <div className="py-8 sm:py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 gradient-text-animate inline-block">SVG动画案例库</h1>
          <p className="text-slate-400 text-sm sm:text-base">浏览精选的SVG动画案例</p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-6 sm:mb-8">
          <div className="relative glow-border p-1">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索动画案例..."
              className="w-full bg-transparent rounded-xl pl-10 sm:pl-12 pr-20 sm:pr-24 py-2.5 sm:py-3 text-white placeholder-slate-500 focus:outline-none text-sm sm:text-base"
            />
            <button
              type="submit"
              className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 px-3 sm:px-4 py-1 sm:py-1.5 bg-gradient-to-r from-primary to-accent rounded-lg text-xs sm:text-sm btn-glow"
            >
              搜索
            </button>
          </div>
        </form>

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 px-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => { setCategory(cat); setPage(1) }}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm transition-colors ${
                category === cat
                  ? 'bg-primary text-white'
                  : 'bg-dark-100 text-gray-400 hover:text-white border border-dark-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-16 sm:py-20 text-gray-500">加载中...</div>
        ) : animations.length === 0 ? (
          <div className="text-center py-16 sm:py-20 text-gray-500">暂无动画</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {animations.map(animation => (
                <AnimationCard key={animation.id} animation={animation} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8 sm:mt-12">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 sm:px-4 py-2 bg-dark-100 rounded-lg disabled:opacity-50 text-sm"
                >
                  上一页
                </button>
                <span className="px-3 sm:px-4 py-2 text-sm">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 sm:px-4 py-2 bg-dark-100 rounded-lg disabled:opacity-50 text-sm"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Gallery
