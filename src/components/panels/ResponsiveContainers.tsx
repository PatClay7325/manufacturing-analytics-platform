/**
 * Responsive Container Components
 * Wrapper components that provide consistent responsive behavior for different chart types
 */

import React from 'react';
import { ResponsiveContainer } from 'recharts';

export interface ResponsiveContainerProps {
  children: React.ReactNode;
  width?: string | number;
  height?: string | number;
  minHeight?: number;
  className?: string;
  aspect?: number;
}

// Area Chart Responsive Container
export const AreaResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  width = "100%",
  height = "100%",
  minHeight = 300,
  className = "",
  aspect
}) => {
  return (
    <div 
      className={`area-chart-container ${className}`}
      style={{ width, height, minHeight }}
    >
      <ResponsiveContainer 
        width="100%" 
        height="100%"
        aspect={aspect}
        minHeight={minHeight}
      >
        {children}
      </ResponsiveContainer>
    </div>
  );
};

// Composed Chart (Bar + Line combinations) Responsive Container
export const ComposedResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  width = "100%",
  height = "100%",
  minHeight = 350,
  className = "",
  aspect
}) => {
  return (
    <div 
      className={`composed-chart-container ${className}`}
      style={{ width, height, minHeight }}
    >
      <ResponsiveContainer 
        width="100%" 
        height="100%"
        aspect={aspect}
        minHeight={minHeight}
      >
        {children}
      </ResponsiveContainer>
    </div>
  );
};

// Pie Chart Responsive Container
export const PieResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  width = "100%",
  height = "100%",
  minHeight = 300,
  className = "",
  aspect = 1
}) => {
  return (
    <div 
      className={`pie-chart-container ${className}`}
      style={{ width, height, minHeight }}
    >
      <ResponsiveContainer 
        width="100%" 
        height="100%"
        aspect={aspect}
        minHeight={minHeight}
      >
        {children}
      </ResponsiveContainer>
    </div>
  );
};

// Radar Chart Responsive Container
export const RadarResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  width = "100%",
  height = "100%",
  minHeight = 300,
  className = "",
  aspect = 1
}) => {
  return (
    <div 
      className={`radar-chart-container ${className}`}
      style={{ width, height, minHeight }}
    >
      <ResponsiveContainer 
        width="100%" 
        height="100%"
        aspect={aspect}
        minHeight={minHeight}
      >
        {children}
      </ResponsiveContainer>
    </div>
  );
};

// Treemap Responsive Container
export const TreemapResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  width = "100%",
  height = "100%",
  minHeight = 400,
  className = "",
  aspect
}) => {
  return (
    <div 
      className={`treemap-container ${className}`}
      style={{ width, height, minHeight }}
    >
      <ResponsiveContainer 
        width="100%" 
        height="100%"
        aspect={aspect}
        minHeight={minHeight}
      >
        {children}
      </ResponsiveContainer>
    </div>
  );
};

// Generic Responsive Container with customizable breakpoints
export interface BreakpointConfig {
  breakpoint: number;
  height: number;
  aspect?: number;
}

export interface AdaptiveResponsiveContainerProps extends ResponsiveContainerProps {
  breakpoints?: BreakpointConfig[];
}

export const AdaptiveResponsiveContainer: React.FC<AdaptiveResponsiveContainerProps> = ({
  children,
  width = "100%",
  height = "100%",
  minHeight = 300,
  className = "",
  breakpoints = [
    { breakpoint: 768, height: 250, aspect: 2 },
    { breakpoint: 1024, height: 300, aspect: 1.5 },
    { breakpoint: 1440, height: 400, aspect: 1.2 }
  ]
}) => {
  const [containerDimensions, setContainerDimensions] = React.useState({
    width: 0,
    height: minHeight
  });

  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { offsetWidth } = containerRef.current;
        
        // Find appropriate breakpoint
        const activeBreakpoint = breakpoints
          .sort((a, b) => a.breakpoint - b.breakpoint)
          .find(bp => offsetWidth >= bp.breakpoint) || breakpoints[0];

        setContainerDimensions({
          width: offsetWidth,
          height: activeBreakpoint?.height || minHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, [breakpoints, minHeight]);

  return (
    <div 
      ref={containerRef}
      className={`adaptive-chart-container ${className}`}
      style={{ 
        width, 
        height: height === "100%" ? containerDimensions.height : height,
        minHeight 
      }}
    >
      <ResponsiveContainer 
        width="100%" 
        height="100%"
        minHeight={minHeight}
      >
        {children}
      </ResponsiveContainer>
    </div>
  );
};

// Legend Effect Opacity Component
export interface LegendEffectOpacityProps {
  opacity: number;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  children: React.ReactNode;
}

export const LegendEffectOpacity: React.FC<LegendEffectOpacityProps> = ({
  opacity,
  onMouseEnter,
  onMouseLeave,
  children
}) => {
  return (
    <div
      style={{ 
        opacity,
        transition: 'opacity 0.3s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
};

// Custom Content of Tooltip wrapper
export interface CustomContentOfTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatter?: (value: any, name: string, props: any) => [React.ReactNode, string];
  labelFormatter?: (label: string) => React.ReactNode;
  separator?: string;
  wrapperClassName?: string;
  contentStyle?: React.CSSProperties;
  labelStyle?: React.CSSProperties;
}

export const CustomContentOfTooltip: React.FC<CustomContentOfTooltipProps> = ({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
  separator = " : ",
  wrapperClassName = "",
  contentStyle = {},
  labelStyle = {}
}) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const defaultContentStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    fontSize: '14px',
    ...contentStyle
  };

  const defaultLabelStyle: React.CSSProperties = {
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#333',
    ...labelStyle
  };

  return (
    <div className={`custom-tooltip ${wrapperClassName}`} style={defaultContentStyle}>
      {label && (
        <p style={defaultLabelStyle}>
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      {payload.map((entry, index) => {
        const [value, name] = formatter 
          ? formatter(entry.value, entry.name, entry)
          : [entry.value, entry.name];
        
        return (
          <p key={index} style={{ color: entry.color, margin: '4px 0' }}>
            <span>{name}</span>
            <span>{separator}</span>
            <span>{value}</span>
          </p>
        );
      })}
    </div>
  );
};

export default {
  AreaResponsiveContainer,
  ComposedResponsiveContainer,
  PieResponsiveContainer,
  RadarResponsiveContainer,
  TreemapResponsiveContainer,
  AdaptiveResponsiveContainer,
  LegendEffectOpacity,
  CustomContentOfTooltip
};