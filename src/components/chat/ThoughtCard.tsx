'use client';

import React from 'react';
import { Lightbulb, AlertCircle, Target, Brain } from 'lucide-react';

interface ThoughtCardProps {
  type: 'reasoning' | 'critique' | 'insight' | 'planning';
  title: string;
  body: string;
}

export default function ThoughtCard({ type, title, body }: ThoughtCardProps) {
  const getTypeStyles = () => {
    switch (type) {
      case 'reasoning':
        return {
          borderColor: 'border-yellow-500',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          icon: Brain
        };
      case 'critique':
        return {
          borderColor: 'border-red-500',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          iconColor: 'text-red-600 dark:text-red-400',
          icon: AlertCircle
        };
      case 'insight':
        return {
          borderColor: 'border-green-500',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          iconColor: 'text-green-600 dark:text-green-400',
          icon: Lightbulb
        };
      case 'planning':
        return {
          borderColor: 'border-blue-500',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          iconColor: 'text-blue-600 dark:text-blue-400',
          icon: Target
        };
      default:
        return {
          borderColor: 'border-gray-500',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          iconColor: 'text-gray-600 dark:text-gray-400',
          icon: Brain
        };
    }
  };

  const { borderColor, bgColor, iconColor, icon: Icon } = getTypeStyles();

  return (
    <div
      className={`rounded-lg border-l-4 ${borderColor} ${bgColor} p-4 shadow-sm transition-all hover:shadow-md`}
    >
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white capitalize mb-1">
            {type}: {title}
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {body}
          </p>
        </div>
      </div>
    </div>
  );
}