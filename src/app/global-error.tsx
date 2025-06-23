'use client';

import React, { useEffect } from 'react';

interface GlobalErrorProps {
  error?: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Root layout error:', error);
    }
    // In production, this would be sent to an error reporting service
  }, [error]);

  return (
    <html lang="en">
      <head>
        <style>{`
          body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
              'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
              sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          .error-container {
            background-color: #f9fafb;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 1rem;
          }
          .error-content {
            width: 100%;
            max-width: 28rem;
            text-align: center;
          }
          .error-icon {
            margin: 0 auto 2rem;
            height: 4rem;
            width: 4rem;
            color: #f87171;
          }
          .error-title {
            margin-bottom: 1rem;
            font-size: 1.5rem;
            font-weight: 700;
            color: #111827;
          }
          .error-message {
            margin-bottom: 2rem;
            color: #4b5563;
          }
          .button {
            width: 100%;
            padding: 0.5rem 1rem;
            margin-bottom: 1rem;
            border-radius: 0.375rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
            font-size: 1rem;
          }
          .button-primary {
            background-color: #2563eb;
            color: white;
          }
          .button-primary:hover {
            background-color: #1d4ed8;
          }
          .button-secondary {
            background-color: white;
            color: #374151;
            border: 1px solid #d1d5db;
          }
          .button-secondary:hover {
            background-color: #f9fafb;
          }
          .error-details {
            margin-top: 2rem;
            text-align: left;
          }
          .error-details summary {
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 500;
            color: #374151;
          }
          .error-details pre {
            margin-top: 0.5rem;
            padding: 1rem;
            background-color: #f3f4f6;
            border-radius: 0.25rem;
            font-size: 0.75rem;
            color: #4b5563;
            overflow: auto;
          }
        `}</style>
      </head>
      <body>
        <div className="error-container">
          <div className="error-content">
            <svg
              className="error-icon"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            
            <h1 className="error-title">
              Application Error
            </h1>
            
            <p className="error-message">
              A critical error occurred in the application. Please refresh the page or try again later.
            </p>
            
            <div>
              <button
                onClick={reset}
                className="button button-primary"
              >
                Try Again
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="button button-secondary"
              >
                Reload Application
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && error && (
              <details className="error-details">
                <summary>
                  Error Details (Development)
                </summary>
                <pre>
                  {error.message}
                  {error.stack && `\n\nStack trace:\n${error.stack}`}
                  {error.digest && `\n\nDigest: ${error.digest}`}
                </pre>
              </details>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}