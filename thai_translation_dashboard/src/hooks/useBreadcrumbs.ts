import { useLocation } from 'react-router-dom';
import { __ } from '@/utils/translations';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  external?: boolean;
}

export interface UseBreadcrumbsOptions {
  currentTab?: string;
}

// Tab mapping for tab-based navigation within pages
const tabMap: Record<string, string> = {
  files: __('File Explorer'),
  editor: __('Translation Editor'),
  glossary: __('Glossary Manager'),
  settings: __('Settings'),
};

export const useBreadcrumbs = (options?: UseBreadcrumbsOptions): BreadcrumbItem[] => {
  const location = useLocation();
  const { currentTab } = options || {};

  // Route name mapping for translation tools
  const routeLabels: Record<string, string> = {
    '': __('ERPNext ASEAN Translations'),
    'asean-translations': __('ERPNext ASEAN Translations'),
    'csv-translations': __('CSV Translations'),
    'settings': __('Settings'),
  };

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Always add Desk as the first breadcrumb (external link to Frappe)
    breadcrumbs.push({
      label: __('Desk'),
      href: '/app',
      external: true,
    });

    // Always add Translation Tools as the second breadcrumb
    breadcrumbs.push({
      label: __('Translation Tools'),
      href: '/',
    });

    // Generate breadcrumbs for each path segment
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;

      const label = routeLabels[segment] || segment
        .replace('-', ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      breadcrumbs.push({
        label,
        href: isLast ? undefined : currentPath,
      });
    });

    // Add tab breadcrumb if currentTab is provided and exists in tabMap
    if (currentTab && tabMap[currentTab]) {
      breadcrumbs.push({
        label: tabMap[currentTab],
        // No href for tab (current location)
      });
    }

    return breadcrumbs;
  };

  return generateBreadcrumbs();
};
