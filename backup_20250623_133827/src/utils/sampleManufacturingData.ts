/**
 * Sample Manufacturing Data for Testing
 * Provides realistic manufacturing metrics for dashboard testing
 */

import { TimeSeriesData } from '@/components/panels/SimpleTimeSeriesPanel';

export interface ManufacturingMetrics {
  oee: TimeSeriesData[];
  temperature: TimeSeriesData[];
  pressure: TimeSeriesData[];
  vibration: TimeSeriesData[];
  production: TimeSeriesData[];
}

export function generateSampleManufacturingData(): ManufacturingMetrics {
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;
  const dataPoints = 24; // 24 hours of data

  const oeeData: TimeSeriesData[] = [];
  const temperatureData: TimeSeriesData[] = [];
  const pressureData: TimeSeriesData[] = [];
  const vibrationData: TimeSeriesData[] = [];
  const productionData: TimeSeriesData[] = [];

  for (let i = 0; i < dataPoints; i++) {
    const timestamp = now - (dataPoints - i) * hourInMs;
    
    // OEE - Overall Equipment Effectiveness (60-95%)
    const baseOEE = 75 + Math.sin(i * 0.5) * 10 + Math.random() * 8;
    oeeData.push({
      timestamp,
      oee: Math.max(60, Math.min(95, baseOEE)),
    });

    // Temperature - Manufacturing equipment temperature (180-220°C)
    const baseTemp = 200 + Math.sin(i * 0.3) * 15 + Math.random() * 10;
    temperatureData.push({
      timestamp,
      temperature: Math.max(180, Math.min(220, baseTemp)),
    });

    // Pressure - Hydraulic system pressure (800-1200 PSI)
    const basePressure = 1000 + Math.cos(i * 0.4) * 100 + Math.random() * 50;
    pressureData.push({
      timestamp,
      pressure: Math.max(800, Math.min(1200, basePressure)),
    });

    // Vibration - Equipment vibration (0.5-3.0 mm/s RMS)
    const baseVibration = 1.5 + Math.sin(i * 0.7) * 0.8 + Math.random() * 0.4;
    vibrationData.push({
      timestamp,
      vibration: Math.max(0.5, Math.min(3.0, baseVibration)),
    });

    // Production Rate - Parts per hour (80-120)
    const baseProduction = 100 + Math.sin(i * 0.2) * 15 + Math.random() * 10;
    productionData.push({
      timestamp,
      production_rate: Math.max(80, Math.min(120, baseProduction)),
    });
  }

  return {
    oee: oeeData,
    temperature: temperatureData,
    pressure: pressureData,
    vibration: vibrationData,
    production: productionData,
  };
}

export function getCombinedMetricsData(): TimeSeriesData[] {
  const data = generateSampleManufacturingData();
  const combined: TimeSeriesData[] = [];

  for (let i = 0; i < data.oee.length; i++) {
    combined.push({
      timestamp: data.oee[i].timestamp,
      oee: data.oee[i].oee,
      temperature: data.temperature[i].temperature,
      pressure: data.pressure[i].pressure,
      vibration: data.vibration[i].vibration,
      production_rate: data.production[i].production_rate,
    });
  }

  return combined;
}