'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Panel } from '@/types/dashboard';

interface TextPanelProps {
  panel?: Panel;
  height?: string | number;
  width?: string | number;
}

function TextPanel({ panel, height, width }: TextPanelProps) {
  const content = panel?.options?.content || '';
  const mode = panel?.options?.mode || 'markdown';

  return (
    <div 
      className="text-panel p-4 overflow-auto bg-gray-900 text-gray-100"
      style={{ height, width }}
    >
      {mode === 'markdown' ? (
        <ReactMarkdown 
          className="prose prose-invert max-w-none"
          components={{
            h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
            h2: ({ children }) => <h2 className="text-xl font-semibold mb-3">{children}</h2>,
            h3: ({ children }) => <h3 className="text-lg font-medium mb-2">{children}</h3>,
            p: ({ children }) => <p className="mb-4">{children}</p>,
            a: ({ children, href }) => (
              <a href={href} className="text-blue-400 hover:text-blue-300 underline">
                {children}
              </a>
            ),
            ul: ({ children }) => <ul className="list-disc list-inside mb-4">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside mb-4">{children}</ol>,
            code: ({ inline, children }) => 
              inline ? (
                <code className="bg-gray-800 px-1 py-0.5 rounded text-sm">{children}</code>
              ) : (
                <pre className="bg-gray-800 p-3 rounded mb-4 overflow-x-auto">
                  <code className="text-sm">{children}</code>
                </pre>
              )
          }}
        >
          {content}
        </ReactMarkdown>
      ) : (
        <div className="whitespace-pre-wrap">{content}</div>
      )}
    </div>
  );
}

export default TextPanel;
export { TextPanel };