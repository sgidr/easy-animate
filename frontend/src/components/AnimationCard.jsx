import { Link } from 'react-router-dom'
import { Heart, Star } from 'lucide-react'

function AnimationCard({ animation, showAuthor = true }) {
  // 处理SVG内容，确保它能正确显示
  const renderSVGPreview = () => {
    if (!animation.svg_content) return null
    
    // 确保SVG有正确的尺寸属性
    let svgContent = animation.svg_content
    
    // 如果SVG没有width/height属性，添加100%
    if (!svgContent.includes('width=') && svgContent.includes('<svg')) {
      svgContent = svgContent.replace('<svg', '<svg width="100%" height="100%"')
    }
    
    return (
      <div 
        className="w-full h-full flex items-center justify-center svg-preview-container"
        style={{ 
          overflow: 'hidden',
          background: '#1e293b'
        }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    )
  }

  return (
    <Link
      to={`/animation/${animation.id}`}
      className="group block bg-dark-100 rounded-xl overflow-hidden border border-dark-200 hover:border-primary/50 card-hover scan-line"
    >
      <div className="aspect-video bg-dark-200 relative overflow-hidden">
        {animation.thumbnail ? (
          <img
            src={animation.thumbnail}
            alt={animation.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : animation.svg_content ? (
          renderSVGPreview()
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600">
            <svg className="w-16 h-16 group-hover:text-primary transition-colors" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:stroke-accent transition-colors" />
              <path d="M40 35 L65 50 L40 65 Z" fill="currentColor" className="group-hover:fill-primary transition-colors" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-dark via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      <div className="p-4">
        <h3 className="font-medium text-white truncate group-hover:text-accent transition-colors">
          {animation.title}
        </h3>
        
        {showAuthor && (
          <p className="text-sm text-gray-500 mt-1">{animation.author}</p>
        )}

        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            {animation.likes_count || 0}
          </span>
          <span className="flex items-center gap-1">
            <Star className="w-4 h-4" />
            {animation.favorites_count || 0}
          </span>
        </div>
      </div>
    </Link>
  )
}

export default AnimationCard
