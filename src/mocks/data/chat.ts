import { ChatMessage, ChatSession } from '@/models/chat';

// Mock chat messages
const messages: Record<string, ChatMessage[]> = {
  'session-1': [
    {
      id: 'msg-1',
      role: 'user',
      content: 'What is the current status of production line A?',
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(), // 45 minutes ago
      name: 'John Doe'
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Production Line A is currently operating at 92% efficiency. There are no active alerts, and all equipment is functioning within normal parameters. The current production rate is 157 units per hour, which is 4% above the target rate of 150 units per hour.',
      timestamp: new Date(Date.now() - 44 * 60000).toISOString(), // 44 minutes ago
    },
    {
      id: 'msg-3',
      role: 'user',
      content: 'Are there any maintenance activities scheduled for today?',
      timestamp: new Date(Date.now() - 40 * 60000).toISOString(), // 40 minutes ago
      name: 'John Doe'
    },
    {
      id: 'msg-4',
      role: 'assistant',
      content: 'Yes, there are 3 scheduled maintenance activities for today:\n\n1. CNC Machine XYZ-1000 - Regular preventive maintenance at 2:00 PM\n2. Robot Arm RX-200 - Firmware update at 4:30 PM\n3. Conveyor Belt System CB-500 - Motor replacement currently in progress\n\nWould you like me to provide more details on any of these maintenance activities?',
      timestamp: new Date(Date.now() - 39 * 60000).toISOString(), // 39 minutes ago
    }
  ],
  'session-2': [
    {
      id: 'msg-5',
      role: 'user',
      content: 'Show me the OEE trend for the past week',
      timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
      name: 'Jane Smith'
    },
    {
      id: 'msg-6',
      role: 'assistant',
      content: 'Here is the OEE trend for the past week:\n\n- Monday: 85.2%\n- Tuesday: 86.5%\n- Wednesday: 87.3%\n- Thursday: 87.1%\n- Friday: 88.3%\n- Saturday: 86.9%\n- Sunday: 85.5%\n\nThe average OEE for the week is 86.7%, which is 1.7% higher than the previous week. The highest OEE was achieved on Friday at 88.3%.',
      timestamp: new Date(Date.now() - 2 * 3600000 + 20000).toISOString(), // 2 hours ago + 20 seconds
    },
    {
      id: 'msg-7',
      role: 'user',
      content: 'What were the main causes of downtime?',
      timestamp: new Date(Date.now() - 2 * 3600000 + 60000).toISOString(), // 2 hours ago + 1 minute
      name: 'Jane Smith'
    },
    {
      id: 'msg-8',
      role: 'assistant',
      content: 'The main causes of downtime for the past week were:\n\n1. Changeover time: 45% of total downtime (4.2 hours)\n2. Equipment failures: 25% of total downtime (2.3 hours)\n3. Material shortages: 15% of total downtime (1.4 hours)\n4. Quality adjustments: 10% of total downtime (0.9 hours)\n5. Other reasons: 5% of total downtime (0.5 hours)\n\nThe most significant equipment failure was the conveyor belt motor issue that occurred on Wednesday, accounting for 1.5 hours of downtime.',
      timestamp: new Date(Date.now() - 2 * 3600000 + 80000).toISOString(), // 2 hours ago + 1 minute + 20 seconds
    }
  ],
  'session-3': [
    {
      id: 'msg-9',
      role: 'user',
      content: 'Summarize today\'s critical alerts',
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(), // 15 minutes ago
      name: 'Alex Chen'
    },
    {
      id: 'msg-10',
      role: 'assistant',
      content: 'Today there have been 2 critical alerts:\n\n1. Conveyor Belt System CB-500 stopped unexpectedly at 11:40 AM. Error code: E-STOP-221. This alert is still active and requires immediate attention.\n\n2. Safety guard interlock was triggered on Injection Molding Machine IM-800 at 7:05 AM. This alert has been resolved by the maintenance team at 8:05 AM. The root cause was identified as a misaligned guard door sensor.',
      timestamp: new Date(Date.now() - 14 * 60000).toISOString(), // 14 minutes ago
    }
  ]
};

// Mock chat sessions
const sessions: ChatSession[] = [
  {
    id: 'session-1',
    title: 'Production Line Status',
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(), // 45 minutes ago
    updatedAt: new Date(Date.now() - 39 * 60000).toISOString(), // 39 minutes ago
    messageCount: messages['session-1'].length
  },
  {
    id: 'session-2',
    title: 'OEE Analysis',
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
    updatedAt: new Date(Date.now() - 2 * 3600000 + 80000).toISOString(), // 2 hours ago + 1 minute + 20 seconds
    messageCount: messages['session-2'].length
  },
  {
    id: 'session-3',
    title: 'Critical Alerts Summary',
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(), // 15 minutes ago
    updatedAt: new Date(Date.now() - 14 * 60000).toISOString(), // 14 minutes ago
    messageCount: messages['session-3'].length
  }
];

// Common sample questions for manufacturing Analytics
const sampleQuestions = [
  'What is the current OEE for production line A?',
  'Show me the top 3 causes of downtime this week',
  'How many critical alerts are currently active?',
  'What is our current production rate vs target?',
  'When is the next scheduled maintenance for the CNC machine?',
  'What was our quality reject rate yesterday?',
  'Which equipment has the lowest availability?',
  'What is the status of the current production batch?',
  'Compare this week\'s production volume with last week',
  'Show me the trend of equipment failures this month'
];

// Mock chat completion responses for common manufacturing queries
const completionResponses = {
  'oee': 'The current OEE (Overall Equipment Effectiveness) is 85.5%. This breaks down to: Availability at 92%, Performance at 88.5%, and Quality at 96.2%.',
  'downtime': 'The top 3 causes of downtime this week are: 1. Changeover time (45%), 2. Equipment failures (25%), 3. Material shortages (15%).',
  'alerts': 'There are currently 5 active alerts: 2 critical, 2 high, and 1 medium priority. The critical alerts are related to the conveyor belt system and require immediate attention.',
  'production': 'Current production rate is 157 units per hour, which is 4% above the target rate of 150 units per hour. We have completed 78% of today\'s production target.',
  'maintenance': 'The next scheduled maintenance for the CNC machine is tomorrow at 2:00 PM. It is a regular preventive maintenance expected to take 2 hours.',
  'quality': 'Yesterday\'s quality reject rate was 2.8%, which is below our threshold of 3%. The most common defect type was surface scratches (42% of rejects).',
  'status': 'All equipment is currently operational. Production Line A is running at 92% efficiency. There are no critical issues requiring immediate attention.',
  'default': 'I\'m your manufacturing assistant. I can help with information about equipment status, production metrics, maintenance schedules, quality data, and alerts. What would you like to know?'
};

// Export all mock data
export const mockChatData = {
  sessions,
  messages,
  sampleQuestions,
  completionResponses
};