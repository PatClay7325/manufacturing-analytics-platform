'use client';

import React from 'react';

interface TextOptionsProps {
  options?: any;
  fieldConfig?: any;
  onChange?: (options?: any) => void;
  onFieldConfigChange?: (fieldConfig?: any) => void;
}

export default function TextOptions({
  options,
  fieldConfig,
  onChange,
  onFieldConfigChange
}: TextOptionsProps) {
  return (
    <div className="p-4 space-y-6">
      {/* Text */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Text</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Mode
            </label>
            <select
              value={options?.mode || 'markdown'}
              onChange={(e) => onChange({ mode: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="markdown">Markdown</option>
              <option value="html">HTML</option>
              <option value="text">Plain text</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Content
            </label>
            <textarea
              value={options?.content || ''}
              onChange={(e) => onChange({ content: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="Enter your text content here..."
              rows={8}
            />
            <div className="text-xs text-gray-500 mt-1">
              {options?.mode === 'markdown' && 'Supports Markdown syntax including **bold**, *italic*, and [links](url)'}
              {options?.mode === 'html' && 'Raw HTML content - use with caution'}
              {options?.mode === 'text' && 'Plain text only'}
            </div>
          </div>
        </div>
      </div>

      {/* Styling */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Styling</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Text alignment
            </label>
            <select
              value={options?.textAlign || 'left'}
              onChange={(e) => onChange({ textAlign: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
              <option value="justify">Justify</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Font size
            </label>
            <select
              value={options?.fontSize || 'medium'}
              onChange={(e) => onChange({ fontSize: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="xs">Extra Small</option>
              <option value="sm">Small</option>
              <option value="medium">Medium</option>
              <option value="lg">Large</option>
              <option value="xl">Extra Large</option>
              <option value="2xl">2X Large</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Font weight
            </label>
            <select
              value={options?.fontWeight || 'normal'}
              onChange={(e) => onChange({ fontWeight: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="light">Light</option>
              <option value="normal">Normal</option>
              <option value="medium">Medium</option>
              <option value="semibold">Semi Bold</option>
              <option value="bold">Bold</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Text color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={options?.textColor || '#ffffff'}
                onChange={(e) => onChange({ textColor: e.target.value })}
                className="w-12 h-8 bg-gray-700 border border-gray-600 rounded cursor-pointer"
              />
              <input
                type="text"
                value={options?.textColor || '#ffffff'}
                onChange={(e) => onChange({ textColor: e.target.value })}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="#ffffff"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Background color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={options?.backgroundColor || 'transparent'}
                onChange={(e) => onChange({ backgroundColor: e.target.value })}
                className="w-12 h-8 bg-gray-700 border border-gray-600 rounded cursor-pointer"
              />
              <input
                type="text"
                value={options?.backgroundColor || 'transparent'}
                onChange={(e) => onChange({ backgroundColor: e.target.value })}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Layout */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Layout</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Padding
            </label>
            <input
              type="range"
              min="0"
              max="32"
              value={parseInt(options?.padding?.replace('px', '')) || 8}
              onChange={(e) => onChange({ padding: `${e.target.value}px` })}
              className="w-full"
            />
            <div className="text-xs text-gray-500 mt-1">
              {options?.padding || '8px'}
            </div>
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={options?.scrollable || false}
              onChange={(e) => onChange({ scrollable: e.target.checked })}
              className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">Enable scrolling for overflow content</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Max height
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={parseInt(options?.maxHeight?.replace('px', '')) || ''}
                onChange={(e) => onChange({ maxHeight: e.target.value ? `${e.target.value}px` : undefined })}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="Auto"
                min="50"
              />
              <span className="px-3 py-2 bg-gray-800 border border-gray-600 rounded text-gray-400 text-sm">px</span>
            </div>
          </div>
        </div>
      </div>

      {/* Variables */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Variables</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={options?.enableVariables !== false}
              onChange={(e) => onChange({ enableVariables: e.target.checked })}
              className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">Enable variable interpolation</span>
          </label>
          
          <div className="text-xs text-gray-500 bg-gray-800 p-3 rounded">
            <p className="mb-1">Use variables in your text content:</p>
            <p>• ${`{variable_name}`} - Dashboard variables</p>
            <p>• ${`{__from}`} and ${`{__to}`} - Time range</p>
            <p>• ${`{__interval}`} - Current interval</p>
          </div>
        </div>
      </div>

      {/* Preview */}
      {options?.content && (
        <div>
          <h3 className="text-sm font-medium text-white mb-4">Preview</h3>
          <div 
            className={`border border-gray-600 rounded p-4 bg-gray-800 min-h-[100px] text-${options?.fontSize || 'base'} font-${options?.fontWeight || 'normal'} text-${options?.textAlign || 'left'}`}
            style={{ 
              color: options.textColor || '#ffffff',
              backgroundColor: options.backgroundColor !== 'transparent' ? options?.backgroundColor : undefined,
              padding: options.padding || '8px',
              maxHeight: options.maxHeight,
              overflow: options.scrollable ? 'auto' : 'hidden'
            }}
          >
            {options?.mode === 'html' ? (
              <div dangerouslySetInnerHTML={{ __html: options.content }} />
            ) : options.mode === 'markdown' ? (
              <div className="prose prose-invert max-w-none">
                {/* Simple markdown rendering */}
                {options?.content
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  .split('\n').map((line: string, i: number) => (
                    <p key={i} dangerouslySetInnerHTML={{ __html: line }} />
                  ))}
              </div>
            ) : (
              <pre className="whitespace-pre-wrap font-sans">{options?.content}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}