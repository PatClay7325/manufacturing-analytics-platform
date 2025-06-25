/**
 * Flame Graph Panel - Analytics-compatible flame graph visualization
 * Shows hierarchical performance data, execution traces, and manufacturing process stacks
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { PanelProps, LoadingState } from '@/core/plugins/types';
import { Activity, Search, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import * as d3 from 'd3';

export interface FlameGraphPanelOptions {
  groupBy?: string[];
  minWidth?: number;
  showLabels?: boolean;
  showTooltip?: boolean;
  colorMode?: 'value' | 'name' | 'random';
  heightMode?: 'fixed' | 'relative';
  maxDepth?: number;
  searchHighlight?: boolean;
  inverted?: boolean;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
}

interface FlameNode {
  name: string;
  value: number;
  self: number;
  children: FlameNode[];
  parent?: FlameNode;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  depth: number;
  color?: string;
}

const FlameGraphPanel: React.FC<PanelProps<FlameGraphPanelOptions>> = ({
  data,
  options,
  width,
  height,
  timeRange,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoomedNode, setZoomedNode] = useState<FlameNode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredNode, setHoveredNode] = useState<FlameNode | null>(null);

  // Process data into flame graph structure
  const flameData = useMemo(() => {
    if (!data.series || data.series.length === 0) return null;

    // Find relevant fields
    const frame = data.series[0];
    const nameField = frame.fields.find(f => 
      f.name.toLowerCase().includes('name') || 
      f.name.toLowerCase().includes('function') ||
      f.name.toLowerCase().includes('process')
    );
    const valueField = frame.fields.find(f => 
      f.name.toLowerCase().includes('value') || 
      f.name.toLowerCase().includes('time') ||
      f.name.toLowerCase().includes('duration') ||
      f.type === 'number'
    );
    const parentField = frame.fields.find(f => 
      f.name.toLowerCase().includes('parent') ||
      f.name.toLowerCase().includes('caller')
    );

    if (!nameField || !valueField) {
      // Generate mock manufacturing flame graph data
      return createMockFlameData();
    }

    // Build hierarchy from data
    const nodes = new Map<string, FlameNode>();
    const root: FlameNode = {
      name: 'root',
      value: 0,
      self: 0,
      children: [],
      x0: 0, x1: 0, y0: 0, y1: 0,
      depth: 0
    };
    nodes.set('root', root);

    // First pass: create all nodes
    for (let i = 0; i < frame.length; i++) {
      const name = nameField.values.get(i);
      const value = valueField.values.get(i) || 0;
      const parent = parentField?.values.get(i) || 'root';

      if (!nodes.has(name)) {
        nodes.set(name, {
          name,
          value,
          self: value,
          children: [],
          x0: 0, x1: 0, y0: 0, y1: 0,
          depth: 0
        });
      }
    }

    // Second pass: build hierarchy
    for (let i = 0; i < frame.length; i++) {
      const name = nameField.values.get(i);
      const parent = parentField?.values.get(i) || 'root';
      
      const node = nodes.get(name);
      const parentNode = nodes.get(parent);

      if (node && parentNode && node !== parentNode) {
        node.parent = parentNode;
        parentNode.children.push(node);
        node.depth = parentNode.depth + 1;
      }
    }

    // Calculate cumulative values
    calculateValues(root);
    
    return root;
  }, [data.series]);

  // Calculate layout
  const layout = useMemo(() => {
    if (!flameData) return null;

    const marginTop = options.marginTop || 10;
    const marginBottom = options.marginBottom || 10;
    const marginLeft = options.marginLeft || 10;
    const marginRight = options.marginRight || 10;

    const chartWidth = width - marginLeft - marginRight;
    const chartHeight = height - marginTop - marginBottom;

    // Calculate positions
    const maxDepth = getMaxDepth(flameData);
    const rowHeight = Math.max(16, chartHeight / (maxDepth + 1));

    const rootNode = zoomedNode || flameData;
    const scale = chartWidth / rootNode.value;

    // Position nodes
    positionNodes(rootNode, 0, chartWidth, 0, rowHeight, scale);

    return {
      chartWidth,
      chartHeight,
      marginTop,
      marginLeft,
      rowHeight,
      scale,
      maxDepth
    };
  }, [flameData, zoomedNode, width, height, options]);

  // Render flame graph
  useEffect(() => {
    if (!svgRef.current || !flameData || !layout) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g')
      .attr('transform', `translate(${layout.marginLeft}, ${layout.marginTop})`);

    // Create color scale
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Render rectangles
    const nodes = getAllNodes(zoomedNode || flameData);
    const visibleNodes = nodes.filter(d => 
      d.x1 - d.x0 >= (options.minWidth || 1) && 
      d.y0 >= 0 && 
      d.y0 < layout.chartHeight
    );

    const rects = g.selectAll('rect')
      .data(visibleNodes)
      .enter()
      .append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', layout.rowHeight - 1)
      .attr('fill', d => {
        if (options.colorMode === 'value') {
          return d3.interpolateViridis(d.value / flameData.value);
        } else if (options.colorMode === 'name') {
          return colorScale(d.name);
        }
        return colorScale(d.name);
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .style('cursor', 'pointer')
      .style('opacity', d => 
        searchTerm && !d.name.toLowerCase().includes(searchTerm.toLowerCase()) ? 0.3 : 1
      );

    // Add labels
    if (options.showLabels !== false) {
      g.selectAll('text')
        .data(visibleNodes.filter(d => d.x1 - d.x0 > 50))
        .enter()
        .append('text')
        .attr('x', d => d.x0 + 4)
        .attr('y', d => d.y0 + layout.rowHeight / 2 + 4)
        .attr('font-size', '12px')
        .attr('fill', 'white')
        .attr('pointer-events', 'none')
        .text(d => {
          const availableWidth = d.x1 - d.x0 - 8;
          const charWidth = 7;
          const maxChars = Math.floor(availableWidth / charWidth);
          return d.name.length > maxChars ? 
            d.name.substring(0, maxChars - 3) + '...' : 
            d.name;
        });
    }

    // Add click handlers
    rects.on('click', (event, d) => {
      setZoomedNode(d === zoomedNode ? d.parent || null : d);
    });

    // Add hover handlers
    if (options.showTooltip !== false) {
      rects.on('mouseover', (event, d) => {
        setHoveredNode(d);
      }).on('mouseout', () => {
        setHoveredNode(null);
      });
    }

  }, [flameData, layout, zoomedNode, searchTerm, options]);

  const handleReset = () => {
    setZoomedNode(null);
    setSearchTerm('');
  };

  const handleExport = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flame-graph.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (data.state === LoadingState.Loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!flameData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No flame graph data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full bg-background">
      {/* Controls */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2 bg-background/90 backdrop-blur rounded-md shadow-md p-2">
        <div className="flex items-center gap-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="w-32 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="border-l h-6" />
        <button
          onClick={handleReset}
          className="p-1 hover:bg-accent rounded"
          title="Reset zoom"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          onClick={handleExport}
          className="p-1 hover:bg-accent rounded"
          title="Export SVG"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>

      {/* Main SVG */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full h-full"
      />

      {/* Tooltip */}
      {hoveredNode && options.showTooltip !== false && (
        <div className="absolute pointer-events-none z-20 bg-background border rounded shadow-lg p-2 text-sm">
          <div className="font-medium">{hoveredNode.name}</div>
          <div className="text-xs text-muted-foreground">
            Value: {hoveredNode.value.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">
            Self: {hoveredNode.self.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">
            Depth: {hoveredNode.depth}
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      {zoomedNode && (
        <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur rounded-md shadow-md p-2">
          <div className="text-xs text-muted-foreground">Zoomed to:</div>
          <div className="font-medium">{zoomedNode.name}</div>
        </div>
      )}

      {/* Stats */}
      <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur rounded-md shadow-md p-2 text-xs">
        <div>Total Value: {flameData.value.toLocaleString()}</div>
        <div>Max Depth: {layout?.maxDepth}</div>
        {searchTerm && (
          <div>Search: "{searchTerm}"</div>
        )}
      </div>
    </div>
  );
};

// Helper functions
function createMockFlameData(): FlameNode {
  // Create mock manufacturing process flame graph
  const root: FlameNode = {
    name: 'Manufacturing Process',
    value: 10000,
    self: 100,
    children: [],
    x0: 0, x1: 0, y0: 0, y1: 0,
    depth: 0
  };

  const processes = [
    { name: 'Raw Material Processing', value: 3000, children: [
      { name: 'Material Inspection', value: 800 },
      { name: 'Material Preparation', value: 1200 },
      { name: 'Quality Check', value: 1000 }
    ]},
    { name: 'Production Line A', value: 4000, children: [
      { name: 'Setup Operations', value: 500 },
      { name: 'Main Processing', value: 2500, children: [
        { name: 'Cutting Operations', value: 800 },
        { name: 'Assembly Process', value: 1200 },
        { name: 'Welding Operations', value: 500 }
      ]},
      { name: 'Quality Control', value: 600 },
      { name: 'Packaging', value: 400 }
    ]},
    { name: 'Production Line B', value: 2500, children: [
      { name: 'Setup Operations', value: 300 },
      { name: 'Main Processing', value: 1800 },
      { name: 'Final Inspection', value: 400 }
    ]},
    { name: 'Finishing Operations', value: 500 }
  ];

  function addChildren(parent: FlameNode, processData: any[]) {
    processData.forEach(proc => {
      const child: FlameNode = {
        name: proc.name,
        value: proc.value,
        self: proc.children ? 0 : proc.value,
        children: [],
        parent,
        x0: 0, x1: 0, y0: 0, y1: 0,
        depth: parent.depth + 1
      };
      
      parent.children.push(child);
      
      if (proc.children) {
        addChildren(child, proc.children);
      }
    });
  }

  addChildren(root, processes);
  calculateValues(root);
  
  return root;
}

function calculateValues(node: FlameNode) {
  if (node.children.length === 0) {
    return node.value;
  }
  
  let childrenSum = 0;
  node.children.forEach(child => {
    childrenSum += calculateValues(child);
  });
  
  node.value = Math.max(node.self + childrenSum, node.value);
  return node.value;
}

function getMaxDepth(node: FlameNode): number {
  if (node.children.length === 0) return node.depth;
  return Math.max(...node.children.map(child => getMaxDepth(child)));
}

function positionNodes(
  node: FlameNode, 
  x0: number, 
  x1: number, 
  y: number, 
  rowHeight: number,
  scale: number
) {
  node.x0 = x0;
  node.x1 = x1;
  node.y0 = y;
  node.y1 = y + rowHeight;

  if (node.children.length === 0) return;

  let childX = x0;
  node.children.forEach(child => {
    const childWidth = (child.value / node.value) * (x1 - x0);
    positionNodes(child, childX, childX + childWidth, y + rowHeight, rowHeight, scale);
    childX += childWidth;
  });
}

function getAllNodes(node: FlameNode): FlameNode[] {
  const nodes = [node];
  node.children.forEach(child => {
    nodes.push(...getAllNodes(child));
  });
  return nodes;
}

export default FlameGraphPanel;