import { useFrappeAuth, useFrappeGetCall } from 'frappe-react-sdk';
import { useMemo } from 'react';

interface LoggedUserInfo {
  name: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  user_image?: string;
  username?: string;
  mobile_no?: string;
  phone?: string;
  gender?: string;
  birth_date?: string;
  enabled?: number;
  user_type?: string;
}

interface APIResponse {
  message: LoggedUserInfo;
}

interface UseRealUserReturn {
  user: {
    name: string;
    email: string;
    avatar?: string;
    initials: string;
    fullName: string;
    isGuest: boolean;
  } | null;
  userData: LoggedUserInfo | null; // Raw user data from API
  isLoading: boolean;
  isLoggedIn: boolean;
  logout: () => void;
}

/**
 * Hook that fetches real user data using custom API method with backend logging
 * This method uses translation_tools.api.user.get_current_user for reliable user data retrieval
 */
export const useRealUser = (): UseRealUserReturn => {
  const { currentUser, isLoading: authLoading, logout } = useFrappeAuth();

  // Check if we should fetch user details
  const shouldFetchUserDetails = !!currentUser && currentUser !== 'Guest' && currentUser !== '';

  // Use our custom API method to get user details with backend logging
  const { data: userData, isLoading: userLoading } = useFrappeGetCall<APIResponse>(
    'translation_tools.api.user.get_current_user',
    shouldFetchUserDetails ? {} : null,
    undefined,
    {
      isOnline: () => shouldFetchUserDetails,
    }
  );

  const isLoading = authLoading || userLoading;
  const isLoggedIn = !!currentUser && currentUser !== 'Guest' && currentUser !== '';

  const user = useMemo(() => {
    if (!currentUser || currentUser === 'Guest' || currentUser === '') {
      return null;
    }

    // Extract user info from the response - our custom API returns data wrapped in message
    const userInfo = userData?.message;

    // Debug: Log the user data to see what we're getting
    console.log('🔍 Frontend User Data from translation_tools.api.user.get_current_user:', {
      currentUser,
      rawResponse: userData,
      userInfo,
      fields: {
        name: userInfo?.name,
        email: userInfo?.email,
        first_name: userInfo?.first_name,
        last_name: userInfo?.last_name,
        full_name: userInfo?.full_name,
        username: userInfo?.username,
        user_image: userInfo?.user_image,
        mobile_no: userInfo?.mobile_no,
        phone: userInfo?.phone,
        gender: userInfo?.gender,
        birth_date: userInfo?.birth_date,
      }
    });

    // Generate initials from available name fields
    const getInitials = (userInfo?: LoggedUserInfo, fallback: string): string => {
      // Try first name + last name
      if (userInfo?.first_name && userInfo?.last_name) {
        return `${userInfo.first_name[0]}${userInfo.last_name[0]}`.toUpperCase();
      }

      // Try full name
      if (userInfo?.full_name) {
        const names = userInfo.full_name.trim().split(' ').filter(n => n);
        if (names.length >= 2) {
          return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        if (names[0]?.length >= 2) {
          return names[0].substring(0, 2).toUpperCase();
        }
        if (names[0]) {
          return names[0][0].toUpperCase();
        }
      }

      // Try first name only
      if (userInfo?.first_name && userInfo.first_name.length >= 1) {
        const initial = userInfo.first_name.substring(0, Math.min(2, userInfo.first_name.length));
        return initial.toUpperCase();
      }

      // Try email
      if (userInfo?.email && userInfo.email.includes('@')) {
        const emailPart = userInfo.email.split('@')[0];
        if (emailPart.length >= 2) {
          return emailPart.substring(0, 2).toUpperCase();
        }
        return emailPart[0].toUpperCase();
      }

      // Fallback
      if (fallback.includes('@')) {
        return fallback.substring(0, 2).toUpperCase();
      }
      return fallback.substring(0, Math.min(2, fallback.length)).toUpperCase();
    };

    // Build display name from available fields (priority order)
    let displayName: string;

    if (userInfo?.full_name && userInfo.full_name.trim()) {
      displayName = userInfo.full_name;
    } else if (userInfo?.first_name && userInfo?.last_name) {
      displayName = `${userInfo.first_name} ${userInfo.last_name}`.trim();
    } else if (userInfo?.first_name) {
      displayName = userInfo.first_name;
    } else if (userInfo?.username) {
      // Capitalize the username for display
      displayName = userInfo.username.charAt(0).toUpperCase() + userInfo.username.slice(1);
    } else if (userInfo?.email) {
      // Extract name from email
      displayName = userInfo.email.split('@')[0].replace(/[._-]/g, ' ');
      // Capitalize words
      displayName = displayName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    } else {
      displayName = currentUser;
    }

    const email = userInfo?.email || currentUser;
    const initials = getInitials(userInfo, currentUser);

    return {
      name: displayName,
      email: email,
      avatar: userInfo?.user_image,
      initials: initials,
      fullName: displayName,
      isGuest: false,
    };
  }, [currentUser, userData]);

  const handleLogout = async () => {
    try {
      await logout();
      // Clear any stored data
      localStorage.clear();
      sessionStorage.clear();
      // Redirect to login
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return {
    user,
    userData: userData?.message || null,
    isLoading,
    isLoggedIn,
    logout: handleLogout,
  };
};
