import { NextRequest, NextResponse } from 'next/server';
import { chatSessions } from '../route';

// Sample AI responses based on user query keywords
const aiResponses = {
  maintenance: [
    "Based on our maintenance records, the next scheduled maintenance for this equipment is on {date}. The maintenance will include: {tasks}.",
    "I've analyzed the maintenance history for this equipment. It was last serviced on {date}, and the next scheduled maintenance is due in {days} days."
  ],
  performance: [
    "The current OEE for this production line is {value}%, which is {status} compared to our target of {target}%. The main contributing factors are: {factors}.",
    "Performance analysis shows that this equipment has been operating at {value}% efficiency over the past week, which is {status} by {change}% compared to the previous period."
  ],
  quality: [
    "Quality metrics for the last production run show a defect rate of {value}%, which is {status} our threshold of {threshold}%. The most common defect types were: {defects}.",
    "Based on recent quality data, we're seeing a {trend} trend in defect rates. Current rate is {value}%, with {status} indicators across all quality parameters."
  ],
  production: [
    "Production output for this line is currently {value} units per hour, which is {status} our target of {target} units. Estimated completion time for the current order is {time}.",
    "Current production metrics show we're running at {value}% of capacity. Today's output is projected to be {units} units, which is {status} yesterday's performance."
  ],
  alert: [
    "I found {count} active alerts related to this equipment. The most critical one is: {description}. It was triggered at {time} and requires attention within {priority} hours.",
    "There are currently {count} alerts in the system. {criticalCount} of them are critical and require immediate attention. Would you like me to summarize the top issues?"
  ]
};

// Generate a random date in the near future
const generateFutureDate = () => {
  const today = new Date();
  const daysToAdd = Math.floor(Math.random() * 30) + 1; // 1-30 days
  const futureDate = new Date(today.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
  return futureDate.toISOString().split('T')[0]; // YYYY-MM-DD format
};

// Generate a response based on the input query
const generateResponse = (query: string) => {
  // Convert query to lowercase for matching
  const queryLower = query.toLowerCase();
  
  // Check for matching keywords
  let responseCategory;
  if (queryLower.includes('maintenance') || queryLower.includes('service') || queryLower.includes('repair')) {
    responseCategory = 'maintenance';
  } else if (queryLower.includes('performance') || queryLower.includes('efficiency') || queryLower.includes('oee')) {
    responseCategory = 'performance';
  } else if (queryLower.includes('quality') || queryLower.includes('defect') || queryLower.includes('reject')) {
    responseCategory = 'quality';
  } else if (queryLower.includes('production') || queryLower.includes('output') || queryLower.includes('capacity')) {
    responseCategory = 'production';
  } else if (queryLower.includes('alert') || queryLower.includes('warning') || queryLower.includes('issue')) {
    responseCategory = 'alert';
  } else {
    // Fallback to a generic response
    return "I understand you're asking about manufacturing operations. Could you provide more specific details about what you'd like to know? I can help with maintenance schedules, performance metrics, quality data, production status, or alert information.";
  }
  
  // Get a random response template from the matching category
  const templates = aiResponses[responseCategory];
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  // Fill in template with realistic values
  let response = template;
  
  // Replace placeholders with realistic values
  response = response.replace('{date}', generateFutureDate());
  response = response.replace('{days}', Math.floor(Math.random() * 14 + 1).toString());
  response = response.replace('{value}', (Math.random() * 20 + 75).toFixed(1));
  response = response.replace('{target}', (Math.random() * 10 + 85).toFixed(1));
  response = response.replace('{status}', Math.random() > 0.5 ? 'above' : 'below');
  response = response.replace('{change}', (Math.random() * 5).toFixed(1));
  response = response.replace('{threshold}', (Math.random() * 2 + 1).toFixed(1));
  response = response.replace('{trend}', Math.random() > 0.5 ? 'improving' : 'concerning');
  response = response.replace('{units}', Math.floor(Math.random() * 500 + 1000).toString());
  response = response.replace('{time}', `${Math.floor(Math.random() * 12 + 1)}:${Math.floor(Math.random() * 6) * 10 || '00'} ${Math.random() > 0.5 ? 'AM' : 'PM'}`);
  response = response.replace('{count}', Math.floor(Math.random() * 10 + 1).toString());
  response = response.replace('{criticalCount}', Math.floor(Math.random() * 3).toString());
  response = response.replace('{priority}', Math.floor(Math.random() * 24 + 1).toString());
  
  // Replace placeholder lists with realistic values
  if (response.includes('{tasks}')) {
    const tasks = [
      'lubrication',
      'calibration',
      'safety check',
      'component replacement',
      'software update'
    ];
    const selectedTasks = tasks
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.floor(Math.random() * 3 + 2))
      .join(', ');
    response = response.replace('{tasks}', selectedTasks);
  }
  
  if (response.includes('{factors}')) {
    const factors = [
      'equipment downtime',
      'changeover delays',
      'material quality issues',
      'operator availability',
      'scheduled maintenance'
    ];
    const selectedFactors = factors
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.floor(Math.random() * 2 + 2))
      .join(', ');
    response = response.replace('{factors}', selectedFactors);
  }
  
  if (response.includes('{defects}')) {
    const defects = [
      'dimensional variance',
      'surface finish issues',
      'assembly errors',
      'material inconsistency',
      'packaging defects'
    ];
    const selectedDefects = defects
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.floor(Math.random() * 2 + 2))
      .join(', ');
    response = response.replace('{defects}', selectedDefects);
  }
  
  if (response.includes('{description}')) {
    const descriptions = [
      'Temperature exceeding upper threshold on Machine #4',
      'Pressure drop detected in hydraulic system',
      'Motor current fluctuation on Assembly Line 2',
      'Unexpected stoppage on Packaging Robot 3',
      'Quality check failure rate above 5% on Production Line 1'
    ];
    response = response.replace('{description}', descriptions[Math.floor(Math.random() * descriptions.length)]);
  }
  
  return response;
};

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.message || !data.sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Find the session
    const sessionIndex = chatSessions.findIndex(s => s.id === data.sessionId);
    if (sessionIndex === -1) {
      return NextResponse.json(
        { error: 'Chat session not found' },
        { status: 404 }
      );
    }
    
    // Generate AI response
    const aiResponse = generateResponse(data.message);
    
    // Add a short delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return NextResponse.json({
      response: aiResponse
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request data' },
      { status: 400 }
    );
  }
}