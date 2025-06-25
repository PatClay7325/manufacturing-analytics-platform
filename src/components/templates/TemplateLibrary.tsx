/**
 * Template Library Component
 * Main component for browsing, searching, and managing dashboard templates
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  Plus, 
  Upload,
  Star,
  Download,
  TrendingUp,
  Clock,
  Tag
} from 'lucide-react';
import { 
  DashboardTemplate,
  TemplateCategory,
  TemplateFilters,
  TemplateSearchRequest,
  TemplateSearchResponse,
  TemplateLibraryProps,
  TemplateSortBy,
  ManufacturingTemplateType,
  ComplexityLevel
} from '@/types/template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TemplateCard } from './TemplateCard';
import { TemplatePreview } from './TemplatePreview';
import { TemplateImporter } from './TemplateImporter';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export function TemplateLibrary({
  initialCategory,
  initialFilters = {},
  onTemplateSelect,
  onTemplateImport,
  showCreateButton = true,
  showImportButton = true,
  maxHeight = '800px',
  className = ''
}: TemplateLibraryProps) {
  // State management
  const [templates, setTemplates] = useState<DashboardTemplate[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || '');
  const [filters, setFilters] = useState<TemplateFilters>({
    tags: [],
    industry: [],
    ...initialFilters
  });
  const [sortBy, setSortBy] = useState<TemplateSortBy>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // UI state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<DashboardTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [templateToImport, setTemplateToImport] = useState<DashboardTemplate | null>(null);
  
  // Filter panel state
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableIndustries, setAvailableIndustries] = useState<string[]>([]);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load templates when search/filter criteria change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadTemplates();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCategory, filters, sortBy, sortOrder, currentPage]);

  // Load categories
  const loadCategories = async () => {
    try {
      const response = await fetch('/api/templates/categories?includeCount=true');
      if (response.ok) {
        const categoriesData = await response.json();
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  // Load templates
  const loadTemplates = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const searchRequest: TemplateSearchRequest = {
        query: searchQuery || undefined,
        category: selectedCategory || undefined,
        tags: filters.tags.length > 0 ? filters.tags : undefined,
        industry: filters.industry.length > 0 ? filters.industry : undefined,
        manufacturingType: filters.manufacturingType,
        equipmentType: filters.equipmentType,
        complexityLevel: filters.complexityLevel,
        isPublic: filters.isPublic,
        isFeatured: filters.isFeatured,
        isOfficial: filters.isOfficial,
        authorId: filters.authorId,
        sortBy,
        sortOrder,
        page: currentPage,
        limit: 20
      };

      const queryParams = new URLSearchParams();
      Object.entries(searchRequest).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            if (value.length > 0) {
              queryParams.set(key, value.join(','));
            }
          } else {
            queryParams.set(key, String(value));
          }
        }
      });

      const response = await fetch(`/api/templates?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to load templates');
      }

      const data: TemplateSearchResponse = await response.json();
      setTemplates(data.templates);
      setTotalCount(data.totalCount);
      
      // Update available filter options
      setAvailableTags(data.tags.map(t => t.tag));
      setAvailableIndustries(data.industries.map(i => i.industry));
      
    } catch (error) {
      console.error('Failed to load templates:', error);
      setError('Failed to load templates. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle template actions
  const handleTemplateSelect = (template: DashboardTemplate) => {
    setSelectedTemplate(template);
    if (onTemplateSelect) {
      onTemplateSelect(template);
    }
  };

  const handleTemplatePreview = (template: DashboardTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleTemplateImport = (template: DashboardTemplate) => {
    setTemplateToImport(template);
    setIsImporterOpen(true);
  };

  const handleImportComplete = (result: any) => {
    setIsImporterOpen(false);
    setTemplateToImport(null);
    if (onTemplateImport && selectedTemplate) {
      onTemplateImport(selectedTemplate, result.variables);
    }
  };

  // Filter handlers
  const handleTagToggle = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleIndustryToggle = (industry: string) => {
    setFilters(prev => ({
      ...prev,
      industry: prev.industry.includes(industry)
        ? prev.industry.filter(i => i !== industry)
        : [...prev.industry, industry]
    }));
  };

  const clearFilters = () => {
    setFilters({
      tags: [],
      industry: []
    });
    setSelectedCategory('');
    setSearchQuery('');
  };

  const totalPages = Math.ceil(totalCount / 20);

  return (
    <div className={`template-library ${className}`} style={{ maxHeight }}>
      {/* Header */}
      <div className="template-library-header mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Template Library</h2>
          <div className="flex items-center gap-2">
            {showCreateButton && (
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            )}
            {showImportButton && (
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Import Template
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Search and Quick Filters */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.displayName} ({category.templateCount})
              </option>
            ))}
          </Select>

          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as TemplateSortBy)}
          >
            <option value="created">Latest</option>
            <option value="rating">Highest Rated</option>
            <option value="downloads">Most Popular</option>
            <option value="name">Name</option>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Filter Panel */}
        {isFilterPanelOpen && (
          <Card className="p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Manufacturing Type Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Manufacturing Type</label>
                <Select
                  value={filters.manufacturingType || ''}
                  onValueChange={(value) => setFilters(prev => ({
                    ...prev,
                    manufacturingType: value as ManufacturingTemplateType || undefined
                  }))}
                >
                  <option value="">All Types</option>
                  <option value="oee">OEE</option>
                  <option value="quality">Quality</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="energy">Energy</option>
                  <option value="production">Production</option>
                  <option value="equipment">Equipment</option>
                </Select>
              </div>

              {/* Complexity Level Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Complexity</label>
                <Select
                  value={filters.complexityLevel || ''}
                  onValueChange={(value) => setFilters(prev => ({
                    ...prev,
                    complexityLevel: value as ComplexityLevel || undefined
                  }))}
                >
                  <option value="">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </Select>
              </div>

              {/* Template Type Filters */}
              <div>
                <label className="text-sm font-medium mb-2 block">Template Type</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.isFeatured || false}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        isFeatured: e.target.checked || undefined
                      }))}
                      className="mr-2"
                    />
                    <Star className="w-4 h-4 mr-1" />
                    Featured
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.isOfficial || false}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        isOfficial: e.target.checked || undefined
                      }))}
                      className="mr-2"
                    />
                    Official
                  </label>
                </div>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Tags Filter */}
            {availableTags.length > 0 && (
              <div className="mt-4">
                <label className="text-sm font-medium mb-2 block">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.slice(0, 20).map(tag => (
                    <Badge
                      key={tag}
                      variant={filters.tags.includes(tag) ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Active Filters */}
        {(filters.tags.length > 0 || filters.industry.length > 0 || selectedCategory || filters.manufacturingType) && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-600">Active filters:</span>
            {selectedCategory && (
              <Badge variant="outline">
                Category: {categories.find(c => c.id === selectedCategory)?.displayName}
              </Badge>
            )}
            {filters.manufacturingType && (
              <Badge variant="outline">
                Type: {filters.manufacturingType}
              </Badge>
            )}
            {filters.tags.map(tag => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
            {filters.industry.map(industry => (
              <Badge key={industry} variant="outline">
                {industry}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="template-library-content">
        {error && (
          <div className="text-red-600 mb-4 p-4 bg-red-50 rounded-lg">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No templates found matching your criteria.</p>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <>
            {/* Results Info */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                Showing {templates.length} of {totalCount} templates
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Sort:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="h-auto p-1"
                >
                  {sortOrder === 'desc' ? '↓' : '↑'}
                </Button>
              </div>
            </div>

            {/* Templates Grid/List */}
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              : "space-y-4"
            }>
              {templates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleTemplateSelect}
                  onPreview={handleTemplatePreview}
                  onImport={handleTemplateImport}
                  compact={viewMode === 'list'}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <TemplatePreview
          template={selectedTemplate}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          onImport={handleTemplateImport}
        />
      )}

      {/* Template Importer Modal */}
      {templateToImport && (
        <TemplateImporter
          template={templateToImport}
          isOpen={isImporterOpen}
          onClose={() => setIsImporterOpen(false)}
          onImport={handleImportComplete}
        />
      )}
    </div>
  );
}