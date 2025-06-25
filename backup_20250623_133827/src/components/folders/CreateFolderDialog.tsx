'use client';

import React, { useState } from 'react';
import { Folder, Globe, Lock, Users, Palette, Tag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateFolderRequest } from '@/types/folder';
import { Badge } from '@/components/ui/badge';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateFolderRequest) => void;
  parentFolderName?: string;
}

const folderIcons = [
  '📁', '📊', '📈', '🏭', '⚙️', '🔧', '📋', '🎯', '⚡', '🌟'
];

const folderColors = [
  { name: 'Default', value: '' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Yellow', value: '#f59e0b' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Indigo', value: '#6366f1' },
];

export function CreateFolderDialog({
  open,
  onOpenChange,
  onSubmit,
  parentFolderName
}: CreateFolderDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permission, setPermission] = useState<'private' | 'team' | 'public'>('private');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;
    
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      permission,
      icon,
      color,
      tags
    });
    
    // Reset form
    setName('');
    setDescription('');
    setPermission('private');
    setIcon('');
    setColor('');
    setTags([]);
    setTagInput('');
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              {parentFolderName 
                ? `Create a new folder inside "${parentFolderName}"`
                : 'Create a new top-level folder'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Folder Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter folder name"
                required
              />
            </div>
            
            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter folder description"
                rows={3}
              />
            </div>
            
            {/* Permission */}
            <div className="grid gap-2">
              <Label>Visibility</Label>
              <RadioGroup value={permission} onValueChange={(value: any) => setPermission(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="private" id="private" />
                  <Label htmlFor="private" className="flex items-center gap-2 cursor-pointer">
                    <Lock className="h-4 w-4" />
                    Private - Only you can access
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="team" id="team" />
                  <Label htmlFor="team" className="flex items-center gap-2 cursor-pointer">
                    <Users className="h-4 w-4" />
                    Team - Your team members can access
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="public" />
                  <Label htmlFor="public" className="flex items-center gap-2 cursor-pointer">
                    <Globe className="h-4 w-4" />
                    Public - Everyone can access
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            {/* Icon and Color */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Icon (optional)</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={!icon ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIcon('')}
                  >
                    <Folder className="h-4 w-4" />
                  </Button>
                  {folderIcons.map((emoji) => (
                    <Button
                      key={emoji}
                      type="button"
                      variant={icon === emoji ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setIcon(emoji)}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="color">Color (optional)</Label>
                <Select value={color} onValueChange={setColor}>
                  <SelectTrigger id="color">
                    <SelectValue placeholder="Select color">
                      {color && (
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded" 
                            style={{ backgroundColor: color }}
                          />
                          {folderColors.find(c => c.value === color)?.name}
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {folderColors.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          {c.value && (
                            <div 
                              className="w-4 h-4 rounded" 
                              style={{ backgroundColor: c.value }}
                            />
                          )}
                          {c.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Tags */}
            <div className="grid gap-2">
              <Label htmlFor="tags">Tags (optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add tags"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTag}
                >
                  <Tag className="h-4 w-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Create Folder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}