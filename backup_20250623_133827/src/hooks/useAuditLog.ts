/**
 * React hook for audit logging in components
 */

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface AuditContext {
  userId?: string;
  userEmail?: string;
  userRole?: string;
}

interface UseAuditLogOptions {
  context?: AuditContext;
}

export function useAuditLog(options?: UseAuditLogOptions) {
  const router = useRouter();

  const logAction = useCallback(async (
    action: string,
    resource: {
      type: string;
      id?: string;
      name?: string;
    },
    metadata?: Record<string, any>
  ) => {
    try {
      // Get user context from localStorage or session
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      const context: AuditContext = {
        userId: user?.id,
        userEmail: user?.email,
        userRole: user?.role,
        ...options?.context
      };

      // Send audit log to server
      await fetch('/api/audit-logs/client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          resource,
          metadata,
          context,
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      });
    } catch (error) {
      console.error('Failed to log audit action:', error);
    }
  }, [options?.context]);

  const logPageView = useCallback(async (
    pageName: string,
    metadata?: Record<string, any>
  ) => {
    await logAction('page_view', {
      type: 'page',
      name: pageName
    }, metadata);
  }, [logAction]);

  const logInteraction = useCallback(async (
    element: string,
    action: string,
    metadata?: Record<string, any>
  ) => {
    await logAction(`ui.${action}`, {
      type: 'ui_element',
      name: element
    }, metadata);
  }, [logAction]);

  const logDataExport = useCallback(async (
    dataType: string,
    format: string,
    recordCount?: number
  ) => {
    await logAction('export', {
      type: dataType
    }, {
      format,
      recordCount
    });
  }, [logAction]);

  const logError = useCallback(async (
    error: Error,
    context?: string
  ) => {
    await logAction('client_error', {
      type: 'error',
      name: error.name
    }, {
      message: error.message,
      stack: error.stack,
      context
    });
  }, [logAction]);

  return {
    logAction,
    logPageView,
    logInteraction,
    logDataExport,
    logError
  };
}