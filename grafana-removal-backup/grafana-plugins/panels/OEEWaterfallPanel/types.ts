// OEE Waterfall Panel Types - Apache 2.0 License

export interface OEEWaterfallOptions {
  equipmentId: string;
  targetOEE: number;
  targetAvailability: number;
  targetPerformance: number;
  targetQuality: number;
  colors: {
    availability: string;
    performance: string;
    quality: string;
    oee: string;
  };
  showTargetLine: boolean;
  showValues: boolean;
  timeRange: string;
}

export interface OEEData {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  timestamp: string;
  equipmentId: string;
}

export interface WaterfallDataPoint {
  category: string;
  value: number;
  cumulative: number;
  color: string;
  target?: number;
}

export const DEFAULT_OPTIONS: Partial<OEEWaterfallOptions> = {
  equipmentId: '',
  targetOEE: 85,
  targetAvailability: 90,
  targetPerformance: 95,
  targetQuality: 99,
  colors: {
    availability: '#73BF69',
    performance: '#FADE2A',
    quality: '#FF9830',
    oee: '#F2495C',
  },
  showTargetLine: true,
  showValues: true,
  timeRange: '1h',
};