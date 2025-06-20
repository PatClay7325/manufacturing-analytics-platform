import Link from 'next/link';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-12">
        <div className="md:flex">
          <div className="p-8 md:p-12 md:w-1/2">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Adaptive Factory AI Solutions, Inc.
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              Optimize your manufacturing operations with real-time insights, 
              advanced Analytics, and AI-driven recommendations.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link 
                href="/dashboard" 
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md transition duration-150 ease-in-out"
              >
                Explore Dashboard
              </Link>
              <Link 
                href="/manufacturing-chat" 
                className="bg-white hover:bg-gray-100 text-blue-600 border border-blue-600 font-medium py-2 px-6 rounded-md transition duration-150 ease-in-out"
              >
                Try AI Assistant
              </Link>
            </div>
          </div>
          <div className="bg-gray-200 md:w-1/2 flex items-center justify-center p-12">
            <div className="text-center">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-gray-600">Interactive dashboard visualization</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <h2 className="text-2xl font-bold text-gray-900 mb-8">Key Features</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition duration-150">
          <div className="text-4xl mb-4 text-blue-600">📊</div>
          <h3 className="mb-3 text-xl font-semibold text-gray-800">
            Real-time Dashboards
          </h3>
          <p className="text-gray-600">
            Monitor OEE, production metrics, and key performance indicators in real-time.
          </p>
          <Link 
            href="/dashboard" 
            className="mt-4 inline-block text-blue-600 hover:text-blue-800 font-medium"
          >
            View Dashboards →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition duration-150">
          <div className="text-4xl mb-4 text-blue-600">🤖</div>
          <h3 className="mb-3 text-xl font-semibold text-gray-800">
            AI Assistant
          </h3>
          <p className="text-gray-600">
            Get insights and recommendations through natural language conversations.
          </p>
          <Link 
            href="/manufacturing-chat" 
            className="mt-4 inline-block text-blue-600 hover:text-blue-800 font-medium"
          >
            Open Chat →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition duration-150">
          <div className="text-4xl mb-4 text-blue-600">⚙️</div>
          <h3 className="mb-3 text-xl font-semibold text-gray-800">
            Equipment Monitoring
          </h3>
          <p className="text-gray-600">
            Track equipment status, performance, and maintenance schedules.
          </p>
          <Link 
            href="/equipment" 
            className="mt-4 inline-block text-blue-600 hover:text-blue-800 font-medium"
          >
            Monitor Equipment →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition duration-150">
          <div className="text-4xl mb-4 text-blue-600">🔔</div>
          <h3 className="mb-3 text-xl font-semibold text-gray-800">
            Alerts & Notifications
          </h3>
          <p className="text-gray-600">
            Stay informed about critical issues and maintenance requirements.
          </p>
          <Link 
            href="/alerts" 
            className="mt-4 inline-block text-blue-600 hover:text-blue-800 font-medium"
          >
            View Alerts →
          </Link>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-gray-100 rounded-lg p-8 mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Benefits</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-500 flex items-center justify-center text-white font-bold mr-3">
              ✓
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">Increased Productivity</h3>
              <p className="text-gray-600">Optimize processes and reduce downtime with data-driven insights.</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-500 flex items-center justify-center text-white font-bold mr-3">
              ✓
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">Quality Improvement</h3>
              <p className="text-gray-600">Identify and address quality issues before they impact production.</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-500 flex items-center justify-center text-white font-bold mr-3">
              ✓
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">Cost Reduction</h3>
              <p className="text-gray-600">Lower maintenance costs and optimize resource utilization.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Documentation & Resources Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Documentation & Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition duration-150">
            <div className="text-4xl mb-4 text-blue-600">📚</div>
            <h3 className="mb-3 text-xl font-semibold text-gray-800">
              Comprehensive Documentation
            </h3>
            <p className="text-gray-600 mb-4">
              Access detailed guides, tutorials, and reference materials to help you get the most out of the platform.
            </p>
            <Link 
              href="/documentation" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              View Documentation
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition duration-150">
            <div className="text-4xl mb-4 text-blue-600">🔌</div>
            <h3 className="mb-3 text-xl font-semibold text-gray-800">
              API Reference
            </h3>
            <p className="text-gray-600 mb-4">
              Integrate with our platform using our comprehensive API documentation with examples in multiple languages.
            </p>
            <Link 
              href="/documentation/api-reference" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Explore API Reference
            </Link>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to transform your manufacturing operations?</h2>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          Start exploring the platform to see how our intelligent manufacturing solution can help you 
          achieve operational excellence.
        </p>
        <Link 
          href="/dashboard" 
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-md transition duration-150 ease-in-out inline-block"
        >
          Get Started Now
        </Link>
      </div>
    </div>
  );
}