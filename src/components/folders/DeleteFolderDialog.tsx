'use client';

import React, { useState } from 'react';
import { AlertTriangle, Folder, FolderOpen } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DashboardFolder } from '@/types/folder';

interface DeleteFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: DashboardFolder;
  onConfirm: (deleteContents: boolean) => void;
}

export function DeleteFolderDialog({
  open,
  onOpenChange,
  folder,
  onConfirm
}: DeleteFolderDialogProps) {
  const [deleteContents, setDeleteContents] = useState(false);
  
  const hasContents = (folder.dashboardCount || 0) > 0 || 
                     (folder.alertRuleCount || 0) > 0 ||
                     (folder.libraryPanelCount || 0) > 0 ||
                     (folder.children?.length || 0) > 0;

  const handleConfirm = () => {
    onConfirm(deleteContents);
    setDeleteContents(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Are you sure you want to delete the folder <strong>"{folder.name}"</strong>?
              </p>
              
              {hasContents && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 space-y-2">
                  <p className="font-medium text-sm">This folder contains:</p>
                  <ul className="text-sm space-y-1 ml-4">
                    {folder.dashboardCount > 0 && (
                      <li>• {folder.dashboardCount} dashboard{folder.dashboardCount > 1 ? 's' : ''}</li>
                    )}
                    {folder.alertRuleCount > 0 && (
                      <li>• {folder.alertRuleCount} alert rule{folder.alertRuleCount > 1 ? 's' : ''}</li>
                    )}
                    {folder.libraryPanelCount > 0 && (
                      <li>• {folder.libraryPanelCount} library panel{folder.libraryPanelCount > 1 ? 's' : ''}</li>
                    )}
                    {(folder.children?.length || 0) > 0 && (
                      <li>• {folder.children!.length} subfolder{folder.children!.length > 1 ? 's' : ''}</li>
                    )}
                  </ul>
                  
                  <div className="flex items-center space-x-2 mt-4">
                    <Checkbox
                      id="delete-contents"
                      checked={deleteContents}
                      onCheckedChange={(checked) => setDeleteContents(checked as boolean)}
                    />
                    <Label
                      htmlFor="delete-contents"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Delete all contents (this action cannot be undone)
                    </Label>
                  </div>
                </div>
              )}
              
              {!hasContents && (
                <p className="text-sm text-muted-foreground">
                  This folder is empty and will be permanently deleted.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={hasContents && !deleteContents}
          >
            Delete{hasContents && deleteContents ? ' Everything' : ''}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}