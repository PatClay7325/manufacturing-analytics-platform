import React from 'react';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBreadcrumbs?: boolean;
  breadcrumbs?: { label: string; href: string }[];
  actionButton?: React.ReactNode;
}

export default function PageLayout({
  children,
  title,
  showBreadcrumbs = false,
  breadcrumbs = [],
  actionButton,
}: PageLayoutProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      {(title || actionButton) && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            {showBreadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex mb-2" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-3 text-sm">
                  {breadcrumbs.map((crumb, index) => (
                    <li key={crumb.href} className="inline-flex items-center">
                      {index > 0 && (
                        <svg
                          className="w-4 h-4 text-gray-400 mx-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      <a
                        href={crumb.href}
                        className={`${
                          index === breadcrumbs.length - 1
                            ? 'text-gray-500'
                            : 'text-blue-600 hover:text-blue-800'
                        } ${index === 0 ? 'ml-1' : ''}`}
                        aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}
                      >
                        {crumb.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            {title && (
              <h1 className="text-3xl font-bold text-gray-800" data-testid="page-title">
                {title}
              </h1>
            )}
          </div>
          {actionButton && <div className="mt-4 sm:mt-0">{actionButton}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}