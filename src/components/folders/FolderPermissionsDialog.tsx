'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DashboardFolder } from '@/types/folder';

interface FolderPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: DashboardFolder;
}

export function FolderPermissionsDialog({
  open,
  onOpenChange,
  folder
}: FolderPermissionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Permissions</DialogTitle>
          <DialogDescription>
            Configure access permissions for "{folder.name}"
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-muted-foreground">
            Permission management interface coming soon...
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}