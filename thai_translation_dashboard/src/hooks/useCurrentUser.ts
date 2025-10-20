import { useFrappeAuth, useFrappeGetCall } from 'frappe-react-sdk';
import { useMemo } from 'react';

interface UserInfo {
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  username?: string;
  user_image?: string;
  language?: string;
  mobile_no?: string;
}

interface UseCurrentUserReturn {
  user: {
    name: string;
    email: string;
    avatar?: string;
    initials: string;
    fullName: string;
    isGuest: boolean;
  } | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  logout: () => void;
}

export const useCurrentUser = (): UseCurrentUserReturn => {
  // Get authentication status
  const { currentUser, isLoading: authLoading, logout } = useFrappeAuth();

  // Only fetch user details if we have a valid logged-in user
  const shouldFetchUserDetails =
    !!currentUser && currentUser !== 'Guest' && currentUser !== '';

  // Fetch specific user fields using frappe.client.get_value
  // This is safer than loading the entire document
  const { data: userData, isLoading: userLoading } = useFrappeGetCall<{
    message: UserInfo;
  }>(
    'frappe.client.get_value',
    shouldFetchUserDetails
      ? {
          doctype: 'User',
          name: currentUser, // ✅ Fixed: Use 'name' instead of 'filters'
          fieldname: ['email', 'first_name', 'last_name', 'full_name', 'username', 'user_image'],
        }
      : undefined, // Pass undefined to skip the API call
    undefined,
    {
      isOnline: () => shouldFetchUserDetails,
    }
  );

  const isLoading = authLoading || userLoading;
  const isLoggedIn = !!currentUser && currentUser !== 'Guest';

  const user = useMemo(() => {
    if (!currentUser || currentUser === 'Guest' || currentUser === '') {
      return null;
    }

    // Extract user info from the response
    const userInfo = userData?.message;

    // Generate initials from name
    const getInitials = (
      firstName?: string,
      lastName?: string,
      fullName?: string,
      email?: string
    ): string => {
      // Try first name + last name
      if (firstName && lastName) {
        return `${firstName[0]}${lastName[0]}`.toUpperCase();
      }

      // Try full name
      if (fullName && fullName.trim() && fullName !== 'Guest') {
        const names = fullName.trim().split(' ');
        if (names.length >= 2) {
          return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        if (names[0]?.length >= 2) {
          return names[0].substring(0, 2).toUpperCase();
        }
        return names[0][0].toUpperCase();
      }

      // Try first name only
      if (firstName && firstName.length >= 2) {
        return firstName.substring(0, 2).toUpperCase();
      }

      // Fallback to email
      if (email?.includes('@')) {
        return email.substring(0, 2).toUpperCase();
      }

      // Final fallback
      return 'U';
    };

    // Build display name from available fields
    let displayName = currentUser;
    if (userInfo?.first_name && userInfo?.last_name) {
      displayName = `${userInfo.first_name} ${userInfo.last_name}`;
    } else if (userInfo?.full_name) {
      displayName = userInfo.full_name;
    } else if (userInfo?.username) {
      displayName = userInfo.username;
    } else if (userInfo?.first_name) {
      displayName = userInfo.first_name;
    }

    const email = userInfo?.email || currentUser;
    const initials = getInitials(
      userInfo?.first_name,
      userInfo?.last_name,
      userInfo?.full_name || displayName,
      email
    );

    return {
      name: displayName,
      email: email,
      avatar: userInfo?.user_image,
      initials: initials,
      fullName: displayName,
      isGuest: false,
    };
  }, [currentUser, userData]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      // Clear any stored data
      localStorage.clear();
      sessionStorage.clear();
      // Redirect to login or home
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return {
    user,
    isLoading,
    isLoggedIn,
    logout: handleLogout,
  };
};
