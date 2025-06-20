import React from 'react';
import Link from 'next/link';

export default function SupportPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Support Center</h1>
        <p className="text-lg text-gray-600">
          Get help with Adaptive Factory AI Solutions platform
        </p>
      </div>

      {/* Contact Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-lg shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
          <div className="text-4xl mb-4">📧</div>
          <h3 className="text-xl font-semibold mb-2">Email Support</h3>
          <p className="text-gray-600 mb-4">Lorem ipsum dolor sit amet consectetur</p>
          <a href="mailto:support@adaptivefactory?.ai" className="text-blue-600 hover:text-blue-800 font-medium">
            support@adaptivefactory?.ai
          </a>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
          <div className="text-4xl mb-4">💬</div>
          <h3 className="text-xl font-semibold mb-2">Live Chat</h3>
          <p className="text-gray-600 mb-4">Lorem ipsum dolor sit amet consectetur</p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
            Start Chat
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
          <div className="text-4xl mb-4">📞</div>
          <h3 className="text-xl font-semibold mb-2">Phone Support</h3>
          <p className="text-gray-600 mb-4">Lorem ipsum dolor sit amet consectetur</p>
          <p className="font-medium">+1 (555) 123-4567</p>
        </div>
      </div>

      {/* Support Resources */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Support Resources</h2>
        
        <div className="space-y-6">
          <div className="border-l-4 border-blue-600 pl-6">
            <h3 className="text-xl font-semibold mb-2">Getting Started Guide</h3>
            <p className="text-gray-600 mb-3">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
            </p>
            <Link href="/documentation" className="text-blue-600 hover:text-blue-800 font-medium">
              View Documentation →
            </Link>
          </div>

          <div className="border-l-4 border-green-600 pl-6">
            <h3 className="text-xl font-semibold mb-2">Video Tutorials</h3>
            <p className="text-gray-600 mb-3">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
            </p>
            <Link href="/tutorials" className="text-blue-600 hover:text-blue-800 font-medium">
              Watch Tutorials →
            </Link>
          </div>

          <div className="border-l-4 border-purple-600 pl-6">
            <h3 className="text-xl font-semibold mb-2">API Reference</h3>
            <p className="text-gray-600 mb-3">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
            <Link href="/documentation/api-reference" className="text-blue-600 hover:text-blue-800 font-medium">
              Explore API →
            </Link>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-gray-50 rounded-lg p-8 mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
        
        <div className="space-y-4">
          <details className="bg-white rounded-lg p-4 shadow">
            <summary className="font-semibold cursor-pointer hover:text-blue-600">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit?
            </summary>
            <p className="mt-3 text-gray-600">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
          </details>

          <details className="bg-white rounded-lg p-4 shadow">
            <summary className="font-semibold cursor-pointer hover:text-blue-600">
              Ut enim ad minim veniam, quis nostrud exercitation?
            </summary>
            <p className="mt-3 text-gray-600">
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
          </details>

          <details className="bg-white rounded-lg p-4 shadow">
            <summary className="font-semibold cursor-pointer hover:text-blue-600">
              Sed ut perspiciatis unde omnis iste natus error?
            </summary>
            <p className="mt-3 text-gray-600">
              Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
            </p>
          </details>

          <details className="bg-white rounded-lg p-4 shadow">
            <summary className="font-semibold cursor-pointer hover:text-blue-600">
              Nemo enim ipsam voluptatem quia voluptas sit aspernatur?
            </summary>
            <p className="mt-3 text-gray-600">
              At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.
            </p>
          </details>
        </div>
      </div>

      {/* Support Ticket Form */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit a Support Ticket</h2>
        
        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Lorem ipsum"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="lorem@ipsum?.com"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              id="category"
              name="category"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option>Technical Support</option>
              <option>Billing</option>
              <option>Feature Request</option>
              <option>Other</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Lorem ipsum dolor sit amet, consectetur adipiscing elit..."
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Submit Ticket
          </button>
        </form>
      </div>
    </div>
  );
}