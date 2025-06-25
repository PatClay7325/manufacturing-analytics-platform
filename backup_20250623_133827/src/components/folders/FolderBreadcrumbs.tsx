'use client';

import React, { useEffect, useState } from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { FolderBreadcrumb } from '@/types/folder';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FolderBreadcrumbsProps {
  folderId: string;
  onNavigate?: (folderId?: string) => void;
  showHome?: boolean;
  className?: string;
}

export function FolderBreadcrumbs({
  folderId,
  onNavigate,
  showHome = true,
  className
}: FolderBreadcrumbsProps) {
  const [breadcrumbs, setBreadcrumbs] = useState<FolderBreadcrumb[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBreadcrumbs();
  }, [folderId]);

  const loadBreadcrumbs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/folders/${folderId}/path`);
      if (!response.ok) throw new Error('Failed to load breadcrumbs');
      
      const data = await response.json();
      setBreadcrumbs(data.segments);
    } catch (error) {
      console.error('Error loading breadcrumbs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <nav className={cn('flex items-center gap-1 text-sm', className)}>
      {/* Home */}
      {showHome && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-1 hover:bg-muted"
            onClick={() => onNavigate?.()}
          >
            <Home className="h-4 w-4" />
          </Button>
          {breadcrumbs.length > 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </>
      )}

      {/* Breadcrumb items */}
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.id}>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-auto p-1 hover:bg-muted',
              index === breadcrumbs.length - 1 && 'font-medium'
            )}
            onClick={() => index < breadcrumbs.length - 1 && onNavigate?.(crumb.id)}
            disabled={index === breadcrumbs.length - 1}
          >
            {crumb.icon && <span className="mr-1">{crumb.icon}</span>}
            {crumb.name}
          </Button>
          {index < breadcrumbs.length - 1 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}