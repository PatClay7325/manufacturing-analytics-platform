'use client';

import React from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, RadarChart, Radar,
  AreaChart, Area, ScatterChart, Scatter, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, ReferenceLine, ReferenceArea,
  Brush, RadialBarChart, RadialBar, Treemap, Sankey
} from 'recharts';

// Color palette for consistent theming
const COLORS = {
  primary: ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af'],
  success: ['#10b981', '#059669', '#047857', '#065f46'],
  warning: ['#f59e0b', '#d97706', '#b45309', '#92400e'],
  danger: ['#ef4444', '#dc2626', '#b91c1c', '#991b1b'],
  neutral: ['#6b7280', '#4b5563', '#374151', '#1f2937'],
  quality: ['#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6'],
  performance: ['#06b6d4', '#0891b2', '#0e7490', '#155e75']
};

// OEE Gauge Chart
export function OEEGaugeChart({ data }: { data: any }) {
  const gaugeData = [
    { name: 'OEE', value: data?.aggregated?.avgOEE * 100 || 0, fill: COLORS.primary[0] },
    { name: 'Target', value: 85, fill: COLORS.neutral[2] }
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadialBarChart cx="50%" cy="50%" innerRadius="40%" outerRadius="90%" data={gaugeData}>
        <PolarGrid gridType="circular" />
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar dataKey="value" cornerRadius={10} fill={COLORS.primary[0]} />
        <Tooltip />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-3xl font-bold">
          {gaugeData[0].value.toFixed(1)}%
        </text>
        <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" className="text-sm text-gray-600">
          OEE Score
        </text>
      </RadialBarChart>
    </ResponsiveContainer>
  );
}

// OEE Trend Chart with multiple metrics
export function OEETrendChart({ data }: { data: any }) {
  if (!data?.trends || data.trends.length === 0) return null;

  // Transform decimal values to percentages for display
  const transformedData = data.trends.map((trend: any) => ({
    ...trend,
    availability: (trend.availability || 0) * 100,
    performance: (trend.performance || 0) * 100,
    quality: (trend.quality || 0) * 100,
    oee: (trend.oee || 0) * 100
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={transformedData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleTimeString()} />
        <YAxis yAxisId="percentage" domain={[0, 100]} label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
        <YAxis yAxisId="oee" orientation="right" domain={[0, 100]} label={{ value: 'OEE (%)', angle: 90, position: 'insideRight' }} />
        <Tooltip 
          formatter={(value: any) => `${Number(value).toFixed(1)}%`}
          labelFormatter={(label) => new Date(label).toLocaleString()}
        />
        <Legend />
        <ReferenceLine yAxisId="percentage" y={85} label="Target" stroke={COLORS.success[0]} strokeDasharray="5 5" />
        
        <Area yAxisId="percentage" type="monotone" dataKey="availability" stackId="1" stroke={COLORS.success[0]} fill={COLORS.success[0]} fillOpacity={0.6} name="Availability" />
        <Area yAxisId="percentage" type="monotone" dataKey="performance" stackId="1" stroke={COLORS.primary[0]} fill={COLORS.primary[0]} fillOpacity={0.6} name="Performance" />
        <Area yAxisId="percentage" type="monotone" dataKey="quality" stackId="1" stroke={COLORS.quality[0]} fill={COLORS.quality[0]} fillOpacity={0.6} name="Quality" />
        
        <Line yAxisId="oee" type="monotone" dataKey="oee" stroke={COLORS.danger[0]} strokeWidth={3} dot={false} name="OEE" />
        <Brush dataKey="timestamp" height={30} stroke={COLORS.primary[0]} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// Equipment Performance Radar Chart
export function EquipmentPerformanceRadar({ data }: { data: any }) {
  if (!data?.equipmentRanking || data.equipmentRanking.length === 0) return null;

  const radarData = data.equipmentRanking.slice(0, 6).map((eq: any) => ({
    equipment: eq._displayName,
    availability: eq._avg?.availability * 100 || 0,
    performance: eq._avg?.performance * 100 || 0,
    quality: eq._avg?.quality * 100 || 0,
    oee: eq._avg?.oeeScore * 100 || 0
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RadarChart data={radarData}>
        <PolarGrid gridType="polygon" />
        <PolarAngleAxis dataKey="equipment" />
        <PolarRadiusAxis angle={90} domain={[0, 100]} />
        <Radar name="Availability" dataKey="availability" stroke={COLORS.success[0]} fill={COLORS.success[0]} fillOpacity={0.3} />
        <Radar name="Performance" dataKey="performance" stroke={COLORS.primary[0]} fill={COLORS.primary[0]} fillOpacity={0.3} />
        <Radar name="Quality" dataKey="quality" stroke={COLORS.quality[0]} fill={COLORS.quality[0]} fillOpacity={0.3} />
        <Radar name="OEE" dataKey="oee" stroke={COLORS.danger[0]} fill={COLORS.danger[0]} fillOpacity={0.3} />
        <Legend />
        <Tooltip formatter={(value: any) => `${value.toFixed(1)}%`} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// Quality Metrics CPK/PPK Chart
export function QualityMetricsChart({ data }: { data: any }) {
  if (!data?.byParameter || data.byParameter.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={data.byParameter} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="parameter" angle={-45} textAnchor="end" height={60} />
        <YAxis yAxisId="left" label={{ value: 'Process Capability', angle: -90, position: 'insideLeft' }} />
        <YAxis yAxisId="right" orientation="right" label={{ value: 'Sample Count', angle: 90, position: 'insideRight' }} />
        <Tooltip />
        <Legend />
        
        <Bar yAxisId="left" dataKey="avgCpk" fill={COLORS.primary[0]} name="Cpk" />
        <Bar yAxisId="left" dataKey="avgPpk" fill={COLORS.quality[0]} name="Ppk" />
        <Line yAxisId="right" type="monotone" dataKey="count" stroke={COLORS.neutral[0]} strokeWidth={2} name="Samples" />
        
        <ReferenceLine yAxisId="left" y={1.33} label="Capable" stroke={COLORS.success[0]} strokeDasharray="5 5" />
        <ReferenceLine yAxisId="left" y={1.67} label="Six Sigma" stroke={COLORS.success[1]} strokeDasharray="5 5" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// Defect Pareto Chart
export function DefectParetoChart({ data }: { data: any }) {
  if (!data?.defectAnalysis || data.defectAnalysis.length === 0) return null;

  // Sort defects by count and calculate cumulative percentage
  const sortedDefects = [...data.defectAnalysis].sort((a, b) => b.count - a.count);
  let cumulative = 0;
  const paretoData = sortedDefects.map((defect) => {
    cumulative += defect.percentage;
    return {
      ...defect,
      cumulative: cumulative
    };
  });

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={paretoData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="defectType" angle={-45} textAnchor="end" height={60} />
        <YAxis yAxisId="left" label={{ value: 'Defect Count', angle: -90, position: 'insideLeft' }} />
        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} label={{ value: 'Cumulative %', angle: 90, position: 'insideRight' }} />
        <Tooltip />
        <Legend />
        
        <Bar yAxisId="left" dataKey="count" fill={COLORS.danger[0]} name="Defect Count" />
        <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke={COLORS.warning[0]} strokeWidth={3} name="Cumulative %" dot={{ fill: COLORS.warning[0] }} />
        
        <ReferenceLine yAxisId="right" y={80} label="80% Line" stroke={COLORS.neutral[0]} strokeDasharray="5 5" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// Production Volume Chart
export function ProductionVolumeChart({ data }: { data: any }) {
  if (!data?.trends || data.trends.length === 0) {
    return null;
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={data.trends} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleTimeString()} />
        <YAxis yAxisId="units" label={{ value: 'Units Produced', angle: -90, position: 'insideLeft' }} />
        <YAxis yAxisId="rate" orientation="right" label={{ value: 'Production Rate', angle: 90, position: 'insideRight' }} />
        <Tooltip labelFormatter={(label) => new Date(label).toLocaleString()} />
        <Legend />
        
        <Area yAxisId="units" type="monotone" dataKey="totalParts" stroke={COLORS.primary[0]} fill={COLORS.primary[0]} fillOpacity={0.6} name="Total Parts" />
        <Area yAxisId="units" type="monotone" dataKey="goodParts" stroke={COLORS.success[0]} fill={COLORS.success[0]} fillOpacity={0.6} name="Good Parts" />
        <Bar yAxisId="units" dataKey="rejectedParts" fill={COLORS.danger[0]} name="Rejected Parts" />
        <Line yAxisId="rate" type="monotone" dataKey="productionRate" stroke={COLORS.performance[0]} strokeWidth={2} name="Production Rate" />
        
        <Brush dataKey="timestamp" height={30} stroke={COLORS.primary[0]} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// Equipment Health Matrix
export function EquipmentHealthMatrix({ data }: { data: any }) {
  if (!data?.equipment || data.equipment.length === 0) return null;

  const healthData = data.equipment.map((eq: any) => ({
    name: eq.workCenter?.name || 'Unknown',
    mechanical: eq.mechanicalHealth * 100,
    electrical: eq.electricalHealth * 100,
    hydraulic: eq.hydraulicHealth * 100,
    overall: eq.overallHealth * 100,
    riskLevel: eq.riskLevel
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RadarChart data={healthData}>
        <PolarGrid gridType="polygon" />
        <PolarAngleAxis dataKey="name" />
        <PolarRadiusAxis angle={90} domain={[0, 100]} />
        <Radar name="Mechanical" dataKey="mechanical" stroke={COLORS.primary[0]} fill={COLORS.primary[0]} fillOpacity={0.3} />
        <Radar name="Electrical" dataKey="electrical" stroke={COLORS.warning[0]} fill={COLORS.warning[0]} fillOpacity={0.3} />
        <Radar name="Hydraulic" dataKey="hydraulic" stroke={COLORS.performance[0]} fill={COLORS.performance[0]} fillOpacity={0.3} />
        <Radar name="Overall" dataKey="overall" stroke={COLORS.success[0]} fill={COLORS.success[0]} fillOpacity={0.3} />
        <Legend />
        <Tooltip formatter={(value: any) => `${value.toFixed(1)}%`} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// Shift Performance Comparison
export function ShiftPerformanceChart({ data }: { data: any }) {
  if (!data?.byShift || data.byShift.length === 0) {
    return null;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data.byShift} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="shift" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="totalParts" fill={COLORS.primary[0]} name="Total Parts" />
        <Bar dataKey="goodParts" fill={COLORS.success[0]} name="Good Parts" />
        <Bar dataKey="rejectedParts" fill={COLORS.danger[0]} name="Rejected Parts" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Quality Trend Analysis
export function QualityTrendChart({ data }: { data: any }) {
  if (!data?.trends || data.trends.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data.trends} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleTimeString()} />
        <YAxis domain={[0, 'auto']} />
        <Tooltip labelFormatter={(label) => new Date(label).toLocaleString()} />
        <Legend />
        
        {/* Dynamic lines for each parameter */}
        {data.trends.length > 0 && Object.keys(data.trends[0])
          .filter(key => key !== 'timestamp' && key !== 'workCenter' && key !== 'shift')
          .map((key, index) => (
            <Line 
              key={key}
              type="monotone" 
              dataKey={key} 
              stroke={COLORS.primary[index % COLORS.primary.length]} 
              strokeWidth={2}
              dot={false}
              name={key}
            />
          ))
        }
        
        <Brush dataKey="timestamp" height={30} stroke={COLORS.primary[0]} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Production by Product Type
export function ProductionByProductChart({ data }: { data: any }) {
  if (!data?.byProduct || data.byProduct.length === 0) {
    return null;
  }

  const pieData = data.byProduct.map((product: any, index: number) => ({
    name: product.productType || 'Unknown Product',
    value: product.totalParts || product.count || 0,
    fill: COLORS.primary[index % COLORS.primary.length]
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {pieData.map((entry: any, index: number) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// MTBF/MTTR Analysis Chart
export function ReliabilityMetricsChart({ data }: { data: any }) {
  if (!data?.equipment || data.equipment.length === 0) return null;

  const reliabilityData = data.equipment.map((eq: any) => ({
    name: eq.workCenter?.name || 'Unknown',
    mtbf: eq.mtbf || 0,
    mttr: eq.mttr || 0,
    availability: (eq.mtbf / (eq.mtbf + eq.mttr)) * 100 || 0
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={reliabilityData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
        <YAxis yAxisId="hours" label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
        <YAxis yAxisId="percentage" orientation="right" domain={[0, 100]} label={{ value: 'Availability %', angle: 90, position: 'insideRight' }} />
        <Tooltip />
        <Legend />
        
        <Bar yAxisId="hours" dataKey="mtbf" fill={COLORS.success[0]} name="MTBF (hours)" />
        <Bar yAxisId="hours" dataKey="mttr" fill={COLORS.danger[0]} name="MTTR (hours)" />
        <Line yAxisId="percentage" type="monotone" dataKey="availability" stroke={COLORS.primary[0]} strokeWidth={3} name="Availability %" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}