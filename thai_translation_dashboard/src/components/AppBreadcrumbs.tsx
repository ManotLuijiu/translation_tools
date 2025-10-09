import React from 'react';
import { Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';

export interface AppBreadcrumbsProps {
  currentTab?: string;
}

export const AppBreadcrumbs: React.FC<AppBreadcrumbsProps> = ({ currentTab }) => {
  const breadcrumbs = useBreadcrumbs({ currentTab });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((breadcrumb, index) => (
          <React.Fragment key={index}>
            <BreadcrumbItem>
              {breadcrumb.href ? (
                breadcrumb.external ? (
                  <BreadcrumbLink asChild>
                    <a href={breadcrumb.href} target="_blank" rel="noopener noreferrer">
                      {breadcrumb.label}
                    </a>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={breadcrumb.href}>
                      {breadcrumb.label}
                    </Link>
                  </BreadcrumbLink>
                )
              ) : (
                <BreadcrumbPage>
                  {breadcrumb.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
