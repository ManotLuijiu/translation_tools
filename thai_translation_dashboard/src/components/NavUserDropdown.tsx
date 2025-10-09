import { LogOut, User, LayoutDashboard, Loader2 } from 'lucide-react';
import { __ } from '@/utils/translations';
import { useCurrentUser } from '@/hooks/useCurrentUser';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Navbar user dropdown component for translation tools header
 * Displays compact avatar with dropdown menu
 */
export function NavUserDropdown() {
  const { user, isLoading, isLoggedIn, logout } = useCurrentUser();

  const userData = user;

  // Show loading skeleton while fetching user data
  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
    );
  }

  // Show login button for guests
  if (!isLoggedIn || !userData) {
    return (
      <Button variant="ghost" asChild>
        <a href="/login">{__('Login')}</a>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={userData.avatar}
              alt={userData.name}
              onError={(e) => {
                // Force fallback on error
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <AvatarFallback className="bg-primary/10 text-sm font-medium">
              {userData.initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userData.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userData.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/me" className="cursor-pointer" rel="nofollow">
            <User className="mr-2 h-4 w-4" />
            <span>{__('My Account')}</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/app" className="cursor-pointer">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>{__('Switch To Desk')}</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => logout()}
          className="cursor-pointer text-red-600 dark:text-red-400"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{__('Log Out')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
