import React from 'react';

interface SampleQuestionProps {
  onSelectQuestion?: (question?: string) => void;
  isDisabled?: boolean;
}

const sampleQuestions = [
  {
    id: 'oee-line-3',
    question: "What's the current OEE for production line 3?"
  },
  {
    id: 'downtime-reasons',
    question: "Show me the top 5 downtime reasons this week"
  },
  {
    id: 'maintenance-schedule',
    question: "When is the next scheduled maintenance for the injection molding machine?"
  },
  {
    id: 'quality-reject-rate',
    question: "What's our quality reject rate trend for the past month?"
  },
  {
    id: 'oee-calculation',
    question: "Explain how to calculate Overall Equipment Effectiveness (OEE)?"
  },
  {
    id: 'equipment-failures',
    question: "What are the common causes of equipment failures in manufacturing?"
  },
  {
    id: 'equipment-list',
    question: "List all equipment in the system"
  },
  {
    id: 'production-metrics',
    question: "Show me production metrics for all lines"
  }
];

export default function SampleQuestions({ onSelectQuestion, isDisabled = false }: SampleQuestionProps) {
  return (
    <div className="rounded-lg bg-blue-50 p-6" data-testid="sample-questions">
      <h2 className="mb-4 text-xl font-semibold text-blue-900">
        Sample Questions:
      </h2>
      <ul className="space-y-2 text-gray-600">
        {sampleQuestions?.map((item) => (
          <li key={item?.id}>
            <button
              onClick={() => onSelectQuestion(item?.question)}
              className="text-left hover:text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1 py-0.5 -mx-1 disabled:opacity-50 disabled:hover:no-underline disabled:hover:text-gray-600"
              disabled={isDisabled}
              data-testid={`sample-question-${item?.id}`}
            >
              {item?.question}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}