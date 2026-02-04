/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    frappe: {
      boot?: {
        lang: string
        __messages
        translations_hash
        socketio_port?: number | string
      }
      // add more properties here if needed
      __: (text: string) => string
      show_alert
    }
    csrf_token: string
    __?: (text: string) => string
    _version_number
  }
}

export {}
