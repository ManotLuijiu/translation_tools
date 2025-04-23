import { useFrappeAuth, useFrappeGetCall } from 'frappe-react-sdk'

const useGetFrappeAuth = () => {
  const { currentUser, isValidating, isLoading, error } = useFrappeAuth()
  return { currentUser, isLoading, isValidating, error }
}

export default useGetFrappeAuth

export const useGetFrappeUser = (currentUser: string) => {
  const { data, error, isLoading, isValidating, mutate } = useFrappeGetCall(
    'frappe.client.get',
    {
      doctype: 'User',
      filters: { email: currentUser },
    },
  )
  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  }
}
