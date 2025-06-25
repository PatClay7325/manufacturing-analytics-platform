'use client';

export default function TestIframePage() {
  const grafanaUrl = 'http://localhost:3001/d/manufacturing-overview/manufacturing-overview?orgId=1&kiosk=1&theme=dark';

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <h1 className="text-2xl font-bold mb-4">Direct Grafana Iframe Test</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4">
        <h2 className="text-lg font-semibold mb-2">Test Links</h2>
        <ul className="space-y-2">
          <li>
            <a 
              href={grafanaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700"
            >
              Open Grafana Dashboard Directly →
            </a>
          </li>
          <li>
            <a 
              href="/grafana/manufacturing-overview"
              className="text-blue-600 hover:text-blue-700"
            >
              View through Next.js Integration →
            </a>
          </li>
        </ul>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <h2 className="text-lg font-semibold p-4 border-b dark:border-gray-700">
          Direct Iframe (if blank, check browser console for errors)
        </h2>
        <iframe
          src={grafanaUrl}
          width="100%"
          height="800"
          frameBorder="0"
          className="w-full"
          title="Grafana Dashboard"
        />
      </div>
    </div>
  );
}