import { AlertCircle, Check, X } from 'lucide-react'

function ConfirmDialog({ title, message, onConfirm, onCancel, confirmText = '确认', cancelText = '取消', isDangerous = false }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="glow-border p-6 max-w-md w-full mx-4 bg-dark-100 rounded-2xl">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${isDangerous ? 'bg-red-500/20' : 'bg-accent/20'}`}>
            <AlertCircle className={`w-6 h-6 ${isDangerous ? 'text-red-400' : 'text-accent'}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="text-sm text-slate-400 mt-2">{message}</p>
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-dark-200 hover:bg-dark-300 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              isDangerous
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                : 'bg-gradient-to-r from-primary to-accent text-white btn-glow'
            }`}
          >
            <Check className="w-4 h-4" />
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
