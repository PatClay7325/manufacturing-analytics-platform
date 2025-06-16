import React from 'react';
import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Manufacturing Intelligence Platform</h3>
            <p className="text-gray-300 mb-4">
              Advanced analytics and AI-driven insights for modern manufacturing operations.
            </p>
            <p className="text-gray-400 text-sm">
              © {currentYear} Manufacturing Intelligence Platform. All rights reserved.
            </p>
          </div>
          
          <div>
            <h4 className="text-base font-semibold mb-4">Platform</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/dashboard" className="text-gray-300 hover:text-white transition duration-150">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/equipment" className="text-gray-300 hover:text-white transition duration-150">
                  Equipment
                </Link>
              </li>
              <li>
                <Link href="/alerts" className="text-gray-300 hover:text-white transition duration-150">
                  Alerts
                </Link>
              </li>
              <li>
                <Link href="/manufacturing-chat" className="text-gray-300 hover:text-white transition duration-150">
                  AI Assistant
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-base font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-gray-300 hover:text-white transition duration-150">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-300 hover:text-white transition duration-150">
                  API Reference
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-300 hover:text-white transition duration-150">
                  Support
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-300 hover:text-white transition duration-150">
                  Status
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-700 flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-gray-400 mb-4 md:mb-0">
            Designed for industrial excellence
          </div>
          <div className="flex space-x-6">
            <Link href="#" className="text-gray-400 hover:text-white transition duration-150">
              Privacy Policy
            </Link>
            <Link href="#" className="text-gray-400 hover:text-white transition duration-150">
              Terms of Service
            </Link>
            <Link href="#" className="text-gray-400 hover:text-white transition duration-150">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}