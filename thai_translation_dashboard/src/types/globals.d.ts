/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    frappe: {
      boot?: unknown
      // add more properties here if needed
      __: (text: string) => string
      show_alert
    }
    csrf_token: string
    __?: (text: string) => string
  }
}

export {}
