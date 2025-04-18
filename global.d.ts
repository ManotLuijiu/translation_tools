// global.d.ts
type FrappeCallParams = {
  method: string;
  args?: Record<string, any>;
  async?: boolean;
  callback?: (response: any) => void;
};

type FrappeCallResponse<T = any> = {
  message: T;
  exc?: string;
  _server_messages?: any[];
};

declare const frappe: {
  session: {
    user: string;
    // Add other session properties you might use
  };
  call: <T = any>(params: FrappeCallParams) => Promise<FrappeCallResponse<T>>;
  // Add other Frappe methods you use
};
