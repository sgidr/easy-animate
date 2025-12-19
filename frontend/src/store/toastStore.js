import { create } from 'zustand'

const useToastStore = create((set) => ({
  toasts: [],

  addToast: (message, type = 'info', duration = 3000) => {
    const id = Date.now()
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }]
    }))
    return id
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id)
    }))
  },

  success: (message, duration = 3000) => {
    return useToastStore.getState().addToast(message, 'success', duration)
  },

  error: (message, duration = 5000) => {
    return useToastStore.getState().addToast(message, 'error', duration)
  },

  warning: (message, duration = 4000) => {
    return useToastStore.getState().addToast(message, 'warning', duration)
  },

  info: (message, duration = 3000) => {
    return useToastStore.getState().addToast(message, 'info', duration)
  }
}))

export default useToastStore
