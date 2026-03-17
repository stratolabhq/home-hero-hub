import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f9f2] via-white to-[#d1ecd7]">

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#d1ecd7] border border-[#a3d9b0] rounded-full text-sm font-medium text-[#1f4d2b] mb-8">
            🌿 Smart Home, Naturally Connected
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Master Your Home's
            <span style={{
              background: 'linear-gradient(135deg, #2e6f40, #3d8b54)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}> Product Ecosystem</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed">
            Stop wasting money on incompatible products. Home Hero Hub helps you build, manage, and optimize your smart home ecosystem with confidence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-8 py-4 bg-[#2e6f40] text-white rounded-xl text-lg font-semibold hover:bg-[#3d8b54] transition-colors shadow-lg"
            >
              Start Building Your Hub
            </Link>
            <Link
              href="/compatibility"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-900 rounded-xl text-lg font-semibold hover:bg-[#f0f9f2] transition-colors border-2 border-[#a3d9b0]"
            >
              See Compatibility Checker
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-4xl mx-auto mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { value: '10,000+', label: 'Compatible Products' },
            { value: '98%',     label: 'Compatibility Accuracy' },
            { value: '$1,200',  label: 'Average Savings' },
          ].map(stat => (
            <div key={stat.label} className="text-center bg-white rounded-2xl p-6 shadow-sm border border-[#d1ecd7]">
              <div className="text-4xl font-bold text-[#2e6f40] mb-2">{stat.value}</div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Everything You Need to Master Your Home
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From smart home networks to full ecosystem management, we've got you covered
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-gradient-to-br from-[#f0f9f2] to-[#d1ecd7] p-8 rounded-2xl hover:shadow-lg transition-shadow border border-[#a3d9b0]">
              <div className="w-12 h-12 bg-[#2e6f40] rounded-xl flex items-center justify-center mb-6 shadow-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Compatibility Checking</h3>
              <p className="text-gray-600">
                Know before you buy. Check if products work together across all smart home protocols.
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl hover:shadow-lg transition-shadow border border-purple-200">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center mb-6 shadow-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Ecosystem Mapping</h3>
              <p className="text-gray-600">
                Visualize your entire home product network. See how devices connect and find integration opportunities.
              </p>
            </div>

            <div className="bg-gradient-to-br from-[#f0f9f2] to-[#d1ecd7] p-8 rounded-2xl hover:shadow-lg transition-shadow border border-[#a3d9b0]">
              <div className="w-12 h-12 bg-[#3d8b54] rounded-xl flex items-center justify-center mb-6 shadow-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">AI YAML Generator</h3>
              <p className="text-gray-600">
                Describe automations in plain English and get production-ready Home Assistant YAML instantly.
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-red-50 p-8 rounded-2xl hover:shadow-lg transition-shadow border border-orange-200">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mb-6 shadow-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Community Requests</h3>
              <p className="text-gray-600">
                Request devices, vote on additions, and help grow the compatibility database for everyone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gradient-to-br from-gray-50 to-[#f0f9f2]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Simple, smart, and powerful</p>
          </div>

          <div className="max-w-3xl mx-auto space-y-8">
            {[
              {
                step: '1',
                title: 'Add Your Products',
                description: 'Build your home inventory. Add smart devices, track protocols and ecosystems.',
              },
              {
                step: '2',
                title: 'Check Compatibility',
                description: 'Before buying, verify new products work with your existing setup across all ecosystems.',
              },
              {
                step: '3',
                title: 'Automate with AI',
                description: 'Generate Home Assistant YAML automations in plain English with our AI assistant.',
              },
            ].map(({ step, title, description }) => (
              <div key={step} className="flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 bg-[#2e6f40] text-white rounded-full flex items-center justify-center text-xl font-bold shadow-md">
                  {step}
                </div>
                <div className="bg-white rounded-xl p-6 flex-1 shadow-sm border border-[#d1ecd7]">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                  <p className="text-gray-600">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Protocols Section */}
      <section id="compatibility" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Smart Home Compatibility Made Simple
            </h2>
            <p className="text-xl text-gray-600 mb-12">
              We track Zigbee, Z-Wave, Matter, Thread, WiFi, and every protocol in between.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
              {['Matter', 'Zigbee', 'Z-Wave', 'Thread'].map(proto => (
                <div key={proto} className="p-6 bg-[#f0f9f2] border border-[#d1ecd7] rounded-xl">
                  <div className="text-2xl font-bold text-[#2e6f40] mb-2">{proto}</div>
                  <div className="text-sm text-gray-600">Protocol</div>
                </div>
              ))}
            </div>

            <Link
              href="/compatibility"
              className="inline-flex items-center justify-center px-8 py-4 bg-[#2e6f40] text-white rounded-xl text-lg font-semibold hover:bg-[#3d8b54] transition-colors shadow-lg"
            >
              Check Your Smart Home Compatibility
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20" style={{ background: 'linear-gradient(135deg, #2e6f40 0%, #3d8b54 100%)' }}>
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Master Your Home?
          </h2>
          <p className="text-xl text-[#a3d9b0] mb-8 max-w-2xl mx-auto">
            Join smart homeowners saving time and money with Home Hero Hub
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-[#2e6f40] rounded-xl text-lg font-semibold hover:bg-[#f0f9f2] transition-colors shadow-xl font-bold"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2e6f40, #3d8b54)' }}>
                  <span className="text-white font-bold text-sm">H³</span>
                </div>
                <span className="text-lg font-bold">Home Hero Hub</span>
              </div>
              <p className="text-gray-400">Your home product ecosystem manager</p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-[#6fbf7d]">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/compatibility" className="hover:text-[#6fbf7d] transition">Compatibility</a></li>
                <li><a href="/tools/yaml-generator" className="hover:text-[#6fbf7d] transition">YAML Generator</a></li>
                <li><a href="/dashboard" className="hover:text-[#6fbf7d] transition">Dashboard</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-[#6fbf7d]">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-[#6fbf7d] transition">About</a></li>
                <li><a href="/getting-started" className="hover:text-[#6fbf7d] transition">Getting Started</a></li>
                <li><a href="/request-device" className="hover:text-[#6fbf7d] transition">Request Device</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-[#6fbf7d]">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-[#6fbf7d] transition">Privacy</a></li>
                <li><a href="#" className="hover:text-[#6fbf7d] transition">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2026 Home Hero Hub. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
