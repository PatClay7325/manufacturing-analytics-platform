import { ChatInterface } from '@/components/ai/ChatInterface';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ollama AI Assistant - Manufacturing Analytics',
  description: 'Local AI interface for manufacturing data analysis using Ollama',
};

export default function OllamaChatPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Local AI Assistant
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Ask questions about your manufacturing data using local Ollama AI
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-green-50 px-3 py-1 rounded-full">
                  <span className="text-sm font-medium text-green-700">
                    🔒 100% Local & Private
                  </span>
                </div>
                <div className="bg-blue-50 px-3 py-1 rounded-full">
                  <span className="text-sm font-medium text-blue-700">
                    Powered by Ollama
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <ChatInterface className="h-[calc(100vh-16rem)]" />
          </div>

          {/* Sidebar with tips and examples */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Query Examples */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Example Queries</h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700 font-medium">OEE Analysis</p>
                  <p className="text-xs text-gray-500 mt-1">
                    &quot;Show me OEE trends for Line 1 over the past week&quot;
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700 font-medium">Quality Metrics</p>
                  <p className="text-xs text-gray-500 mt-1">
                    &quot;What are the top defect types causing quality issues?&quot;
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700 font-medium">Maintenance</p>
                  <p className="text-xs text-gray-500 mt-1">
                    &quot;Which equipment needs preventive maintenance?&quot;
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700 font-medium">Production</p>
                  <p className="text-xs text-gray-500 mt-1">
                    &quot;Compare actual vs planned production this month&quot;
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy Features */}
            <div className="bg-green-50 rounded-lg border border-green-200 p-6">
              <h3 className="font-semibold text-green-900 mb-4">🔒 Privacy First</h3>
              <ul className="space-y-2 text-sm text-green-700">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                  All AI processing happens locally
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                  No data sent to external services
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                  Air-gapped deployment ready
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                  Full audit trail maintained
                </li>
              </ul>
            </div>

            {/* Tips */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Tips for Better Results</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  Be specific about time ranges and equipment
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  Use manufacturing terminology (OEE, MTBF, etc.)
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  Ask for explanations if you need more context
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  Request specific visualizations or formats
                </li>
              </ul>
            </div>

            {/* Data Access Info */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Data Access</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-gray-700">Available Data:</p>
                  <ul className="mt-1 space-y-1 text-gray-600">
                    <li>• Equipment hierarchy and specs</li>
                    <li>• OEE metrics (hourly)</li>
                    <li>• Production quantities</li>
                    <li>• Quality and defect data</li>
                    <li>• Maintenance events</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Your Access:</p>
                  <p className="text-gray-600 mt-1">
                    Based on your role and assigned plants
                  </p>
                </div>
              </div>
            </div>

            {/* Model Info */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">AI Model</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Primary Model:</span>
                  <span className="font-medium">Manufacturing Expert</span>
                </div>
                <div className="flex justify-between">
                  <span>Base Model:</span>
                  <span className="font-medium">CodeLlama 7B</span>
                </div>
                <div className="flex justify-between">
                  <span>Hosting:</span>
                  <span className="font-medium">Local Ollama</span>
                </div>
                <div className="flex justify-between">
                  <span>Privacy:</span>
                  <span className="font-medium text-green-600">100% Local</span>
                </div>
                <div className="flex justify-between">
                  <span>Specialization:</span>
                  <span className="font-medium">ISO 22400 KPIs</span>
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">System Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span>Ollama Service:</span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-600 font-medium">Online</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Database:</span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-600 font-medium">Connected</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>GPU Acceleration:</span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-yellow-600 font-medium">Available</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}