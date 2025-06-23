import Link from 'next/link';

export default function HomePage() {
  const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:3001';

  const features = [
    {
      title: 'Equipment Management',
      description: 'Monitor and manage manufacturing equipment in real-time',
      href: '/equipment',
      icon: '🏭',
    },
    {
      title: 'Production Monitoring',
      description: 'Track production metrics, OEE, and performance',
      href: '/dashboards/production',
      icon: '📊',
    },
    {
      title: 'AI Assistant',
      description: 'Get insights and recommendations from AI',
      href: '/manufacturing-chat',
      icon: '🤖',
    },
    {
      title: 'Data Upload',
      description: 'Import production data from various sources',
      href: '/data-upload',
      icon: '📤',
    },
    {
      title: 'Alerts',
      description: 'Monitor and manage system alerts',
      href: '/alerts',
      icon: '🚨',
    },
    {
      title: 'Analytics Dashboards',
      description: 'Comprehensive analytics in Grafana',
      href: grafanaUrl,
      icon: '📈',
      external: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Manufacturing Analytics Platform
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Real-time monitoring, analytics, and AI-powered insights for modern manufacturing
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              target={feature.external ? '_blank' : undefined}
              rel={feature.external ? 'noopener noreferrer' : undefined}
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
              {feature.external && (
                <span className="inline-block mt-2 text-blue-600 text-sm">
                  Opens in Grafana →
                </span>
              )}
            </Link>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">✓</div>
              <p className="text-sm text-gray-600">Database</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">✓</div>
              <p className="text-sm text-gray-600">Grafana</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">✓</div>
              <p className="text-sm text-gray-600">Monitoring</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">✓</div>
              <p className="text-sm text-gray-600">AI Service</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
