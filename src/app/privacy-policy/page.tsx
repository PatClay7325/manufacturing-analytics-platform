import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
        <p className="text-lg text-gray-600">
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Content */}
      <div className="prose prose-lg max-w-none">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">1. Lorem Ipsum Dolor Sit Amet</h2>
          <p className="text-gray-700 mb-4">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
          </p>
          <p className="text-gray-700 mb-4">
            Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">2. Consectetur Adipiscing Elit</h2>
          <p className="text-gray-700 mb-4">
            Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.
          </p>
          
          <h3 className="text-xl font-semibold mb-3 mt-6">2.1 Ut Enim Ad Minima Veniam</h3>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Lorem ipsum dolor sit amet, consectetur adipiscing elit</li>
            <li>Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua</li>
            <li>Ut enim ad minim veniam, quis nostrud exercitation</li>
            <li>Ullamco laboris nisi ut aliquip ex ea commodo consequat</li>
            <li>Duis aute irure dolor in reprehenderit in voluptate velit</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">2.2 Quis Nostrud Exercitation</h3>
          <p className="text-gray-700 mb-4">
            At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">3. Sed Do Eiusmod Tempor</h2>
          <p className="text-gray-700 mb-4">
            Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus.
          </p>
          
          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4">
            <p className="text-gray-700">
              <strong>Important:</strong> Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.
            </p>
          </div>

          <p className="text-gray-700 mb-4">
            Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">4. Incididunt Ut Labore</h2>
          <p className="text-gray-700 mb-4">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
          
          <table className="w-full border-collapse mb-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left">Lorem Ipsum</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Dolor Sit</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Amet Consectetur</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-2">Adipiscing elit</td>
                <td className="border border-gray-300 px-4 py-2">Sed do eiusmod</td>
                <td className="border border-gray-300 px-4 py-2">Tempor incididunt</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2">Ut labore et</td>
                <td className="border border-gray-300 px-4 py-2">Dolore magna</td>
                <td className="border border-gray-300 px-4 py-2">Aliqua ut enim</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2">Ad minim veniam</td>
                <td className="border border-gray-300 px-4 py-2">Quis nostrud</td>
                <td className="border border-gray-300 px-4 py-2">Exercitation ullamco</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">5. Et Dolore Magna Aliqua</h2>
          <p className="text-gray-700 mb-4">
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          </p>
          
          <ol className="list-decimal list-inside text-gray-700 mb-4 space-y-2">
            <li>Lorem ipsum dolor sit amet, consectetur adipiscing elit</li>
            <li>Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua</li>
            <li>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris</li>
            <li>Nisi ut aliquip ex ea commodo consequat</li>
            <li>Duis aute irure dolor in reprehenderit in voluptate velit esse</li>
          </ol>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">6. Ut Enim Ad Minim Veniam</h2>
          <p className="text-gray-700 mb-4">
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.
          </p>
          
          <div className="bg-gray-100 rounded-lg p-6 mb-4">
            <h3 className="font-semibold mb-2">Contact Information</h3>
            <p className="text-gray-700">
              Lorem ipsum dolor sit amet:<br />
              Email: privacy@adaptivefactory?.ai<br />
              Phone: +1 (555) 123-4567<br />
              Address: 123 Lorem Ipsum St, Dolor Sit, AM 12345
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-4">7. Quis Nostrud Exercitation</h2>
          <p className="text-gray-700 mb-4">
            At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga.
          </p>
          <p className="text-gray-700 mb-4">
            Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus.
          </p>
          <p className="text-gray-700">
            Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat.
          </p>
        </div>
      </div>
  );
}