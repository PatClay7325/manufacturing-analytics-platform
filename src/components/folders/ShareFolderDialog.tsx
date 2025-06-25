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

interface ShareFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: DashboardFolder;
}

export function ShareFolderDialog({
  open,
  onOpenChange,
  folder
}: ShareFolderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Folder</DialogTitle>
          <DialogDescription>
            Share "{folder.name}" with others
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-muted-foreground">
            Folder sharing interface coming soon...
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}