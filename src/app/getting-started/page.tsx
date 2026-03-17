'use client';

import { useState } from 'react';

export default function GettingStarted() {
  const [activeTab, setActiveTab] = useState<'basics' | 'ecosystems' | 'devices' | 'setup'>('basics');

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Your Smart Home Journey
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need to know about building and managing a smart home, from choosing the right ecosystem to understanding how devices work together.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {[
            { id: 'basics', label: '🏠 Smart Home Basics', icon: '🏠' },
            { id: 'ecosystems', label: '🌐 Ecosystems Explained', icon: '🌐' },
            { id: 'devices', label: '📱 Device Categories', icon: '📱' },
            { id: 'setup', label: '⚙️ Getting Started', icon: '⚙️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Sections */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* SMART HOME BASICS */}
          {activeTab === 'basics' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">What is a Smart Home?</h2>
                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  A smart home uses internet-connected devices to enable remote monitoring and management of appliances and systems, such as lighting, heating, security cameras, and more. These devices communicate with each other and can be controlled from your smartphone, tablet, or voice commands.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-lg p-6 border-2 border-blue-200">
                  <h3 className="text-xl font-bold text-blue-900 mb-3">✅ Benefits</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• <strong>Convenience:</strong> Control everything from your phone</li>
                    <li>• <strong>Energy Savings:</strong> Reduce waste with automation</li>
                    <li>• <strong>Security:</strong> Monitor your home from anywhere</li>
                    <li>• <strong>Comfort:</strong> Automate routines to fit your lifestyle</li>
                    <li>• <strong>Accessibility:</strong> Voice control for easier living</li>
                  </ul>
                </div>

                <div className="bg-amber-50 rounded-lg p-6 border-2 border-amber-200">
                  <h3 className="text-xl font-bold text-amber-900 mb-3">⚠️ Considerations</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• <strong>Compatibility:</strong> Not all devices work together</li>
                    <li>• <strong>Internet Dependency:</strong> Requires stable WiFi</li>
                    <li>• <strong>Privacy:</strong> Devices collect usage data</li>
                    <li>• <strong>Cost:</strong> Initial investment can be high</li>
                    <li>• <strong>Learning Curve:</strong> Setup takes time</li>
                  </ul>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border-2 border-purple-200">
                <h3 className="text-2xl font-bold text-purple-900 mb-4">How Smart Devices Work Together</h3>
                <div className="space-y-4 text-gray-700">
                  <p>
                    <strong>Communication Protocols:</strong> Smart devices use protocols like WiFi, Zigbee, Z-Wave, Thread, and Bluetooth to communicate. WiFi connects directly to your router, while Zigbee and Z-Wave create mesh networks through hubs.
                  </p>
                  <p>
                    <strong>Hubs & Bridges:</strong> Some ecosystems require a central hub (like SmartThings Hub or Philips Hue Bridge) to coordinate devices. Others connect directly to WiFi.
                  </p>
                  <p>
                    <strong>Automation & Scenes:</strong> You can create routines like "Good Morning" (lights on, thermostat up, coffee maker starts) or "Away Mode" (lights off, locks engaged, cameras active).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ECOSYSTEMS EXPLAINED */}
          {activeTab === 'ecosystems' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Smart Home Ecosystems</h2>
                <p className="text-lg text-gray-600 mb-8">
                  Choosing the right ecosystem is one of the most important decisions when building your smart home. Each has unique strengths, compatible devices, and control methods.
                </p>
              </div>

              {/* Amazon Alexa */}
              <div className="border-2 border-blue-200 rounded-xl p-6 bg-gradient-to-r from-blue-50 to-cyan-50">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                    A
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Amazon Alexa</h3>
                    <p className="text-blue-700 font-semibold">The Most Popular Ecosystem</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Best For:</h4>
                    <ul className="space-y-1 text-gray-700">
                      <li>• Amazon Prime members</li>
                      <li>• Voice-first control</li>
                      <li>• Widest device compatibility</li>
                      <li>• Budget-conscious buyers</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Key Features:</h4>
                    <ul className="space-y-1 text-gray-700">
                      <li>• 140,000+ compatible devices</li>
                      <li>• Routines & automation</li>
                      <li>• Echo devices from $25-300</li>
                      <li>• Shopping & entertainment integration</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 bg-blue-100 rounded-lg p-4">
                  <p className="text-sm text-gray-800">
                    <strong>💡 Pro Tip:</strong> Alexa has the largest smart home library. If device compatibility is your priority, Alexa is the safest bet.
                  </p>
                </div>
              </div>

              {/* Google Home */}
              <div className="border-2 border-red-200 rounded-xl p-6 bg-gradient-to-r from-red-50 to-orange-50">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-red-500 to-yellow-500 rounded-lg flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                    G
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Google Home</h3>
                    <p className="text-red-700 font-semibold">The Smartest Assistant</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Best For:</h4>
                    <ul className="space-y-1 text-gray-700">
                      <li>• Android users</li>
                      <li>• Natural language queries</li>
                      <li>• Google services integration</li>
                      <li>• Multi-user households</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Key Features:</h4>
                    <ul className="space-y-1 text-gray-700">
                      <li>• Superior voice recognition</li>
                      <li>• Contextual understanding</li>
                      <li>• Nest devices integration</li>
                      <li>• YouTube & Chromecast built-in</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 bg-red-100 rounded-lg p-4">
                  <p className="text-sm text-gray-800">
                    <strong>💡 Pro Tip:</strong> Google Assistant understands context better than competitors. Ask follow-up questions without repeating yourself.
                  </p>
                </div>
              </div>

              {/* Apple HomeKit */}
              <div className="border-2 border-gray-300 rounded-xl p-6 bg-gradient-to-r from-gray-50 to-slate-100">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 bg-black rounded-lg flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                    
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Apple HomeKit</h3>
                    <p className="text-gray-700 font-semibold">The Most Secure Ecosystem</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Best For:</h4>
                    <ul className="space-y-1 text-gray-700">
                      <li>• Apple device owners (iPhone, iPad, Mac)</li>
                      <li>• Privacy-focused users</li>
                      <li>• Premium device preferences</li>
                      <li>• Seamless Apple integration</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Key Features:</h4>
                    <ul className="space-y-1 text-gray-700">
                      <li>• End-to-end encryption</li>
                      <li>• Local processing (no cloud)</li>
                      <li>• Siri voice control</li>
                      <li>• Home Hub with HomePod/Apple TV</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 bg-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-800">
                    <strong>💡 Pro Tip:</strong> HomeKit requires device certification, so selection is smaller but quality is consistently high.
                  </p>
                </div>
              </div>

              {/* Samsung SmartThings */}
              <div className="border-2 border-cyan-200 rounded-xl p-6 bg-gradient-to-r from-cyan-50 to-blue-50">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 bg-cyan-600 rounded-lg flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                    ST
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Samsung SmartThings</h3>
                    <p className="text-cyan-700 font-semibold">The Power User Platform</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Best For:</h4>
                    <ul className="space-y-1 text-gray-700">
                      <li>• Advanced automation</li>
                      <li>• Samsung device owners</li>
                      <li>• Zigbee/Z-Wave enthusiasts</li>
                      <li>• Local control preference</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Key Features:</h4>
                    <ul className="space-y-1 text-gray-700">
                      <li>• Multi-protocol hub included</li>
                      <li>• Advanced automations</li>
                      <li>• Works with Alexa & Google</li>
                      <li>• Local device processing</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 bg-cyan-100 rounded-lg p-4">
                  <p className="text-sm text-gray-800">
                    <strong>💡 Pro Tip:</strong> SmartThings Hub supports Zigbee, Z-Wave, and WiFi - the most protocol flexibility.
                  </p>
                </div>
              </div>

              {/* Matter */}
              <div className="border-2 border-purple-200 rounded-xl p-6 bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                    M
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Matter</h3>
                    <p className="text-purple-700 font-semibold">The Universal Standard (New!)</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Best For:</h4>
                    <ul className="space-y-1 text-gray-700">
                      <li>• Future-proofing your home</li>
                      <li>• Multi-ecosystem households</li>
                      <li>• Avoiding vendor lock-in</li>
                      <li>• New smart home builders</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Key Features:</h4>
                    <ul className="space-y-1 text-gray-700">
                      <li>• Works with ALL ecosystems</li>
                      <li>• Backed by Apple, Google, Amazon</li>
                      <li>• Local control by default</li>
                      <li>• Growing device library</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 bg-purple-100 rounded-lg p-4">
                  <p className="text-sm text-gray-800">
                    <strong>💡 Pro Tip:</strong> Matter is the future. Devices work with Alexa, Google, HomeKit, and SmartThings simultaneously.
                  </p>
                </div>
              </div>

              {/* Home Assistant */}
              <div className="border-2 border-teal-200 rounded-xl p-6 bg-gradient-to-r from-teal-50 to-cyan-50">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 bg-teal-600 rounded-lg flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                    HA
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Home Assistant</h3>
                    <p className="text-teal-700 font-semibold">The DIY Power Platform</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Best For:</h4>
                    <ul className="space-y-1 text-gray-700">
                      <li>• Tech-savvy users</li>
                      <li>• Privacy advocates</li>
                      <li>• Complex automation needs</li>
                      <li>• Raspberry Pi enthusiasts</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Key Features:</h4>
                    <ul className="space-y-1 text-gray-700">
                      <li>• 2000+ integrations</li>
                      <li>• 100% local control</li>
                      <li>• Open source & free</li>
                      <li>• Ultimate customization</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 bg-teal-100 rounded-lg p-4">
                  <p className="text-sm text-gray-800">
                    <strong>💡 Pro Tip:</strong> Home Assistant works with everything, but requires technical setup. Perfect for users who want complete control.
                  </p>
                </div>
              </div>

              {/* Comparison Table */}
              <div className="mt-8 overflow-x-auto">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Quick Comparison</h3>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-3 text-left">Ecosystem</th>
                      <th className="border p-3">Device Count</th>
                      <th className="border p-3">Ease of Use</th>
                      <th className="border p-3">Privacy</th>
                      <th className="border p-3">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border p-3 font-semibold">Alexa</td>
                      <td className="border p-3 text-center">⭐⭐⭐⭐⭐</td>
                      <td className="border p-3 text-center">⭐⭐⭐⭐⭐</td>
                      <td className="border p-3 text-center">⭐⭐⭐</td>
                      <td className="border p-3 text-center">💰</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border p-3 font-semibold">Google Home</td>
                      <td className="border p-3 text-center">⭐⭐⭐⭐⭐</td>
                      <td className="border p-3 text-center">⭐⭐⭐⭐⭐</td>
                      <td className="border p-3 text-center">⭐⭐</td>
                      <td className="border p-3 text-center">💰💰</td>
                    </tr>
                    <tr>
                      <td className="border p-3 font-semibold">Apple HomeKit</td>
                      <td className="border p-3 text-center">⭐⭐⭐</td>
                      <td className="border p-3 text-center">⭐⭐⭐⭐⭐</td>
                      <td className="border p-3 text-center">⭐⭐⭐⭐⭐</td>
                      <td className="border p-3 text-center">💰💰💰</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border p-3 font-semibold">SmartThings</td>
                      <td className="border p-3 text-center">⭐⭐⭐⭐</td>
                      <td className="border p-3 text-center">⭐⭐⭐</td>
                      <td className="border p-3 text-center">⭐⭐⭐</td>
                      <td className="border p-3 text-center">💰💰</td>
                    </tr>
                    <tr>
                      <td className="border p-3 font-semibold">Matter</td>
                      <td className="border p-3 text-center">⭐⭐⭐</td>
                      <td className="border p-3 text-center">⭐⭐⭐⭐</td>
                      <td className="border p-3 text-center">⭐⭐⭐⭐</td>
                      <td className="border p-3 text-center">💰💰</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border p-3 font-semibold">Home Assistant</td>
                      <td className="border p-3 text-center">⭐⭐⭐⭐⭐</td>
                      <td className="border p-3 text-center">⭐⭐</td>
                      <td className="border p-3 text-center">⭐⭐⭐⭐⭐</td>
                      <td className="border p-3 text-center">Free</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DEVICE CATEGORIES */}
          {activeTab === 'devices' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Smart Home Device Categories</h2>
                <p className="text-lg text-gray-600 mb-8">
                  Understanding different device types helps you build a cohesive smart home. Here's what each category does and how they work together.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Lighting */}
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
                  <div className="text-4xl mb-3">💡</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Lighting</h3>
                  <p className="text-gray-700 mb-3">Control brightness, color, and schedules for ambiance and energy savings.</p>
                  <div className="text-sm text-gray-600">
                    <strong>Examples:</strong> Philips Hue, LIFX, Nanoleaf, GE Cync
                    <br /><strong>Protocols:</strong> WiFi, Zigbee, Thread
                  </div>
                </div>

                {/* Security */}
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                  <div className="text-4xl mb-3">🔒</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Security</h3>
                  <p className="text-gray-700 mb-3">Smart locks, cameras, doorbells, and sensors protect your home.</p>
                  <div className="text-sm text-gray-600">
                    <strong>Examples:</strong> Ring, Nest, Arlo, Yale, Schlage
                    <br /><strong>Protocols:</strong> WiFi, Bluetooth, Zigbee
                  </div>
                </div>

                {/* Climate Control */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                  <div className="text-4xl mb-3">🌡️</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Climate Control</h3>
                  <p className="text-gray-700 mb-3">Thermostats, fans, humidifiers, and air purifiers for comfort and efficiency.</p>
                  <div className="text-sm text-gray-600">
                    <strong>Examples:</strong> Nest, ecobee, Sensi, Levoit
                    <br /><strong>Protocols:</strong> WiFi
                  </div>
                </div>

                {/* Cleaning */}
                <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
                  <div className="text-4xl mb-3">🤖</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Cleaning</h3>
                  <p className="text-gray-700 mb-3">Robot vacuums and mops automate floor cleaning with scheduling and mapping.</p>
                  <div className="text-sm text-gray-600">
                    <strong>Examples:</strong> Roborock, eufy, iRobot, Dreame
                    <br /><strong>Protocols:</strong> WiFi, Bluetooth
                  </div>
                </div>

                {/* Entertainment */}
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                  <div className="text-4xl mb-3">📺</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Entertainment</h3>
                  <p className="text-gray-700 mb-3">Smart TVs, speakers, and streaming devices for unified media control.</p>
                  <div className="text-sm text-gray-600">
                    <strong>Examples:</strong> Sonos, Roku, Apple TV, Fire TV
                    <br /><strong>Protocols:</strong> WiFi, Bluetooth
                  </div>
                </div>

                {/* Power & Energy */}
                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6">
                  <div className="text-4xl mb-3">⚡</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Power & Energy</h3>
                  <p className="text-gray-700 mb-3">Smart plugs, switches, and energy monitors track and control power usage.</p>
                  <div className="text-sm text-gray-600">
                    <strong>Examples:</strong> TP-Link Kasa, Wemo, Meross
                    <br /><strong>Protocols:</strong> WiFi
                  </div>
                </div>

                {/* Window Treatments */}
                <div className="bg-cyan-50 border-2 border-cyan-200 rounded-lg p-6">
                  <div className="text-4xl mb-3">🪟</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Window Treatments</h3>
                  <p className="text-gray-700 mb-3">Motorized blinds and curtains for privacy, light control, and energy efficiency.</p>
                  <div className="text-sm text-gray-600">
                    <strong>Examples:</strong> Lutron, IKEA FYRTUR, SwitchBot
                    <br /><strong>Protocols:</strong> Zigbee, WiFi, Proprietary
                  </div>
                </div>

                {/* Sensors */}
                <div className="bg-pink-50 border-2 border-pink-200 rounded-lg p-6">
                  <div className="text-4xl mb-3">📡</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Sensors</h3>
                  <p className="text-gray-700 mb-3">Motion, door/window, leak, and temperature sensors trigger automations.</p>
                  <div className="text-sm text-gray-600">
                    <strong>Examples:</strong> Aqara, Samsung, Wyze
                    <br /><strong>Protocols:</strong> Zigbee, Z-Wave, WiFi
                  </div>
                </div>
              </div>

              {/* How Devices Work Together */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg p-6 mt-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Example: How Devices Work Together</h3>
                <div className="space-y-4 text-gray-700">
                  <div className="bg-white rounded-lg p-4 border border-indigo-200">
                    <p className="font-bold text-indigo-900 mb-2">☀️ "Good Morning" Routine</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Motion sensor detects you wake up at 7 AM</li>
                      <li>Smart blinds open automatically</li>
                      <li>Lights gradually brighten to 80%</li>
                      <li>Thermostat increases to 72°F</li>
                      <li>Coffee maker starts brewing (smart plug)</li>
                      <li>Morning news plays on smart speaker</li>
                    </ol>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-indigo-200">
                    <p className="font-bold text-indigo-900 mb-2">🏃 "Leaving Home" Automation</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Phone GPS detects you left home</li>
                      <li>Smart lock automatically locks doors</li>
                      <li>Thermostat sets to "Away" mode</li>
                      <li>All lights turn off</li>
                      <li>Security cameras arm</li>
                      <li>Robot vacuum starts cleaning</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* GETTING STARTED */}
          {activeTab === 'setup' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Getting Started Guide</h2>
                <p className="text-lg text-gray-600 mb-8">
                  Follow these steps to build your smart home the right way, avoiding common pitfalls and ensuring everything works together.
                </p>
              </div>

              {/* Step-by-Step Guide */}
              <div className="space-y-6">
                <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg">
                  <h3 className="text-xl font-bold text-blue-900 mb-2">Step 1: Choose Your Ecosystem</h3>
                  <p className="text-gray-700 mb-3">
                    Pick ONE primary ecosystem (Alexa, Google, HomeKit, SmartThings) based on your existing devices and preferences. You can add others later, but start with one to avoid confusion.
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>Already have an iPhone? → Consider HomeKit</li>
                    <li>Use Android or want most options? → Alexa or Google</li>
                    <li>Want advanced automation? → SmartThings or Home Assistant</li>
                    <li>Want future-proof? → Look for Matter devices</li>
                  </ul>
                </div>

                <div className="bg-green-50 border-l-4 border-green-600 p-6 rounded-r-lg">
                  <h3 className="text-xl font-bold text-green-900 mb-2">Step 2: Start with a Hub or Smart Speaker</h3>
                  <p className="text-gray-700 mb-3">
                    Get the central control device for your ecosystem. This becomes your "brain" that controls everything.
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li><strong>Alexa:</strong> Amazon Echo Dot ($50) or Echo Show ($90)</li>
                    <li><strong>Google:</strong> Nest Mini ($50) or Nest Hub ($90)</li>
                    <li><strong>HomeKit:</strong> HomePod Mini ($100) or Apple TV</li>
                    <li><strong>SmartThings:</strong> SmartThings Hub ($70)</li>
                  </ul>
                </div>

                <div className="bg-purple-50 border-l-4 border-purple-600 p-6 rounded-r-lg">
                  <h3 className="text-xl font-bold text-purple-900 mb-2">Step 3: Add Devices One Category at a Time</h3>
                  <p className="text-gray-700 mb-3">
                    Don't buy everything at once! Start with one room or category, learn how it works, then expand.
                  </p>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p><strong>Recommended Order:</strong></p>
                    <ol className="list-decimal list-inside space-y-1 ml-4">
                      <li><strong>Lighting</strong> - Easy to set up, immediate impact (smart bulbs or plugs)</li>
                      <li><strong>Security</strong> - Smart lock or video doorbell for peace of mind</li>
                      <li><strong>Climate</strong> - Smart thermostat saves money on energy bills</li>
                      <li><strong>Cleaning</strong> - Robot vacuum for automated convenience</li>
                      <li><strong>Sensors</strong> - Motion/door sensors enable advanced automations</li>
                    </ol>
                  </div>
                </div>

                <div className="bg-orange-50 border-l-4 border-orange-600 p-6 rounded-r-lg">
                  <h3 className="text-xl font-bold text-orange-900 mb-2">Step 4: Check Compatibility BEFORE Buying</h3>
                  <p className="text-gray-700 mb-3">
                    Use Home Hero Hub's Compatibility Checker to verify devices work with your chosen ecosystem!
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>Look for "Works with Alexa/Google/HomeKit" on the box</li>
                    <li>Check if it requires a hub (Zigbee/Z-Wave need hubs, WiFi doesn't)</li>
                    <li>Verify your WiFi can handle more devices (2.4GHz band needed for most)</li>
                    <li>Consider Matter devices for maximum compatibility</li>
                  </ul>
                </div>

                <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded-r-lg">
                  <h3 className="text-xl font-bold text-red-900 mb-2">Step 5: Set Up Automations & Routines</h3>
                  <p className="text-gray-700 mb-3">
                    The real magic happens when devices work together automatically. Start simple!
                  </p>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p><strong>Beginner Automations:</strong></p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>"Bedtime" - Turn off all lights at 11 PM</li>
                      <li>"Arrival Home" - Unlock door when you arrive</li>
                      <li>"Movie Mode" - Dim lights when TV turns on</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-cyan-50 border-l-4 border-cyan-600 p-6 rounded-r-lg">
                  <h3 className="text-xl font-bold text-cyan-900 mb-2">Step 6: Secure Your Smart Home</h3>
                  <p className="text-gray-700 mb-3">
                    Don't forget security! Follow these best practices:
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>Use a strong WiFi password (WPA3 if available)</li>
                    <li>Create a separate network for smart devices (guest network)</li>
                    <li>Enable 2-factor authentication on your ecosystem account</li>
                    <li>Keep devices updated with latest firmware</li>
                    <li>Review device permissions regularly</li>
                  </ul>
                </div>
              </div>

              {/* Budget Planning */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-6 mt-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">💰 Budget Planning</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-bold text-green-900 mb-2">Starter ($200-500)</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Smart speaker ($50)</li>
                      <li>• 2-3 smart bulbs ($30-45)</li>
                      <li>• Smart plug pack ($30-40)</li>
                      <li>• Video doorbell ($80-150)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-green-900 mb-2">Intermediate ($500-1500)</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Everything in Starter</li>
                      <li>• Smart thermostat ($150-250)</li>
                      <li>• Smart lock ($180-280)</li>
                      <li>• Robot vacuum ($300-600)</li>
                      <li>• Light strips + sensors ($100-200)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-green-900 mb-2">Advanced ($1500-5000+)</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Everything in Intermediate</li>
                      <li>• Smart blinds ($300-600/window)</li>
                      <li>• Security cameras ($400-800)</li>
                      <li>• Premium robot vacuum ($1500+)</li>
                      <li>• Full home lighting system</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Common Mistakes */}
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                <h3 className="text-2xl font-bold text-red-900 mb-4">⚠️ Common Mistakes to Avoid</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-bold text-gray-900 mb-1">❌ Buying incompatible devices</p>
                    <p className="text-sm text-gray-600">Always check compatibility with your ecosystem first</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 mb-1">❌ Weak WiFi coverage</p>
                    <p className="text-sm text-gray-600">Upgrade router or add mesh WiFi before adding devices</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 mb-1">❌ Mixing too many ecosystems</p>
                    <p className="text-sm text-gray-600">Stick to 1-2 ecosystems to avoid confusion</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 mb-1">❌ Ignoring 2.4GHz requirement</p>
                    <p className="text-sm text-gray-600">Most smart devices need 2.4GHz WiFi, not 5GHz</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 mb-1">❌ No backup access method</p>
                    <p className="text-sm text-gray-600">Always keep physical keys, light switches accessible</p>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 mb-1">❌ Buying the cheapest option</p>
                    <p className="text-sm text-gray-600">Quality matters - stick with reputable brands</p>
                  </div>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">🚀 Ready to Get Started?</h3>
                <p className="text-gray-700 mb-6">
                  Use Home Hero Hub to check device compatibility, track your purchases, and visualize your smart home ecosystem!
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <a href="/compatibility" className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                    Check Compatibility
                  </a>
                  <a href="/add-product" className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors">
                    Add Your Devices
                  </a>
                  <a href="/dashboard" className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors">
                    View Dashboard
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
