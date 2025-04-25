import { useState } from 'react'

type StatusType = 'info' | 'success' | 'error'

type StatusMessage = {
  type: StatusType
  message: string
} | null

export function useStatusMessage() {
  const [statusMessage, setStatusMessage] = useState<StatusMessage>(null)
  const [showStatus, setShowStatus] = useState(false)

  const showMessage = (message: string, type: StatusType, duration = 3000) => {
    setStatusMessage({ type, message })
    setShowStatus(true)

    setTimeout(() => setShowStatus(false), duration - 300)
    setTimeout(() => setStatusMessage(null), duration)
  }

  const clearMessage = () => {
    setShowStatus(false)
    setStatusMessage(null)
  }

  return { statusMessage, showStatus, showMessage, clearMessage }
}
