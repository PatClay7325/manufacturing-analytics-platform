'use client';

import { useState } from 'react';

export default function ChatTestPage() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testChat = async () => {
    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const res = await fetch('/api/chat/conversational', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message || 'Show me OEE for all equipment today',
          sessionId: 'test-' + Date.now(),
          userId: 'test-user'
        })
      });

      const data = await res.json();
      setResponse(data);
      
      if (!res.ok) {
        setError(`HTTP ${res.status}: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testDebugEndpoint = async () => {
    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const res = await fetch('/api/chat/conversational/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message || 'Test message',
          sessionId: 'debug-' + Date.now(),
          userId: 'debug-user'
        })
      });

      const data = await res.json();
      setResponse(data);
      
      if (!res.ok) {
        setError(`HTTP ${res.status}: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Chat API Test</h1>
      
      <div className="mb-6">
        <label className="block mb-2">Test Message:</label>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Show me OEE for all equipment today"
          className="w-full p-2 border rounded"
        />
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={testChat}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Conversational API'}
        </button>
        
        <button
          onClick={testDebugEndpoint}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Debug Endpoint'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {response && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-100 rounded">
            <h3 className="font-bold mb-2">Response Content:</h3>
            <p className="whitespace-pre-wrap">
              {response.message || response.response || response.error || 'No content'}
            </p>
          </div>

          <div className="p-4 bg-blue-50 rounded">
            <h3 className="font-bold mb-2">Response Details:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {response.confidence && (
              <div className="p-4 bg-green-50 rounded">
                <h4 className="font-semibold">Confidence</h4>
                <p>{(response.confidence * 100).toFixed(0)}%</p>
              </div>
            )}
            
            {response.selfCritique?.score && (
              <div className="p-4 bg-purple-50 rounded">
                <h4 className="font-semibold">Self-Critique Score</h4>
                <p>{response.selfCritique.score}/10</p>
              </div>
            )}
          </div>

          {response.suggestions && response.suggestions.length > 0 && (
            <div className="p-4 bg-yellow-50 rounded">
              <h4 className="font-semibold mb-2">Suggestions:</h4>
              <ul className="list-disc list-inside">
                {response.suggestions.map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}