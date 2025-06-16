import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29.82-5.718 2.172m-.727 3.656L12.01 12.01l6.727 6.727m0 0v-3.182m0 3.182h-3.182"
            />
          </svg>
        </div>
        
        <h1 className="mb-4 text-6xl font-bold text-gray-900">404</h1>
        
        <h2 className="mb-4 text-2xl font-bold text-gray-900">
          Page Not Found
        </h2>
        
        <p className="mb-8 text-gray-600">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div className="space-y-4">
          <Link
            href="/"
            className="inline-block w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Go to Homepage
          </Link>
          
          <Link
            href="/dashboard"
            className="inline-block w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}