/**
 * Worldmap Panel - Grafana-compatible world map visualization
 * Displays global data with country/region mapping and heat visualization
 * Useful for showing global operations, distribution, and geographic metrics
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { PanelProps, LoadingState } from '@/core/plugins/types';
import { Globe, MapPin, Info } from 'lucide-react';
import * as d3 from 'd3';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { scaleSequential } from 'd3-scale';
import { interpolateBlues, interpolateReds, interpolateGreens, interpolateViridis } from 'd3-scale-chromatic';

export interface WorldmapPanelOptions {
  map: {
    center: {
      lat: number;
      lon: number;
    };
    zoom: number;
  };
  circleOptions: {
    minSize: number;
    maxSize: number;
    hideEmpty: boolean;
    sizeByValue: boolean;
  };
  colors: {
    mode: 'threshold' | 'gradient';
    cardColor: string;
    colorScale: 'blues' | 'reds' | 'greens' | 'viridis';
    min: number;
    max: number;
  };
  locationData: {
    mode: 'countries' | 'states' | 'coordinates';
    valueField?: string;
    latField?: string;
    lonField?: string;
    geoIdField?: string;
  };
  showLegend: boolean;
  unitSingular?: string;
  unitPlural?: string;
  hideZero: boolean;
  stickyLabels: boolean;
  tableQueryOptions: {
    queryType: 'geohash' | 'coordinates' | 'countries';
  };
}

interface MapLocation {
  id: string;
  name: string;
  value: number;
  lat?: number;
  lon?: number;
  coordinates?: [number, number][];
}

const WorldmapPanel: React.FC<PanelProps<WorldmapPanelOptions>> = ({
  data,
  options,
  width,
  height,
  timeRange,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [worldData, setWorldData] = useState<any>(null);
  const [hoveredLocation, setHoveredLocation] = useState<MapLocation | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Load world topology data
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(response => response.json())
      .then(data => setWorldData(data))
      .catch(err => console.error('Failed to load world map data:', err));
  }, []);

  // Process data
  const locations = useMemo(() => {
    if (!data.series || data.series.length === 0) return [];

    const locationMap = new Map<string, MapLocation>();
    
    data.series.forEach(frame => {
      const valueField = frame.fields.find(f => 
        f.name === options.locationData.valueField ||
        f.type === 'number'
      );
      
      if (options.locationData.mode === 'coordinates') {
        const latField = frame.fields.find(f => 
          f.name === options.locationData.latField ||
          f.name.toLowerCase().includes('lat')
        );
        const lonField = frame.fields.find(f => 
          f.name === options.locationData.lonField ||
          f.name.toLowerCase().includes('lon')
        );
        const nameField = frame.fields.find(f => 
          f.type === 'string' && !f.name.toLowerCase().includes('time')
        );

        if (latField && lonField && valueField) {
          for (let i = 0; i < frame.length; i++) {
            const lat = latField.values.get(i);
            const lon = lonField.values.get(i);
            const value = valueField.values.get(i);
            const name = nameField?.values.get(i) || `Location ${i + 1}`;

            if (typeof lat === 'number' && typeof lon === 'number' && typeof value === 'number') {
              locationMap.set(name, { id: name, name, value, lat, lon });
            }
          }
        }
      } else if (options.locationData.mode === 'countries') {
        const geoIdField = frame.fields.find(f => 
          f.name === options.locationData.geoIdField ||
          f.name.toLowerCase().includes('country') ||
          f.name.toLowerCase().includes('code')
        );

        if (geoIdField && valueField) {
          for (let i = 0; i < frame.length; i++) {
            const geoId = geoIdField.values.get(i);
            const value = valueField.values.get(i);

            if (geoId && typeof value === 'number') {
              locationMap.set(geoId, { id: geoId, name: geoId, value });
            }
          }
        }
      }
    });

    return Array.from(locationMap.values());
  }, [data.series, options.locationData]);

  // Get color scale
  const colorScale = useMemo(() => {
    const values = locations.map(l => l.value).filter(v => !isNaN(v));
    const min = options.colors.min ?? Math.min(...values);
    const max = options.colors.max ?? Math.max(...values);

    let interpolator;
    switch (options.colors.colorScale) {
      case 'reds':
        interpolator = interpolateReds;
        break;
      case 'greens':
        interpolator = interpolateGreens;
        break;
      case 'viridis':
        interpolator = interpolateViridis;
        break;
      case 'blues':
      default:
        interpolator = interpolateBlues;
        break;
    }

    return scaleSequential(interpolator).domain([min, max]);
  }, [locations, options.colors]);

  // Render map
  useEffect(() => {
    if (!svgRef.current || !worldData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const projection = geoNaturalEarth1()
      .scale(width / 6.5)
      .translate([width / 2, height / 2])
      .center([options.map.center.lon, options.map.center.lat]);

    const pathGenerator = geoPath().projection(projection);

    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    svg.call(zoom.scaleTo, options.map.zoom);

    // Draw countries
    const countries = feature(worldData, worldData.objects.countries);
    
    g.append('g')
      .selectAll('path')
      .data((countries as any).features)
      .enter()
      .append('path')
      .attr('d', pathGenerator as any)
      .attr('fill', (d: any) => {
        if (options.locationData.mode === 'countries') {
          const location = locations.find(l => 
            l.id === d.properties.NAME ||
            l.id === d.properties.ISO_A2 ||
            l.id === d.properties.ISO_A3
          );
          if (location) {
            return colorScale(location.value);
          }
        }
        return '#e5e7eb';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .on('mouseenter', function(event, d: any) {
        const location = locations.find(l => 
          l.id === d.properties.NAME ||
          l.id === d.properties.ISO_A2 ||
          l.id === d.properties.ISO_A3
        );
        if (location) {
          setHoveredLocation(location);
          setTooltipPosition({ x: event.pageX, y: event.pageY });
          d3.select(this).attr('opacity', 0.8);
        }
      })
      .on('mouseleave', function() {
        setHoveredLocation(null);
        d3.select(this).attr('opacity', 1);
      });

    // Draw location circles for coordinate mode
    if (options.locationData.mode === 'coordinates') {
      const sizeScale = d3.scaleSqrt()
        .domain([0, Math.max(...locations.map(l => l.value))])
        .range([options.circleOptions.minSize, options.circleOptions.maxSize]);

      g.append('g')
        .selectAll('circle')
        .data(locations.filter(l => l.lat !== undefined && l.lon !== undefined))
        .enter()
        .append('circle')
        .attr('cx', d => projection([d.lon!, d.lat!])![0])
        .attr('cy', d => projection([d.lon!, d.lat!])![1])
        .attr('r', d => {
          if (options.circleOptions.sizeByValue) {
            return sizeScale(d.value);
          }
          return options.circleOptions.minSize;
        })
        .attr('fill', d => colorScale(d.value))
        .attr('fill-opacity', 0.7)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .on('mouseenter', function(event, d) {
          setHoveredLocation(d);
          setTooltipPosition({ x: event.pageX, y: event.pageY });
          d3.select(this).attr('fill-opacity', 1);
        })
        .on('mouseleave', function() {
          setHoveredLocation(null);
          d3.select(this).attr('fill-opacity', 0.7);
        });

      // Add labels if sticky labels enabled
      if (options.stickyLabels) {
        g.append('g')
          .selectAll('text')
          .data(locations.filter(l => l.lat !== undefined && l.lon !== undefined))
          .enter()
          .append('text')
          .attr('x', d => projection([d.lon!, d.lat!])![0])
          .attr('y', d => projection([d.lon!, d.lat!])![1])
          .attr('dy', -10)
          .attr('text-anchor', 'middle')
          .attr('font-size', '12px')
          .attr('fill', 'currentColor')
          .text(d => d.name);
      }
    }
  }, [worldData, locations, options, width, height, colorScale]);

  if (data.state === LoadingState.Loading || !worldData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full h-full"
        style={{ cursor: 'grab' }}
      />

      {/* Tooltip */}
      {hoveredLocation && (
        <div
          className="absolute z-10 bg-background border rounded shadow-lg p-3 pointer-events-none"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 10,
            transform: 'translate(-100%, -100%)',
          }}
        >
          <div className="font-medium">{hoveredLocation.name}</div>
          <div className="text-sm mt-1">
            {hoveredLocation.value.toLocaleString()} {hoveredLocation.value === 1 ? options.unitSingular : options.unitPlural}
          </div>
        </div>
      )}

      {/* Legend */}
      {options.showLegend && (
        <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur rounded-lg shadow-md p-3">
          <div className="text-sm font-medium mb-2">Legend</div>
          <div className="flex items-center gap-2">
            <div className="w-32 h-4 rounded" style={{
              background: `linear-gradient(to right, ${colorScale.range().join(', ')})`
            }} />
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span>{colorScale.domain()[0].toFixed(0)}</span>
            <span>{colorScale.domain()[1].toFixed(0)}</span>
          </div>
        </div>
      )}

      {/* No data message */}
      {locations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-muted-foreground">
            <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No location data available</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorldmapPanel;