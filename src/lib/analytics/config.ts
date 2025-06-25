// Analytics configuration to match your application styling
export const ANALYTICS_THEME_CONFIG = {
  // Colors from your tailwind config
  colors: {
    primary: '#3B82F6',      // Blue-600
    secondary: '#10B981',    // Emerald-500
    warning: '#F59E0B',      // Amber-500
    danger: '#EF4444',       // Red-500
    info: '#6366F1',         // Indigo-500
    success: '#059669',      // Emerald-600
    neutral: '#6B7280',      // Gray-500
    
    // Background colors
    bgPrimary: '#FFFFFF',
    bgSecondary: '#F9FAFB',
    bgTertiary: '#F3F4F6',
    
    // Text colors
    textPrimary: '#111827',
    textSecondary: '#4B5563',
    textTertiary: '#9CA3AF',
    
    // Border colors
    border: '#E5E7EB',
    borderHover: '#D1D5DB'
  },
  
  // Typography
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem'
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },
  
  // Spacing
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem'
  },
  
  // Border radius
  borderRadius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px'
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
  }
};

// Panel configuration presets
export const PANEL_PRESETS = {
  oee: {
    gridPos: { h: 8, w: 12, x: 0, y: 0 },
    options: {
      legend: {
        displayMode: 'list',
        placement: 'bottom'
      },
      tooltip: {
        mode: 'single'
      }
    },
    fieldConfig: {
      defaults: {
        color: {
          mode: 'palette-classic'
        },
        custom: {
          axisLabel: '',
          axisPlacement: 'auto',
          barAlignment: 0,
          drawStyle: 'line',
          fillOpacity: 10,
          gradientMode: 'none',
          hideFrom: {
            tooltip: false,
            viz: false,
            legend: false
          },
          lineInterpolation: 'linear',
          lineWidth: 2,
          pointSize: 5,
          scaleDistribution: {
            type: 'linear'
          },
          showPoints: 'never',
          spanNulls: true,
          stacking: {
            group: 'A',
            mode: 'none'
          },
          thresholdsStyle: {
            mode: 'off'
          }
        },
        mappings: [],
        thresholds: {
          mode: 'absolute',
          steps: [
            {
              color: 'green',
              value: null
            },
            {
              color: 'red',
              value: 80
            }
          ]
        },
        unit: 'percent'
      },
      overrides: []
    }
  },
  
  gauge: {
    gridPos: { h: 8, w: 6, x: 0, y: 0 },
    options: {
      orientation: 'auto',
      reduceOptions: {
        values: false,
        calcs: ['lastNotNull'],
        fields: ''
      },
      showThresholdLabels: false,
      showThresholdMarkers: true,
      text: {}
    },
    fieldConfig: {
      defaults: {
        color: {
          mode: 'thresholds'
        },
        mappings: [],
        thresholds: {
          mode: 'absolute',
          steps: [
            {
              color: ANALYTICS_THEME_CONFIG.colors.danger,
              value: null
            },
            {
              color: ANALYTICS_THEME_CONFIG.colors.warning,
              value: 60
            },
            {
              color: ANALYTICS_THEME_CONFIG.colors.success,
              value: 85
            }
          ]
        },
        unit: 'percent',
        min: 0,
        max: 100
      },
      overrides: []
    }
  },
  
  stat: {
    gridPos: { h: 4, w: 6, x: 0, y: 0 },
    options: {
      colorMode: 'value',
      graphMode: 'area',
      justifyMode: 'auto',
      orientation: 'auto',
      reduceOptions: {
        values: false,
        calcs: ['lastNotNull'],
        fields: ''
      },
      text: {},
      textMode: 'auto'
    },
    fieldConfig: {
      defaults: {
        color: {
          mode: 'thresholds'
        },
        mappings: [],
        thresholds: {
          mode: 'absolute',
          steps: [
            {
              color: ANALYTICS_THEME_CONFIG.colors.primary,
              value: null
            }
          ]
        }
      },
      overrides: []
    }
  }
};

// SQL query templates for manufacturing data
export const QUERY_TEMPLATES = {
  oeeOverTime: `
    SELECT 
      timestamp,
      availability,
      performance,
      quality,
      oee
    FROM performance_metrics
    WHERE work_unit_id = '\${equipment_id}'
      AND timestamp >= \$__timeFrom()
      AND timestamp <= \$__timeTo()
    ORDER BY timestamp
  `,
  
  equipmentStatus: `
    SELECT 
      wu.name as equipment,
      wu.status,
      wu.equipment_type,
      COUNT(a.id) as active_alerts,
      MAX(pm.oee) as current_oee
    FROM work_units wu
    LEFT JOIN alerts a ON wu.id = a.work_unit_id AND a.status = 'active'
    LEFT JOIN performance_metrics pm ON wu.id = pm.work_unit_id
    WHERE wu.status != 'decommissioned'
    GROUP BY wu.id, wu.name, wu.status, wu.equipment_type
    ORDER BY active_alerts DESC, current_oee ASC
  `,
  
  productionMetrics: `
    SELECT 
      date_trunc('hour', timestamp) as time,
      SUM(units_produced) as total_production,
      AVG(cycle_time) as avg_cycle_time,
      SUM(units_scrapped) as total_scrap,
      AVG(quality_rate) as avg_quality
    FROM production_metrics
    WHERE timestamp >= \$__timeFrom()
      AND timestamp <= \$__timeTo()
    GROUP BY time
    ORDER BY time
  `,
  
  alertsTimeline: `
    SELECT 
      timestamp,
      severity,
      type,
      message,
      wu.name as equipment
    FROM alerts a
    JOIN work_units wu ON a.work_unit_id = wu.id
    WHERE timestamp >= \$__timeFrom()
      AND timestamp <= \$__timeTo()
    ORDER BY timestamp DESC
  `
};