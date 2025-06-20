/**
 * Node Graph Panel - Grafana-compatible node graph visualization
 * Displays process flows, dependencies, and relationships
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { PanelProps, LoadingState, DataFrame } from '@/core/plugins/types';
import { Network, ZoomIn, ZoomOut, Maximize2, Move, Download } from 'lucide-react';
import * as d3 from 'd3';

export interface NodeGraphPanelOptions {
  nodes?: {
    mainStat?: string;
    secondaryStat?: string;
    arc?: {
      field?: string;
      mode?: 'forward' | 'backward' | 'both';
    };
    color?: {
      mode?: 'fixed' | 'field' | 'threshold';
      fixedColor?: string;
      field?: string;
    };
  };
  edges?: {
    mainStat?: string;
    secondaryStat?: string;
    color?: {
      mode?: 'fixed' | 'field' | 'threshold';
      fixedColor?: string;
      field?: string;
    };
  };
  layout?: {
    type?: 'force' | 'grid' | 'circular' | 'hierarchical';
    nodeDistance?: number;
    chargeStrength?: number;
  };
  display?: {
    showGrid?: boolean;
    showLegend?: boolean;
    showMiniMap?: boolean;
  };
}

interface Node {
  id: string;
  label?: string;
  mainStat?: number | string;
  secondaryStat?: number | string;
  arc?: number;
  color?: string;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

interface Edge {
  source: string;
  target: string;
  mainStat?: number | string;
  secondaryStat?: number | string;
  color?: string;
}

const NodeGraphPanel: React.FC<PanelProps<NodeGraphPanelOptions>> = ({
  data,
  options,
  width,
  height,
  timeRange,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Parse graph data from data frames
  const graphData = useMemo(() => {
    if (!data.series || data.series.length === 0) {
      return { nodes: [], edges: [] };
    }

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const nodeMap = new Map<string, Node>();

    // Process each frame
    data.series.forEach(frame => {
      // Check if this is a nodes frame
      const idField = frame.fields.find(f => f.name === 'id');
      const sourceField = frame.fields.find(f => f.name === 'source');
      const targetField = frame.fields.find(f => f.name === 'target');

      if (idField) {
        // This is a nodes frame
        for (let i = 0; i < frame.length; i++) {
          const node: Node = {
            id: idField.values.get(i),
            label: frame.fields.find(f => f.name === 'label')?.values.get(i),
            mainStat: frame.fields.find(f => f.name === options.nodes?.mainStat)?.values.get(i),
            secondaryStat: frame.fields.find(f => f.name === options.nodes?.secondaryStat)?.values.get(i),
            arc: frame.fields.find(f => f.name === options.nodes?.arc?.field)?.values.get(i),
          };

          // Apply color based on mode
          if (options.nodes?.color?.mode === 'fixed') {
            node.color = options.nodes.color.fixedColor || '#3b82f6';
          } else if (options.nodes?.color?.mode === 'field' && options.nodes.color.field) {
            const colorValue = frame.fields.find(f => f.name === options.nodes.color?.field)?.values.get(i);
            node.color = getColorForValue(colorValue);
          }

          nodes.push(node);
          nodeMap.set(node.id, node);
        }
      } else if (sourceField && targetField) {
        // This is an edges frame
        for (let i = 0; i < frame.length; i++) {
          const edge: Edge = {
            source: sourceField.values.get(i),
            target: targetField.values.get(i),
            mainStat: frame.fields.find(f => f.name === options.edges?.mainStat)?.values.get(i),
            secondaryStat: frame.fields.find(f => f.name === options.edges?.secondaryStat)?.values.get(i),
          };

          // Apply edge color
          if (options.edges?.color?.mode === 'fixed') {
            edge.color = options.edges.color.fixedColor || '#6b7280';
          }

          edges.push(edge);
        }
      }
    });

    return { nodes, edges };
  }, [data.series, options]);

  // Initialize and update D3 visualization
  useEffect(() => {
    if (!svgRef.current || graphData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Setup zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setTransform(event.transform);
      });

    svg.call(zoom);

    // Create force simulation
    const simulation = d3.forceSimulation<Node>(graphData.nodes)
      .force('link', d3.forceLink<Node, Edge>(graphData.edges)
        .id(d => d.id)
        .distance(options.layout?.nodeDistance || 100))
      .force('charge', d3.forceManyBody()
        .strength(options.layout?.chargeStrength || -300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Add grid if enabled
    if (options.display?.showGrid) {
      const gridSize = 50;
      const gridG = g.append('g').attr('class', 'grid');

      // Vertical lines
      for (let x = 0; x <= width; x += gridSize) {
        gridG.append('line')
          .attr('x1', x)
          .attr('y1', 0)
          .attr('x2', x)
          .attr('y2', height)
          .attr('stroke', 'currentColor')
          .attr('stroke-opacity', 0.1);
      }

      // Horizontal lines
      for (let y = 0; y <= height; y += gridSize) {
        gridG.append('line')
          .attr('x1', 0)
          .attr('y1', y)
          .attr('x2', width)
          .attr('y2', y)
          .attr('stroke', 'currentColor')
          .attr('stroke-opacity', 0.1);
      }
    }

    // Add edges
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(graphData.edges)
      .enter().append('line')
      .attr('stroke', d => d.color || '#6b7280')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)');

    // Add edge labels
    const linkLabel = g.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(graphData.edges)
      .enter().append('text')
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', 'currentColor')
      .attr('opacity', 0.7)
      .text(d => d.mainStat?.toString() || '');

    // Add nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(graphData.nodes)
      .enter().append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Node circles
    node.append('circle')
      .attr('r', 20)
      .attr('fill', d => d.color || '#3b82f6')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Arc indicator
    node.each(function(d) {
      if (d.arc !== undefined && options.nodes?.arc?.field) {
        const arcValue = Math.min(Math.max(d.arc, 0), 1);
        const arcPath = d3.arc()
          .innerRadius(18)
          .outerRadius(22)
          .startAngle(0)
          .endAngle(arcValue * 2 * Math.PI);

        d3.select(this).append('path')
          .attr('d', arcPath as any)
          .attr('fill', '#10b981')
          .attr('opacity', 0.8);
      }
    });

    // Node labels
    node.append('text')
      .attr('dy', '.35em')
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', 'white')
      .attr('font-weight', 'bold')
      .text(d => d.label || d.id);

    // Node stats
    node.append('text')
      .attr('dy', '35px')
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', 'currentColor')
      .text(d => d.mainStat?.toString() || '');

    // Add arrow marker
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', '#6b7280')
      .attr('d', 'M0,-5L10,0L0,5');

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as any).x)
        .attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x)
        .attr('y2', d => (d.target as any).y);

      linkLabel
        .attr('x', d => ((d.source as any).x + (d.target as any).x) / 2)
        .attr('y', d => ((d.source as any).y + (d.target as any).y) / 2);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
      setIsDragging(true);
    }

    function dragged(event: any, d: Node) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
      setIsDragging(false);
    }

    // Click handler
    node.on('click', (event, d) => {
      setSelectedNode(d.id === selectedNode ? null : d.id);
    });

    return () => {
      simulation.stop();
    };
  }, [graphData, width, height, options, selectedNode]);

  const handleZoomIn = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      1.3
    );
  };

  const handleZoomOut = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      0.7
    );
  };

  const handleZoomReset = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().transform as any,
      d3.zoomIdentity
    );
  };

  const handleExport = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'node-graph.svg';
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

  if (graphData.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <Network className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No graph data available</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-full bg-background">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full h-full"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      />

      {/* Controls */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 bg-background/90 backdrop-blur rounded-md shadow-md p-1">
        <button
          onClick={handleZoomIn}
          className="p-1.5 hover:bg-accent rounded"
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 hover:bg-accent rounded"
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={handleZoomReset}
          className="p-1.5 hover:bg-accent rounded"
          title="Reset zoom"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <div className="border-t my-1" />
        <button
          onClick={handleExport}
          className="p-1.5 hover:bg-accent rounded"
          title="Export SVG"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur rounded-md shadow-md p-2 text-sm">
        <div>Nodes: {graphData.nodes.length}</div>
        <div>Edges: {graphData.edges.length}</div>
        {selectedNode && (
          <div className="mt-1 pt-1 border-t">
            Selected: {selectedNode}
          </div>
        )}
      </div>

      {/* Legend */}
      {options.display?.showLegend && (
        <div className="absolute top-2 left-2 bg-background/90 backdrop-blur rounded-md shadow-md p-2">
          <div className="text-xs font-medium mb-1">Legend</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-xs">Node</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-muted-foreground" />
              <span className="text-xs">Edge</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get color for value
function getColorForValue(value: any): string {
  // Simple color mapping - can be extended
  if (typeof value === 'number') {
    if (value > 0.8) return '#ef4444'; // red
    if (value > 0.6) return '#f59e0b'; // yellow
    if (value > 0.4) return '#3b82f6'; // blue
    return '#10b981'; // green
  }
  return '#6b7280'; // gray
}

export default NodeGraphPanel;