import React from 'react';

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
        <p className="text-lg text-gray-600">
          Effective Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Table of Contents */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Table of Contents</h2>
        <nav className="space-y-2">
          <a href="#section1" className="block text-blue-600 hover:text-blue-800">1. Lorem Ipsum Dolor Sit Amet</a>
          <a href="#section2" className="block text-blue-600 hover:text-blue-800">2. Consectetur Adipiscing Elit</a>
          <a href="#section3" className="block text-blue-600 hover:text-blue-800">3. Sed Do Eiusmod Tempor</a>
          <a href="#section4" className="block text-blue-600 hover:text-blue-800">4. Incididunt Ut Labore Et Dolore</a>
          <a href="#section5" className="block text-blue-600 hover:text-blue-800">5. Magna Aliqua Ut Enim</a>
          <a href="#section6" className="block text-blue-600 hover:text-blue-800">6. Ad Minim Veniam Quis</a>
          <a href="#section7" className="block text-blue-600 hover:text-blue-800">7. Nostrud Exercitation Ullamco</a>
          <a href="#section8" className="block text-blue-600 hover:text-blue-800">8. Laboris Nisi Ut Aliquip</a>
          <a href="#section9" className="block text-blue-600 hover:text-blue-800">9. Ex Ea Commodo Consequat</a>
          <a href="#section10" className="block text-blue-600 hover:text-blue-800">10. Duis Aute Irure Dolor</a>
        </nav>
      </div>

      {/* Content */}
      <div className="prose prose-lg max-w-none">
        <div id="section1" className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">1. Lorem Ipsum Dolor Sit Amet</h2>
          <p className="text-gray-700 mb-4">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
          </p>
          <p className="text-gray-700 mb-4">
            Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
          </p>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 my-4">
            <p className="text-gray-700">
              <strong>Important Notice:</strong> Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
            </p>
          </div>
        </div>

        <div id="section2" className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">2. Consectetur Adipiscing Elit</h2>
          
          <h3 className="text-xl font-semibold mb-3">2.1 Eligibility</h3>
          <p className="text-gray-700 mb-4">
            At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga.
          </p>
          
          <h3 className="text-xl font-semibold mb-3">2.2 Account Registration</h3>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            <li>Lorem ipsum dolor sit amet, consectetur adipiscing elit</li>
            <li>Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua</li>
            <li>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris</li>
            <li>Nisi ut aliquip ex ea commodo consequat</li>
            <li>Duis aute irure dolor in reprehenderit in voluptate velit esse</li>
          </ul>
          
          <h3 className="text-xl font-semibold mb-3">2.3 User Responsibilities</h3>
          <p className="text-gray-700 mb-4">
            Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus.
          </p>
        </div>

        <div id="section3" className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">3. Sed Do Eiusmod Tempor</h2>
          <p className="text-gray-700 mb-4">
            Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat.
          </p>
          
          <div className="bg-blue-50 rounded-lg p-6 mb-4">
            <h3 className="font-semibold mb-2">Permitted Use</h3>
            <ol className="list-decimal list-inside text-gray-700 space-y-2">
              <li>Lorem ipsum dolor sit amet, consectetur adipiscing elit</li>
              <li>Sed do eiusmod tempor incididunt ut labore</li>
              <li>Et dolore magna aliqua ut enim ad minim veniam</li>
              <li>Quis nostrud exercitation ullamco laboris nisi</li>
            </ol>
          </div>
          
          <div className="bg-red-50 rounded-lg p-6">
            <h3 className="font-semibold mb-2">Prohibited Use</h3>
            <ol className="list-decimal list-inside text-gray-700 space-y-2">
              <li>Ut aliquip ex ea commodo consequat</li>
              <li>Duis aute irure dolor in reprehenderit</li>
              <li>In voluptate velit esse cillum dolore</li>
              <li>Eu fugiat nulla pariatur excepteur sint</li>
            </ol>
          </div>
        </div>

        <div id="section4" className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">4. Incididunt Ut Labore Et Dolore</h2>
          <p className="text-gray-700 mb-4">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
          
          <table className="w-full border-collapse mb-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left">Service Level</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Lorem Ipsum</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Dolor Sit Amet</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-2">Basic</td>
                <td className="border border-gray-300 px-4 py-2">Consectetur adipiscing</td>
                <td className="border border-gray-300 px-4 py-2">$99/month</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2">Professional</td>
                <td className="border border-gray-300 px-4 py-2">Sed do eiusmod tempor</td>
                <td className="border border-gray-300 px-4 py-2">$299/month</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2">Enterprise</td>
                <td className="border border-gray-300 px-4 py-2">Incididunt ut labore</td>
                <td className="border border-gray-300 px-4 py-2">Contact Us</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div id="section5" className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">5. Magna Aliqua Ut Enim</h2>
          <p className="text-gray-700 mb-4">
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          </p>
          
          <h3 className="text-xl font-semibold mb-3">5.1 Intellectual Property Rights</h3>
          <p className="text-gray-700 mb-4">
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
          </p>
          
          <h3 className="text-xl font-semibold mb-3">5.2 User Generated Content</h3>
          <p className="text-gray-700 mb-4">
            Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.
          </p>
        </div>

        <div id="section6" className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">6. Ad Minim Veniam Quis</h2>
          <p className="text-gray-700 mb-4">
            At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi.
          </p>
          
          <div className="bg-gray-100 rounded-lg p-6 mb-4">
            <h3 className="font-semibold mb-3">Limitation of Liability</h3>
            <p className="text-gray-700 mb-2">
              <strong>IN NO EVENT SHALL ADAPTIVE FACTORY AI SOLUTIONS, INC. BE LIABLE FOR:</strong>
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Lorem ipsum dolor sit amet, consectetur adipiscing elit</li>
              <li>Sed do eiusmod tempor incididunt ut labore et dolore</li>
              <li>Magna aliqua ut enim ad minim veniam, quis nostrud</li>
              <li>Exercitation ullamco laboris nisi ut aliquip ex ea</li>
            </ul>
          </div>
        </div>

        <div id="section7" className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">7. Nostrud Exercitation Ullamco</h2>
          <p className="text-gray-700 mb-4">
            Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus.
          </p>
          
          <h3 className="text-xl font-semibold mb-3">7.1 Indemnification</h3>
          <p className="text-gray-700 mb-4">
            Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus.
          </p>
          
          <h3 className="text-xl font-semibold mb-3">7.2 Termination</h3>
          <p className="text-gray-700 mb-4">
            Ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
        </div>

        <div id="section8" className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">8. Laboris Nisi Ut Aliquip</h2>
          <p className="text-gray-700 mb-4">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
          
          <div className="border-2 border-gray-300 rounded-lg p-6 mb-4">
            <h3 className="font-semibold mb-2">Dispute Resolution</h3>
            <p className="text-gray-700 mb-3">
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
            <p className="text-gray-700">
              <strong>Arbitration:</strong> Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis.
            </p>
          </div>
        </div>

        <div id="section9" className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">9. Ex Ea Commodo Consequat</h2>
          <p className="text-gray-700 mb-4">
            Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.
          </p>
          
          <h3 className="text-xl font-semibold mb-3">9.1 Governing Law</h3>
          <p className="text-gray-700 mb-4">
            At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.
          </p>
          
          <h3 className="text-xl font-semibold mb-3">9.2 Severability</h3>
          <p className="text-gray-700 mb-4">
            Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus.
          </p>
        </div>

        <div id="section10" className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4">10. Duis Aute Irure Dolor</h2>
          <p className="text-gray-700 mb-4">
            Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat.
          </p>
          
          <div className="bg-green-50 border-l-4 border-green-600 p-4 my-4">
            <p className="text-gray-700">
              <strong>Contact Us:</strong> Lorem ipsum dolor sit amet, consectetur adipiscing elit. For questions about these Terms of Service, please contact us at:
            </p>
            <p className="text-gray-700 mt-2">
              Email: legal@adaptivefactory.ai<br />
              Phone: +1 (555) 123-4567<br />
              Address: 123 Lorem Ipsum St, Dolor Sit, AM 12345
            </p>
          </div>
          
          <p className="text-gray-700 mt-6">
            <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Agreement Button */}
        <div className="text-center mt-12">
          <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            I Agree to the Terms of Service
          </button>
        </div>
      </div>
    </div>
  );
}