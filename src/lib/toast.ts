// Simple toast utility
// In production, you may want to install sonner or react-hot-toast

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastOptions {
  duration?: number
}

function createToast(message: string, type: ToastType, options?: ToastOptions) {
  // For now, use browser's native alert for critical errors
  // You can enhance this with a proper toast UI later
  if (typeof window !== 'undefined') {
    // Create a toast notification element
    const toast = document.createElement('div')
    toast.className = `fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white transition-all duration-300 transform translate-y-0 opacity-100 ${
      type === 'success' ? 'bg-green-600' :
      type === 'error' ? 'bg-red-600' :
      type === 'warning' ? 'bg-amber-600' :
      'bg-blue-600'
    }`
    toast.textContent = message
    toast.style.maxWidth = '400px'

    document.body.appendChild(toast)

    // Auto remove after duration
    setTimeout(() => {
      toast.style.opacity = '0'
      toast.style.transform = 'translateY(10px)'
      setTimeout(() => {
        document.body.removeChild(toast)
      }, 300)
    }, options?.duration || 3000)
  }
}

export const toast = {
  success: (message: string, options?: ToastOptions) => createToast(message, 'success', options),
  error: (message: string, options?: ToastOptions) => createToast(message, 'error', options),
  info: (message: string, options?: ToastOptions) => createToast(message, 'info', options),
  warning: (message: string, options?: ToastOptions) => createToast(message, 'warning', options),
}
