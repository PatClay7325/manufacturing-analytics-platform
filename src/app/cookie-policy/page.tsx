import React from 'react';
import dynamic from 'next/dynamic';

// Import PageFallback with error handling
const PageFallback = dynamic(
  () => import('@/components/common/PageFallback'),
  { 
    ssr: true,
    loading: () => <div className="p-8 text-center">Loading...</div>
  }
);

export default function CookiePolicyPage() {
  // Uncomment to use fallback for testing
  // return <PageFallback title="Cookie Policy Coming Soon" message="Our cookie policy page is currently being updated." />;
  
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Cookie Policy</h1>
        <p className="text-lg text-gray-600">
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Introduction */}
      <div className="bg-blue-50 rounded-lg p-6 mb-8">
        <p className="text-gray-700">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Adaptive Factory AI Solutions, Inc. ("we", "our", or "us") uses cookies and similar tracking technologies on our website and services. This Cookie Policy explains what cookies are, how we use them, and your choices regarding their use.
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-lg max-w-none">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">1. Lorem Ipsum Dolor Sit Amet</h2>
          <p className="text-gray-700 mb-4">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
          
          <div className="bg-gray-100 rounded-lg p-6 mb-4">
            <h3 className="font-semibold mb-2">What are cookies?</h3>
            <p className="text-gray-700">
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">2. Consectetur Adipiscing Elit</h2>
          <p className="text-gray-700 mb-4">
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
          </p>
          
          <table className="w-full border-collapse mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left">Cookie Type</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Purpose</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-2">Essential Cookies</td>
                <td className="border border-gray-300 px-4 py-2">Lorem ipsum dolor sit amet, consectetur adipiscing elit</td>
                <td className="border border-gray-300 px-4 py-2">Session</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2">Performance Cookies</td>
                <td className="border border-gray-300 px-4 py-2">Sed do eiusmod tempor incididunt ut labore</td>
                <td className="border border-gray-300 px-4 py-2">1 year</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2">Functionality Cookies</td>
                <td className="border border-gray-300 px-4 py-2">Et dolore magna aliqua ut enim ad minim veniam</td>
                <td className="border border-gray-300 px-4 py-2">6 months</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2">Targeting Cookies</td>
                <td className="border border-gray-300 px-4 py-2">Quis nostrud exercitation ullamco laboris</td>
                <td className="border border-gray-300 px-4 py-2">2 years</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">3. Sed Do Eiusmod Tempor</h2>
          
          <h3 className="text-xl font-semibold mb-3">3.1 Essential Cookies</h3>
          <p className="text-gray-700 mb-4">
            Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.
          </p>
          
          <h3 className="text-xl font-semibold mb-3">3.2 Performance and Analytics Cookies</h3>
          <p className="text-gray-700 mb-4">
            At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.
          </p>
          
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Lorem ipsum dolor sit amet, consectetur adipiscing elit</li>
            <li>Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua</li>
            <li>Ut enim ad minim veniam, quis nostrud exercitation</li>
            <li>Ullamco laboris nisi ut aliquip ex ea commodo consequat</li>
          </ul>
          
          <h3 className="text-xl font-semibold mb-3">3.3 Functionality Cookies</h3>
          <p className="text-gray-700 mb-4">
            Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus.
          </p>
          
          <h3 className="text-xl font-semibold mb-3">3.4 Targeting and Advertising Cookies</h3>
          <p className="text-gray-700 mb-4">
            Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">4. Incididunt Ut Labore</h2>
          <p className="text-gray-700 mb-4">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Third-party cookies used on our platform include:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Google Analytics</h4>
              <p className="text-gray-600 text-sm">Lorem ipsum dolor sit amet, consectetur adipiscing elit</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Facebook Pixel</h4>
              <p className="text-gray-600 text-sm">Sed do eiusmod tempor incididunt ut labore</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">LinkedIn Insight</h4>
              <p className="text-gray-600 text-sm">Et dolore magna aliqua ut enim ad minim</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Hotjar</h4>
              <p className="text-gray-600 text-sm">Quis nostrud exercitation ullamco laboris</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">5. Et Dolore Magna Aliqua</h2>
          <p className="text-gray-700 mb-4">
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. You have several options to manage cookies:
          </p>
          
          <div className="space-y-4">
            <div className="border-l-4 border-blue-600 pl-6">
              <h3 className="font-semibold mb-2">Browser Settings</h3>
              <p className="text-gray-700">
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Most web browsers allow you to control cookies through their settings preferences.
              </p>
            </div>
            
            <div className="border-l-4 border-green-600 pl-6">
              <h3 className="font-semibold mb-2">Cookie Preference Center</h3>
              <p className="text-gray-700">
                Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
              </p>
            </div>
            
            <div className="border-l-4 border-purple-600 pl-6">
              <h3 className="font-semibold mb-2">Opt-Out Tools</h3>
              <p className="text-gray-700">
                Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">6. Ut Enim Ad Minim Veniam</h2>
          <p className="text-gray-700 mb-4">
            Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
          </p>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 mb-4">
            <p className="text-gray-700">
              <strong>Note:</strong> Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">7. Quis Nostrud Exercitation</h2>
          <p className="text-gray-700 mb-4">
            At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.
          </p>
          
          <p className="text-gray-700 mb-4">
            Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-4">8. Contact Information</h2>
          <p className="text-gray-700 mb-4">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. If you have any questions about this Cookie Policy, please contact us:
          </p>
          
          <div className="bg-gray-100 rounded-lg p-6">
            <p className="text-gray-700">
              <strong>Adaptive Factory AI Solutions, Inc.</strong><br />
              Email: privacy@adaptivefactory.ai<br />
              Phone: +1 (555) 123-4567<br />
              Address: 123 Lorem Ipsum St, Dolor Sit, AM 12345
            </p>
          </div>
        </div>

        {/* Cookie Preferences Button */}
        <div className="text-center mt-12">
          <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors mr-4">
            Manage Cookie Preferences
          </button>
          <button className="bg-gray-200 text-gray-800 px-8 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors">
            Accept All Cookies
          </button>
        </div>
      </div>
    </div>
  );
}