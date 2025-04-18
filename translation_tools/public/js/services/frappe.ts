// services/frappe.ts
type FrappeCall<T = any> = (params: {
  method: string;
  args?: Record<string, any>;
  callback?: (response: any) => void;
  async?: boolean;
  error?: (err: any) => void;
  freeze?: boolean;
  no_spinner?: boolean;
  no_cache?: boolean;
  no_message?: boolean;
  no_alert?: boolean;
  no_loading?: boolean;
  no_loading_message?: boolean;
  no_loading_message_text?: string;
  no_loading_message_title?: string;
  no_loading_message_icon?: string;
  no_loading_message_timeout?: number;
  no_loading_message_callback?: (response: any) => void;
  no_loading_message_error?: (err: any) => void;
}) => Promise<T>;

export const frappeCall: FrappeCall = async (params) => {
  const response = await frappe.call(params);
  return response.message;
};

// Usage:
//   const data = await frappeCall<YourType>({ method: 'your.method' });
