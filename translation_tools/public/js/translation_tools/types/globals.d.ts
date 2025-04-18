/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    frappe: {
      boot?: any;
      // add more properties here if needed
    };
    csrf_token: string;
    __?: (text: string) => string;
  }
}

export {};
