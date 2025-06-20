/**
 * Geomap Panel - Grafana-compatible geographic visualization
 * Displays facility locations, equipment distribution, and geographic metrics
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { PanelProps, LoadingState } from '@/core/plugins/types';
import { Map, Layers, ZoomIn, ZoomOut, Maximize2, Navigation } from 'lucide-react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface GeomapPanelOptions {
  view: {
    id: string;
    lat: number;
    lon: number;
    zoom: number;
  };
  controls: {
    showZoom?: boolean;
    showToolbar?: boolean;
    showScale?: boolean;
    showAttribution?: boolean;
    mouseWheelZoom?: boolean;
  };
  basemap: {
    type: 'default' | 'carto-light' | 'carto-dark' | 'osm' | 'satellite';
    config?: Record<string, any>;
  };
  layers: Array<{
    type: 'markers' | 'heatmap' | 'route' | 'geojson';
    config: {
      size?: number;
      color?: string;
      opacity?: number;
      weight?: number;
      fillColor?: string;
      fillOpacity?: number;
    };
  }>;
  tooltip?: {
    mode: 'none' | 'details' | 'custom';
    displayTextOrVar?: string;
  };
}

// Fix Leaflet icon issue with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

const GeomapPanel: React.FC<PanelProps<GeomapPanelOptions>> = ({
  data,
  options,
  width,
  height,
  timeRange,
  replaceVariables,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const markersLayer = useRef<L.LayerGroup | null>(null);

  // Parse location data from data frames
  const locations = useMemo(() => {
    if (!data.series || data.series.length === 0) return [];

    const points: Array<{
      lat: number;
      lon: number;
      name?: string;
      value?: number;
      metadata?: Record<string, any>;
    }> = [];

    data.series.forEach(frame => {
      const latField = frame.fields.find(f => 
        f.name.toLowerCase().includes('lat') || 
        f.name.toLowerCase().includes('latitude')
      );
      const lonField = frame.fields.find(f => 
        f.name.toLowerCase().includes('lon') || 
        f.name.toLowerCase().includes('lng') || 
        f.name.toLowerCase().includes('longitude')
      );
      const nameField = frame.fields.find(f => 
        f.name.toLowerCase().includes('name') || 
        f.name.toLowerCase().includes('location')
      );
      const valueField = frame.fields.find(f => 
        f.type === 'number' && 
        !f.name.toLowerCase().includes('lat') && 
        !f.name.toLowerCase().includes('lon')
      );

      if (latField && lonField) {
        for (let i = 0; i < frame.length; i++) {
          const lat = latField.values.get(i);
          const lon = lonField.values.get(i);
          
          if (typeof lat === 'number' && typeof lon === 'number') {
            points.push({
              lat,
              lon,
              name: nameField?.values.get(i),
              value: valueField?.values.get(i),
              metadata: frame.fields.reduce((acc, field) => {
                acc[field.name] = field.values.get(i);
                return acc;
              }, {} as Record<string, any>),
            });
          }
        }
      }
    });

    return points;
  }, [data.series]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const map = L.map(mapContainer.current, {
      center: [options.view.lat, options.view.lon],
      zoom: options.view.zoom,
      zoomControl: false,
      scrollWheelZoom: options.controls.mouseWheelZoom !== false,
    });

    // Add basemap
    const basemapUrl = getBasemapUrl(options.basemap.type);
    L.tileLayer(basemapUrl, {
      attribution: options.controls.showAttribution !== false ? 
        '© OpenStreetMap contributors' : '',
      ...options.basemap.config,
    }).addTo(map);

    // Add zoom control if enabled
    if (options.controls.showZoom !== false) {
      L.control.zoom({ position: 'topright' }).addTo(map);
    }

    // Add scale if enabled
    if (options.controls.showScale) {
      L.control.scale({ position: 'bottomleft' }).addTo(map);
    }

    // Create markers layer
    markersLayer.current = L.layerGroup().addTo(map);

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update map view
  useEffect(() => {
    if (mapInstance.current) {
      mapInstance.current.setView([options.view.lat, options.view.lon], options.view.zoom);
    }
  }, [options.view]);

  // Update markers
  useEffect(() => {
    if (!mapInstance.current || !markersLayer.current) return;

    // Clear existing markers
    markersLayer.current.clearLayers();

    // Add new markers
    locations.forEach(location => {
      const marker = createMarker(location, options.layers[0]?.config);
      
      // Add tooltip
      if (options.tooltip?.mode !== 'none') {
        const tooltipContent = getTooltipContent(location, options.tooltip);
        marker.bindTooltip(tooltipContent, {
          permanent: false,
          direction: 'top',
        });
      }

      marker.addTo(markersLayer.current!);
    });

    // Fit bounds if we have markers
    if (locations.length > 0) {
      const bounds = L.latLngBounds(locations.map(loc => [loc.lat, loc.lon]));
      mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [locations, options.layers, options.tooltip]);

  // Handle resize
  useEffect(() => {
    if (mapInstance.current) {
      setTimeout(() => {
        mapInstance.current?.invalidateSize();
      }, 100);
    }
  }, [width, height]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!mapContainer.current) return;

    if (!isFullscreen) {
      mapContainer.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  if (data.state === LoadingState.Loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* Map container */}
      <div 
        ref={mapContainer} 
        className="h-full w-full"
        style={{ backgroundColor: '#f0f0f0' }}
      />

      {/* Toolbar */}
      {options.controls.showToolbar !== false && (
        <div className="absolute top-2 left-2 flex gap-1 bg-background/90 backdrop-blur rounded-md shadow-md p-1">
          <button
            onClick={() => mapInstance.current?.setZoom(mapInstance.current.getZoom() + 1)}
            className="p-1.5 hover:bg-accent rounded"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => mapInstance.current?.setZoom(mapInstance.current.getZoom() - 1)}
            className="p-1.5 hover:bg-accent rounded"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-accent rounded"
            title="Fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              if (locations.length > 0) {
                const bounds = L.latLngBounds(locations.map(loc => [loc.lat, loc.lon]));
                mapInstance.current?.fitBounds(bounds, { padding: [50, 50] });
              }
            }}
            className="p-1.5 hover:bg-accent rounded"
            title="Fit to data"
          >
            <Navigation className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Legend */}
      {locations.length > 0 && (
        <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur rounded-md shadow-md p-2">
          <div className="text-xs font-medium mb-1">Locations</div>
          <div className="text-sm">{locations.length} points</div>
        </div>
      )}

      {/* No data message */}
      {locations.length === 0 && data.state === LoadingState.Done && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-muted-foreground">
            <Map className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No location data</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions
function getBasemapUrl(type: GeomapPanelOptions['basemap']['type']): string {
  switch (type) {
    case 'carto-light':
      return 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
    case 'carto-dark':
      return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
    case 'satellite':
      return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    case 'osm':
    case 'default':
    default:
      return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  }
}

function createMarker(
  location: any,
  config?: GeomapPanelOptions['layers'][0]['config']
): L.Marker {
  const icon = L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: ${config?.size || 20}px;
        height: ${config?.size || 20}px;
        background-color: ${config?.fillColor || '#3b82f6'};
        border: 2px solid ${config?.color || '#1e40af'};
        border-radius: 50%;
        opacity: ${config?.opacity || 1};
      "></div>
    `,
    iconSize: [(config?.size || 20) + 4, (config?.size || 20) + 4],
    iconAnchor: [(config?.size || 20) / 2 + 2, (config?.size || 20) / 2 + 2],
  });

  return L.marker([location.lat, location.lon], { icon });
}

function getTooltipContent(
  location: any,
  tooltipConfig?: GeomapPanelOptions['tooltip']
): string {
  if (tooltipConfig?.mode === 'custom' && tooltipConfig.displayTextOrVar) {
    return tooltipConfig.displayTextOrVar;
  }

  const parts: string[] = [];
  
  if (location.name) {
    parts.push(`<strong>${location.name}</strong>`);
  }
  
  if (location.value !== undefined) {
    parts.push(`Value: ${location.value}`);
  }
  
  parts.push(`Lat: ${location.lat.toFixed(6)}`);
  parts.push(`Lon: ${location.lon.toFixed(6)}`);

  return parts.join('<br>');
}

export default GeomapPanel;