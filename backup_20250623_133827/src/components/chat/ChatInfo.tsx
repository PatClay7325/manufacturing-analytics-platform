import React from 'react';

interface ChatInfoProps {
  className?: string;
}

export default function ChatInfo({ className = '' }: ChatInfoProps) {
  return (
    <div className={`rounded-lg bg-gray-50 p-6 ${className}`} data-testid="chat-info">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">
        About Manufacturing Intelligence Chat
      </h2>
      <p className="text-gray-700 mb-4">
        This chat interface uses the Manufacturing Assistant AI service to provide intelligent
        responses to manufacturing queries. The assistant is integrated with our manufacturing
        data systems and has knowledge about:
      </p>
      <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
        <li>Equipment performance and status</li>
        <li>Production metrics and OEE</li>
        <li>Quality metrics and defect analysis</li>
        <li>Maintenance schedules and history</li>
        <li>Manufacturing best practices and standards</li>
      </ul>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <h3 className="text-md font-medium text-blue-800 mb-2">Tips for effective queries:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Be specific about equipment, production lines, or time periods</li>
          <li>• Ask about manufacturing KPIs like OEE, yield, and quality rates</li>
          <li>• Request comparisons between current and historical performance</li>
          <li>• Ask for recommendations to improve specific processes</li>
          <li>• Inquire about upcoming maintenance or production schedules</li>
        </ul>
      </div>
    </div>
  );
}