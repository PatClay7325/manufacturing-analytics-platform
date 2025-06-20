'use client';

import React from 'react';
import Link from 'next/link';

export default function Documentation() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-12 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Documentation
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Comprehensive documentation for Manufacturing Analytics Platform, including guides, tutorials, and reference materials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/documentation/api-reference" className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">API Reference</h3>
          <p className="text-gray-600">Detailed API documentation for developers</p>
        </Link>

        <div className="block p-6 bg-white rounded-lg shadow">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Getting Started</h3>
          <p className="text-gray-600">Quick start guides and tutorials</p>
        </div>

        <div className="block p-6 bg-white rounded-lg shadow">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Best Practices</h3>
          <p className="text-gray-600">Industry best practices and recommendations</p>
        </div>

        <div className="block p-6 bg-white rounded-lg shadow">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Troubleshooting</h3>
          <p className="text-gray-600">Common issues and solutions</p>
        </div>

        <div className="block p-6 bg-white rounded-lg shadow">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Release Notes</h3>
          <p className="text-gray-600">Latest updates and changes</p>
        </div>

        <div className="block p-6 bg-white rounded-lg shadow">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">FAQ</h3>
          <p className="text-gray-600">Frequently asked questions</p>
        </div>
      </div>
    </div>
  );
}