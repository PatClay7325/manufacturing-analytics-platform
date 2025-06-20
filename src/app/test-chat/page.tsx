'use client';

import React, { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';

export default function TestChat() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [streamingText, setStreamingText] = useState('');

  // Test direct Ollama API
  const testDirectOllama = async () => {
    setIsLoading(true);
    setError('');
    setResponse('');
    
    try {
      const res = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemma:2b',
          prompt: message || 'Say hello',
          stream: false
        }),
      });
      
      const data = await res?.json();
      setResponse(data?.response || 'No response');
    } catch (err) {
      setError('Direct Ollama test failed: ' + err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Test streaming API
  const testStreamingAPI = async () => {
    setIsLoading(true);
    setError('');
    setStreamingText('');
    
    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: message || 'Say hello' }
          ],
          stream: true,
        }),
      });

      if (!res?.ok) {
        throw new Error(`API error: ${res?.status}`);
      }

      const reader = res?.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { done, value } = await reader?.read();
        if (done) break;

        const chunk = decoder?.decode(value);
        const lines = chunk?.split('\n');
        
        for (const line of lines) {
          if (line?.startsWith('data: ')) {
            const data = line?.slice(6);
            if (data === '[DONE]') break;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed?.choices?.[0]?.delta?.content || '';
              setStreamingText(prev => prev + content);
            } catch (e) {
              // Skip
            }
          }
        }
      }
    } catch (err) {
      setError('Streaming API test failed: ' + err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Test regular chat API
  const testChatAPI = async () => {
    setIsLoading(true);
    setError('');
    setResponse('');
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: message || 'Say hello' }
          ],
        }),
      });
      
      const data = await res?.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setError('Chat API test failed: ' + err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Test direct streaming API
  const testDirectStreamingAPI = async () => {
    setIsLoading(true);
    setError('');
    setStreamingText('');
    
    try {
      const res = await fetch('/api/chat/stream-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: message || 'Say hello' }
          ],
          stream: true,
        }),
      });

      if (!res?.ok) {
        throw new Error(`API error: ${res?.status}`);
      }

      const reader = res?.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { done, value } = await reader?.read();
        if (done) break;

        const chunk = decoder?.decode(value);
        const lines = chunk?.split('\n');
        
        for (const line of lines) {
          if (line?.startsWith('data: ')) {
            const data = line?.slice(6);
            if (data === '[DONE]') break;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed?.choices?.[0]?.delta?.content || '';
              setStreamingText(prev => prev + content);
            } catch (e) {
              // Skip
            }
          }
        }
      }
    } catch (err) {
      setError('Direct Streaming API test failed: ' + err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Test database connectivity
  const testDatabase = async () => {
    setIsLoading(true);
    setError('');
    setResponse('');
    
    try {
      const res = await fetch('/api/test-db');
      const data = await res?.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setError('Database test failed: ' + err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Test manufacturing chat with DB
  const testManufacturingChat = async () => {
    setIsLoading(true);
    setError('');
    setStreamingText('');
    
    try {
      const res = await fetch('/api/chat/manufacturing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: message || 'What is the current OEE?' }
          ],
          stream: true,
        }),
      });

      if (!res?.ok) {
        throw new Error(`API error: ${res?.status}`);
      }

      const reader = res?.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { done, value } = await reader?.read();
        if (done) break;

        const chunk = decoder?.decode(value);
        const lines = chunk?.split('\n');
        
        for (const line of lines) {
          if (line?.startsWith('data: ')) {
            const data = line?.slice(6);
            if (data === '[DONE]') break;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed?.choices?.[0]?.delta?.content || '';
              setStreamingText(prev => prev + content);
            } catch (e) {
              // Skip
            }
          }
        }
      }
    } catch (err) {
      setError('Manufacturing Chat test failed: ' + err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageLayout title="Chat API Test">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Notice Banner */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" xmlns="http://www?.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                For comprehensive diagnostics and enterprise features, visit the{' '}
                <a href="/diagnostics" className="font-semibold underline hover:text-blue-900">
                  Enterprise Diagnostics Page
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Test Message</h2>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e?.target.value)}
            placeholder="Enter a test message..."
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        {/* Test Buttons */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Test Options</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={testDirectOllama}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Test Direct Ollama
            </button>
            <button
              onClick={testDatabase}
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              🗄️ Test Database Connection
            </button>
            <button
              onClick={testStreamingAPI}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Test Streaming API
            </button>
            <button
              onClick={testManufacturingChat}
              disabled={isLoading}
              className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50"
            >
              🏭 Test Manufacturing Chat (DB)
            </button>
            <button
              onClick={testChatAPI}
              disabled={isLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              Test Chat API
            </button>
            <button
              onClick={testDirectStreamingAPI}
              disabled={isLoading}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
            >
              Test Direct Streaming
            </button>
          </div>
        </div>

        {/* Status */}
        {isLoading && (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-yellow-800">Loading...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Response */}
        {response && (
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Response:</h3>
            <pre className="whitespace-pre-wrap text-sm">{response}</pre>
          </div>
        )}

        {/* Streaming Text */}
        {streamingText && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Streaming Response:</h3>
            <p className="whitespace-pre-wrap">{streamingText}</p>
          </div>
        )}

        {/* API Info */}
        <div className="bg-gray-50 p-4 rounded-lg text-sm">
          <h3 className="font-semibold mb-2">API Endpoints:</h3>
          <ul className="space-y-1">
            <li>• Direct Ollama: http://localhost:11434/api/chat</li>
            <li>• Database Test: /api/test-db (checks Prisma/PostgreSQL)</li>
            <li>• Manufacturing Chat: /api/chat/manufacturing (with DB queries)</li>
            <li>• Streaming API: /api/chat/stream (uses OllamaStreamingProvider)</li>
            <li>• Direct Streaming: /api/chat/stream-direct (direct Ollama proxy)</li>
            <li>• Chat API: /api/chat</li>
          </ul>
          <div className="mt-3 pt-3 border-t">
            <p className="font-semibold">Database Integration:</p>
            <p className="text-xs mt-1">The Manufacturing Chat endpoint automatically queries PostgreSQL for:</p>
            <ul className="text-xs mt-1 ml-4">
              <li>• Current OEE calculations</li>
              <li>• Equipment status</li>
              <li>• Active alerts</li>
              <li>• Production metrics</li>
            </ul>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}