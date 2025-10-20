import { FileText, Hash, Home, Upload } from 'lucide-react';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { __ } from '@/utils/translation';
import tbsLogo from '../assets/tbs_logo.png';
import { NavUser } from './NavUser';

export const AppSidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof Sidebar>
>((props, ref) => {
  const location = useLocation();

  const isPathActive = (path: string) => {
    if (path === '/') {
      return (
        location.pathname === '/' || location.pathname === '/asean-translations'
      );
    }
    return location.pathname.startsWith(path);
  };

  const navItems = [
    {
      title: __('ERPNext ASEAN Translations'),
      url: '/asean-translations',
      icon: FileText,
      isActive: isPathActive('/asean-translations') || isPathActive('/'),
    },
    {
      title: __('CSV Translations'),
      url: '/csv-translations',
      icon: Upload,
      isActive: isPathActive('/csv-translations'),
    },
    {
      title: __('UUID Generator'),
      url: '/uuid-generator',
      icon: Hash,
      isActive: isPathActive('/uuid-generator'),
    },
  ];

  return (
    <Sidebar collapsible="icon" {...props} ref={ref}>
      <SidebarHeader className="pt-4 pb-4 px-4 transition-all duration-300 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-3">
        <div className="flex items-center gap-2 transition-all duration-300 group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center shrink-0">
            <a href="/app" className="flex items-center">
              <img
                src={tbsLogo}
                alt="Thai Business Suite Logo"
                className="h-8 w-auto transition-all duration-300 ease-in-out group-data-[collapsible=icon]:h-8"
              />
            </a>
          </div>
          <span className="font-semibold text-lg transition-opacity duration-300 group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 overflow-hidden whitespace-nowrap">
            {__('Translation Tools')}
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu className="mt-6">
          {navItems.map((item) => (
            <SidebarMenuItem
              id="tbs__sidebar__menu__item"
              className="m-2"
              key={item.url}
            >
              <SidebarMenuButton
                asChild
                isActive={item.isActive}
                tooltip={item.title}
              >
                <Link to={item.url}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
});

AppSidebar.displayName = 'AppSidebar';
