// OEE Waterfall Panel - Apache 2.0 License
// Custom Grafana panel for manufacturing OEE analysis

import { PanelPlugin } from '@grafana/data';
import { OEEWaterfallOptions } from './types';
import { OEEWaterfallPanel } from './OEEWaterfallPanel';

export const plugin = new PanelPlugin<OEEWaterfallOptions>(OEEWaterfallPanel)
  .setPanelOptions((builder) => {
    return builder
      .addSelect({
        path: 'equipmentId',
        name: 'Equipment ID',
        description: 'Select equipment for OEE analysis',
        defaultValue: '',
        settings: {
          allowCustomValue: true,
          options: [
            { value: 'equipment-001', label: 'CNC Machine 1' },
            { value: 'equipment-002', label: 'Assembly Line A' },
            { value: 'equipment-003', label: 'Packaging Unit 1' },
          ],
        },
      })
      .addNumberInput({
        path: 'targetOEE',
        name: 'Target OEE (%)',
        description: 'Target OEE percentage for comparison',
        defaultValue: 85,
        settings: {
          min: 0,
          max: 100,
          step: 1,
        },
      })
      .addNumberInput({
        path: 'targetAvailability',
        name: 'Target Availability (%)',
        description: 'Target availability percentage',
        defaultValue: 90,
        settings: {
          min: 0,
          max: 100,
          step: 1,
        },
      })
      .addNumberInput({
        path: 'targetPerformance',
        name: 'Target Performance (%)',
        description: 'Target performance percentage',
        defaultValue: 95,
        settings: {
          min: 0,
          max: 100,
          step: 1,
        },
      })
      .addNumberInput({
        path: 'targetQuality',
        name: 'Target Quality (%)',
        description: 'Target quality percentage',
        defaultValue: 99,
        settings: {
          min: 0,
          max: 100,
          step: 1,
        },
      })
      .addColorPicker({
        path: 'colors.availability',
        name: 'Availability Color',
        description: 'Color for availability bars',
        defaultValue: '#73BF69',
      })
      .addColorPicker({
        path: 'colors.performance',
        name: 'Performance Color', 
        description: 'Color for performance bars',
        defaultValue: '#FADE2A',
      })
      .addColorPicker({
        path: 'colors.quality',
        name: 'Quality Color',
        description: 'Color for quality bars',
        defaultValue: '#FF9830',
      })
      .addColorPicker({
        path: 'colors.oee',
        name: 'OEE Color',
        description: 'Color for final OEE bar',
        defaultValue: '#F2495C',
      })
      .addBooleanSwitch({
        path: 'showTargetLine',
        name: 'Show Target Line',
        description: 'Display target OEE line on chart',
        defaultValue: true,
      })
      .addBooleanSwitch({
        path: 'showValues',
        name: 'Show Values',
        description: 'Display values on bars',
        defaultValue: true,
      })
      .addSelect({
        path: 'timeRange',
        name: 'Default Time Range',
        description: 'Default time range for OEE calculation',
        defaultValue: '1h',
        settings: {
          options: [
            { value: '15m', label: 'Last 15 minutes' },
            { value: '1h', label: 'Last hour' },
            { value: '8h', label: 'Last 8 hours (shift)' },
            { value: '24h', label: 'Last 24 hours' },
            { value: '7d', label: 'Last 7 days' },
          ],
        },
      });
  })
  .useFieldConfig({
    standardOptions: {
      min: 0,
      max: 100,
      unit: 'percent',
    },
  });