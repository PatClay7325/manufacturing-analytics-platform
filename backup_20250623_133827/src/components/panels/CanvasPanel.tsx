/**
 * Canvas Panel - Analytics-compatible custom layout panel
 * Enables SCADA-like visualizations with drag-and-drop elements
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Circle, Square, Type, Image, Gauge, TrendingUp, 
  Move, Trash2, Settings, Layers, Lock, Unlock,
  RotateCw, FlipHorizontal, FlipVertical, Copy
} from 'lucide-react';
import { PanelProps, DataFrame } from '@/core/plugins/types';
import { cn } from '@/lib/utils';

export interface CanvasPanelOptions {
  root?: CanvasElement;
  grid?: {
    enabled: boolean;
    size: number;
    snap: boolean;
  };
  background?: {
    color?: string;
    image?: string;
    size?: 'cover' | 'contain' | 'repeat';
  };
  showToolbar?: boolean;
  lockElements?: boolean;
}

interface CanvasElement {
  id: string;
  type: 'text' | 'rectangle' | 'circle' | 'image' | 'metric' | 'gauge' | 'chart';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  style?: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    fontSize?: number;
    fontWeight?: string;
    textAlign?: 'left' | 'center' | 'right';
    opacity?: number;
  };
  data?: {
    text?: string;
    src?: string;
    field?: string;
    query?: string;
    valueFormat?: string;
    thresholds?: Array<{ value: number; color: string }>;
  };
  locked?: boolean;
  layer?: number;
}

const CanvasPanel: React.FC<PanelProps<CanvasPanelOptions>> = ({
  data,
  options,
  width,
  height,
  replaceVariables,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [elements, setElements] = useState<CanvasElement[]>(
    options.root ? [options.root] : []
  );
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    elementId: string | null;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  }>({
    isDragging: false,
    elementId: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
  });
  const [tool, setTool] = useState<string>('select');
  const [showLayers, setShowLayers] = useState(false);

  // Get value from data
  const getFieldValue = useCallback((fieldName?: string): any => {
    if (!fieldName || !data.series || data.series.length === 0) return null;

    for (const frame of data.series) {
      const field = frame.fields.find(f => f.name === fieldName);
      if (field && frame.length > 0) {
        return field.values.get(frame.length - 1);
      }
    }
    return null;
  }, [data.series]);

  // Snap to grid
  const snapToGrid = useCallback((value: number): number => {
    if (!options.grid?.snap || !options.grid?.enabled) return value;
    const gridSize = options.grid.size || 10;
    return Math.round(value / gridSize) * gridSize;
  }, [options.grid]);

  // Add element
  const addElement = useCallback((type: CanvasElement['type'], x: number, y: number) => {
    const newElement: CanvasElement = {
      id: `element-${Date.now()}`,
      type,
      x: snapToGrid(x),
      y: snapToGrid(y),
      width: type === 'circle' ? 50 : 100,
      height: type === 'circle' ? 50 : 50,
      layer: elements.length,
      style: {
        fill: '#3b82f6',
        stroke: '#1e40af',
        strokeWidth: 2,
        fontSize: 16,
        fontWeight: 'normal',
        textAlign: 'center',
        opacity: 1,
      },
      data: {
        text: type === 'text' ? 'Text' : undefined,
      },
    };

    setElements([...elements, newElement]);
    setSelectedElement(newElement.id);
  }, [elements, snapToGrid]);

  // Update element
  const updateElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
    setElements(elements.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ));
  }, [elements]);

  // Delete element
  const deleteElement = useCallback((id: string) => {
    setElements(elements.filter(el => el.id !== id));
    setSelectedElement(null);
  }, [elements]);

  // Duplicate element
  const duplicateElement = useCallback((id: string) => {
    const element = elements.find(el => el.id === id);
    if (!element) return;

    const newElement: CanvasElement = {
      ...element,
      id: `element-${Date.now()}`,
      x: element.x + 20,
      y: element.y + 20,
    };

    setElements([...elements, newElement]);
    setSelectedElement(newElement.id);
  }, [elements]);

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent, elementId?: string) => {
    if (options.lockElements || tool !== 'select') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (elementId) {
      const element = elements.find(el => el.id === elementId);
      if (!element || element.locked) return;

      setDragState({
        isDragging: true,
        elementId,
        startX: x,
        startY: y,
        offsetX: x - element.x,
        offsetY: y - element.y,
      });
      setSelectedElement(elementId);
    } else if (tool !== 'select') {
      // Add new element
      addElement(tool as CanvasElement['type'], x, y);
      setTool('select');
    }
  }, [tool, elements, options.lockElements, addElement]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.isDragging || !dragState.elementId) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    updateElement(dragState.elementId, {
      x: snapToGrid(x - dragState.offsetX),
      y: snapToGrid(y - dragState.offsetY),
    });
  }, [dragState, updateElement, snapToGrid]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setDragState({
      isDragging: false,
      elementId: null,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0,
    });
  }, []);

  // Render element
  const renderElement = useCallback((element: CanvasElement) => {
    const value = getFieldValue(element.data?.field);
    const text = element.data?.text ? replaceVariables(element.data.text) : '';

    switch (element.type) {
      case 'text':
        return (
          <div
            style={{
              fontSize: element.style?.fontSize,
              fontWeight: element.style?.fontWeight,
              textAlign: element.style?.textAlign,
              color: element.style?.fill,
              opacity: element.style?.opacity,
            }}
          >
            {text}
          </div>
        );

      case 'rectangle':
        return (
          <div
            className="w-full h-full"
            style={{
              backgroundColor: element.style?.fill,
              border: `${element.style?.strokeWidth}px solid ${element.style?.stroke}`,
              opacity: element.style?.opacity,
            }}
          />
        );

      case 'circle':
        return (
          <div
            className="w-full h-full rounded-full"
            style={{
              backgroundColor: element.style?.fill,
              border: `${element.style?.strokeWidth}px solid ${element.style?.stroke}`,
              opacity: element.style?.opacity,
            }}
          />
        );

      case 'image':
        return element.data?.src ? (
          <img
            src={replaceVariables(element.data.src)}
            alt=""
            className="w-full h-full object-contain"
            style={{ opacity: element.style?.opacity }}
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <Image className="w-8 h-8 text-gray-400" />
          </div>
        );

      case 'metric':
        return (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              fontSize: element.style?.fontSize,
              fontWeight: element.style?.fontWeight,
              color: element.style?.fill,
              opacity: element.style?.opacity,
            }}
          >
            {value !== null ? (
              <span>{element.data?.valueFormat ? 
                formatValue(value, element.data.valueFormat) : value}</span>
            ) : (
              <span className="text-gray-400">N/A</span>
            )}
          </div>
        );

      case 'gauge':
        return <GaugeElement element={element} value={value} />;

      case 'chart':
        return <MiniChart element={element} data={data} />;

      default:
        return null;
    }
  }, [getFieldValue, replaceVariables, data]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedElement) return;

      switch (e.key) {
        case 'Delete':
          deleteElement(selectedElement);
          break;
        case 'd':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            duplicateElement(selectedElement);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, deleteElement, duplicateElement]);

  return (
    <div className="flex h-full">
      {/* Toolbar */}
      {options.showToolbar !== false && (
        <div className="w-12 border-r bg-background p-2 space-y-2">
          <button
            onClick={() => setTool('select')}
            className={cn(
              'p-2 rounded hover:bg-accent',
              tool === 'select' && 'bg-accent'
            )}
            title="Select"
          >
            <Move className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('text')}
            className={cn(
              'p-2 rounded hover:bg-accent',
              tool === 'text' && 'bg-accent'
            )}
            title="Text"
          >
            <Type className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('rectangle')}
            className={cn(
              'p-2 rounded hover:bg-accent',
              tool === 'rectangle' && 'bg-accent'
            )}
            title="Rectangle"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('circle')}
            className={cn(
              'p-2 rounded hover:bg-accent',
              tool === 'circle' && 'bg-accent'
            )}
            title="Circle"
          >
            <Circle className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('image')}
            className={cn(
              'p-2 rounded hover:bg-accent',
              tool === 'image' && 'bg-accent'
            )}
            title="Image"
          >
            <Image className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('metric')}
            className={cn(
              'p-2 rounded hover:bg-accent',
              tool === 'metric' && 'bg-accent'
            )}
            title="Metric"
          >
            <span className="text-xs font-bold">123</span>
          </button>
          <button
            onClick={() => setTool('gauge')}
            className={cn(
              'p-2 rounded hover:bg-accent',
              tool === 'gauge' && 'bg-accent'
            )}
            title="Gauge"
          >
            <Gauge className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTool('chart')}
            className={cn(
              'p-2 rounded hover:bg-accent',
              tool === 'chart' && 'bg-accent'
            )}
            title="Chart"
          >
            <TrendingUp className="w-4 h-4" />
          </button>
          <div className="border-t pt-2">
            <button
              onClick={() => setShowLayers(!showLayers)}
              className="p-2 rounded hover:bg-accent"
              title="Layers"
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={canvasRef}
          className="absolute inset-0"
          style={{
            backgroundColor: options.background?.color,
            backgroundImage: options.background?.image ? 
              `url(${options.background.image})` : undefined,
            backgroundSize: options.background?.size,
            backgroundPosition: 'center',
            backgroundRepeat: options.background?.size === 'repeat' ? 'repeat' : 'no-repeat',
          }}
          onMouseDown={(e) => handleMouseDown(e)}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Grid */}
          {options.grid?.enabled && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ opacity: 0.1 }}
            >
              <defs>
                <pattern
                  id="grid"
                  width={options.grid.size || 10}
                  height={options.grid.size || 10}
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="1" cy="1" r="1" fill="currentColor" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          )}

          {/* Elements */}
          {elements
            .sort((a, b) => (a.layer || 0) - (b.layer || 0))
            .map(element => (
              <div
                key={element.id}
                className={cn(
                  'absolute cursor-move select-none',
                  selectedElement === element.id && 'ring-2 ring-primary',
                  element.locked && 'cursor-not-allowed'
                )}
                style={{
                  left: element.x,
                  top: element.y,
                  width: element.width,
                  height: element.height,
                  transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleMouseDown(e, element.id);
                }}
              >
                {renderElement(element)}
                
                {/* Resize handles */}
                {selectedElement === element.id && !element.locked && (
                  <>
                    <div className="absolute -right-1 -bottom-1 w-3 h-3 bg-primary rounded-full cursor-se-resize" />
                    <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full cursor-e-resize" />
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full cursor-s-resize" />
                  </>
                )}
              </div>
            ))}
        </div>

        {/* Properties panel */}
        {selectedElement && (
          <div className="absolute top-2 right-2 w-64 bg-background border rounded-lg shadow-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Properties</h3>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    const element = elements.find(el => el.id === selectedElement);
                    if (element) {
                      updateElement(selectedElement, { locked: !element.locked });
                    }
                  }}
                  className="p-1 hover:bg-accent rounded"
                >
                  {elements.find(el => el.id === selectedElement)?.locked ? 
                    <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => duplicateElement(selectedElement)}
                  className="p-1 hover:bg-accent rounded"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteElement(selectedElement)}
                  className="p-1 hover:bg-accent rounded text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Element-specific properties would go here */}
          </div>
        )}

        {/* Layers panel */}
        {showLayers && (
          <div className="absolute bottom-2 left-2 w-64 bg-background border rounded-lg shadow-lg p-4">
            <h3 className="font-semibold mb-2">Layers</h3>
            <div className="space-y-1">
              {elements
                .sort((a, b) => (b.layer || 0) - (a.layer || 0))
                .map(element => (
                  <div
                    key={element.id}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent',
                      selectedElement === element.id && 'bg-accent'
                    )}
                    onClick={() => setSelectedElement(element.id)}
                  >
                    <span className="text-xs text-muted-foreground">
                      {element.type}
                    </span>
                    <span className="flex-1 truncate text-sm">
                      {element.data?.text || element.id}
                    </span>
                    {element.locked && <Lock className="w-3 h-3" />}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper components
const GaugeElement: React.FC<{ element: CanvasElement; value: any }> = ({ element, value }) => {
  const percentage = value !== null ? Math.min(100, Math.max(0, value)) : 0;
  const radius = Math.min(element.width, element.height) / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={element.width} height={element.height}>
      <circle
        cx={element.width / 2}
        cy={element.height / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="8"
      />
      <circle
        cx={element.width / 2}
        cy={element.height / 2}
        r={radius}
        fill="none"
        stroke={element.style?.fill || '#3b82f6'}
        strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        transform={`rotate(-90 ${element.width / 2} ${element.height / 2})`}
      />
      <text
        x={element.width / 2}
        y={element.height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={element.style?.fontSize || 16}
        fill={element.style?.fill || '#3b82f6'}
      >
        {value !== null ? `${Math.round(percentage)}%` : 'N/A'}
      </text>
    </svg>
  );
};

const MiniChart: React.FC<{ element: CanvasElement; data: PanelProps['data'] }> = ({ element, data }) => {
  // Simplified chart rendering
  return (
    <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center">
      <TrendingUp className="w-8 h-8 text-gray-400" />
    </div>
  );
};

// Value formatter
const formatValue = (value: any, format: string): string => {
  // Implement value formatting based on format string
  return String(value);
};

export default CanvasPanel;