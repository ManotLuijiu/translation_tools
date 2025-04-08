export function getUserDefault(key: string) {
  return window.frappe?.boot?.defaults?.[key];
}
