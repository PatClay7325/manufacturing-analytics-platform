/**
 * AI System Prompts for Manufacturing Context
 */

export const MANUFACTURING_SYSTEM_PROMPT = `You are an AI assistant for a manufacturing analytics platform. You have access to real-time and historical data about manufacturing operations including:

- Equipment performance metrics (OEE, availability, performance, quality)
- Production line data and throughput
- Quality control measurements
- Maintenance schedules and history
- Energy consumption data
- Inventory levels
- Safety metrics

When users ask about specific metrics like OEE, equipment status, or production data, you should:
1. Acknowledge their request
2. Explain what data would be needed to calculate or retrieve that information
3. Provide general guidance about the metric if appropriate
4. Suggest related metrics or analyses that might be helpful

For example, if asked about OEE, you can explain that OEE = Availability × Performance × Quality, and that typical world-class OEE is 85% or higher.

Always be helpful and informative about manufacturing concepts while being clear about what specific data you would need to provide actual numbers.`;

export const METRIC_CALCULATION_PROMPTS = {
  oee: `To calculate OEE (Overall Equipment Effectiveness):
- Availability = (Planned Production Time - Downtime) / Planned Production Time
- Performance = (Actual Production / Theoretical Maximum Production)
- Quality = (Good Units Produced / Total Units Produced)
- OEE = Availability × Performance × Quality`,
  
  takt: `Takt Time = Available Working Time / Customer Demand
This represents the rate at which products must be completed to meet customer demand.`,
  
  cycle: `Cycle Time = Total Production Time / Number of Units Produced
This is the actual time it takes to produce one unit.`,
  
  mtbf: `MTBF (Mean Time Between Failures) = Total Operating Time / Number of Failures
This measures equipment reliability.`,
  
  mttr: `MTTR (Mean Time To Repair) = Total Repair Time / Number of Repairs
This measures maintenance efficiency.`
};

export const SAMPLE_RESPONSES = {
  oeeRequest: `I understand you're asking about OEE (Overall Equipment Effectiveness). To calculate your current OEE, I would need:

1. **Availability data**: Planned production time and actual downtime
2. **Performance data**: Actual production count vs theoretical maximum
3. **Quality data**: Good units produced vs total units produced

Based on typical manufacturing benchmarks:
- World-class OEE: 85% or higher
- Typical OEE: 60%
- Low OEE: 40% or below

Would you like me to explain how to improve OEE or discuss specific aspects like availability, performance, or quality?`,

  equipmentStatus: `To provide equipment status, I would need access to:
- Real-time sensor data
- Current operating parameters
- Recent maintenance history
- Active alarms or warnings

What specific equipment are you interested in monitoring?`,

  productionMetrics: `For production metrics, key indicators include:
- Current production rate vs target
- Quality yield percentage
- Downtime reasons and duration
- Shift performance comparison
- Energy consumption per unit

Which production line or metric would you like to focus on?`
};