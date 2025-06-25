/**
 * Template Card Component
 * Displays template information in card format with actions
 */

'use client';

import React, { useState } from 'react';
import { 
  Star, 
  Download, 
  Eye, 
  Play, 
  Tag, 
  Calendar, 
  User,
  Award,
  Shield,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { 
  DashboardTemplate,
  TemplateCardProps 
} from '@/types/template';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function TemplateCard({
  template,
  onSelect,
  onPreview,
  onImport,
  onRate,
  showActions = true,
  compact = false,
  className = ''
}: TemplateCardProps) {
  const [isRating, setIsRating] = useState(false);
  const [userRating, setUserRating] = useState(0);

  const handleStarClick = async (rating: number) => {
    if (!onRate) return;
    
    setIsRating(true);
    try {
      await onRate(template, rating);
      setUserRating(rating);
    } catch (error) {
      console.error('Failed to rate template:', error);
    } finally {
      setIsRating(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderStars = (rating: number, interactive = false) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-4 h-4 ${
            i <= rating 
              ? 'text-yellow-400 fill-yellow-400' 
              : 'text-gray-300'
          } ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
          onClick={interactive ? () => handleStarClick(i) : undefined}
        />
      );
    }
    return stars;
  };

  if (compact) {
    return (
      <Card className={`template-card compact ${className}`}>
        <div className="p-4 flex items-center gap-4">
          {/* Thumbnail */}
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
            {template.thumbnail ? (
              <img 
                src={template.thumbnail} 
                alt={template.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-gray-400 text-2xl">📊</div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">{template.name}</h3>
                <p className="text-sm text-gray-600 truncate">
                  {template.summary || template.description}
                </p>
                
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {template.authorName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    {template.downloadCount}
                  </span>
                  {template.rating && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      {template.rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              {showActions && (
                <div className="flex items-center gap-2 ml-4">
                  {onPreview && (
                    <Button variant="ghost" size="sm" onClick={() => onPreview(template)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  {onImport && (
                    <Button variant="outline" size="sm" onClick={() => onImport(template)}>
                      <Play className="w-4 h-4 mr-1" />
                      Use
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`template-card ${className} hover:shadow-lg transition-shadow cursor-pointer`}>
      <div onClick={() => onSelect?.(template)}>
        {/* Header with badges */}
        <div className="relative">
          {/* Thumbnail */}
          <div className="w-full h-32 bg-gray-100 flex items-center justify-center overflow-hidden">
            {template.thumbnail ? (
              <img 
                src={template.thumbnail} 
                alt={template.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-gray-400 text-4xl">📊</div>
            )}
          </div>

          {/* Status badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {template.isFeatured && (
              <Badge variant="default" className="text-xs">
                <Star className="w-3 h-3 mr-1" />
                Featured
              </Badge>
            )}
            {template.isOfficial && (
              <Badge variant="secondary" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Official
              </Badge>
            )}
          </div>

          {/* Rating in top right */}
          {template.rating && (
            <div className="absolute top-2 right-2 bg-white rounded-full px-2 py-1 text-xs font-medium flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              {template.rating.toFixed(1)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title and category */}
          <div className="mb-3">
            <h3 className="font-semibold text-lg mb-1 line-clamp-2">{template.name}</h3>
            {template.category && (
              <Badge variant="outline" className="text-xs">
                {template.category.displayName}
              </Badge>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-3 line-clamp-3">
            {template.summary || template.description}
          </p>

          {/* Manufacturing type and complexity */}
          {(template.manufacturingType || template.category?.complexityLevel) && (
            <div className="flex items-center gap-2 mb-3">
              {template.manufacturingType && (
                <Badge variant="secondary" className="text-xs capitalize">
                  {template.manufacturingType}
                </Badge>
              )}
              {template.category?.complexityLevel && (
                <Badge variant="outline" className="text-xs capitalize">
                  {template.category.complexityLevel}
                </Badge>
              )}
            </div>
          )}

          {/* Tags */}
          {template.tags && template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {template.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {template.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{template.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Download className="w-3 h-3" />
                {template.downloadCount}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(template.createdAt)}
              </span>
            </div>
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {template.authorName}
            </span>
          </div>

          {/* Interactive rating */}
          {onRate && (
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Rate:</span>
                <div className="flex gap-1">
                  {renderStars(userRating || template.rating || 0, true)}
                </div>
                {isRating && <span className="text-xs text-gray-500">Saving...</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="px-4 pb-4">
          <div className="flex gap-2">
            {onPreview && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(template);
                }}
                className="flex-1"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            )}
            {onImport && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  onImport(template);
                }}
                className="flex-1"
              >
                <Play className="w-4 h-4 mr-2" />
                Use Template
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Compatibility indicators */}
      {template.compatibleWith && template.compatibleWith.length > 0 && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span>Compatible with {template.compatibleWith.join(', ')}</span>
          </div>
        </div>
      )}

      {/* Deprecation warning */}
      {template.isDeprecated && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
            <AlertCircle className="w-3 h-3" />
            <span>This template is deprecated</span>
          </div>
        </div>
      )}
    </Card>
  );
}