import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import DeviceExampleImage from '@/components/DeviceExampleImage';

const DEVICE_TYPES = [
  {
    type:        'smart-bulb',
    title:       'Smart Bulbs',
    description: 'Screw into standard E26/E27 fixtures and connect over WiFi or Zigbee. Control brightness, colour temperature, and colour from your phone or voice.',
    features:    ['Dim from 1–100% brightness', 'Millions of colours (RGBW)', 'Schedules & automations'],
    brands:      'Philips Hue, LIFX, Sengled, Wyze, Govee',
    price:       '$10 – $55 per bulb',
    href:        '/compatibility?category=lighting',
    cta:         'Browse Smart Bulbs',
    note:        'Zigbee bulbs require a coordinator (hub). WiFi bulbs connect directly to your router.',
  },
  {
    type:        'smart-plug',
    title:       'Smart Plugs',
    description: 'Plug into any outlet to make any device remotely controllable. Turn lamps, fans, coffee makers, and appliances on or off from anywhere.',
    features:    ['Remote on/off via app', 'Energy monitoring (some models)', 'Voice control & schedules'],
    brands:      'TP-Link Kasa, Wyze, Meross, Amazon, Eve',
    price:       '$8 – $25 each',
    href:        '/compatibility?category=outlets-plugs',
    cta:         'Browse Smart Plugs',
    note:        'The easiest way to start. No wiring required — just plug in and connect to WiFi.',
  },
  {
    type:        'smart-lock',
    title:       'Smart Locks',
    description: 'Replace your deadbolt with a keypad, fingerprint, or app-controlled lock. Grant access to guests remotely and get notified when your door opens.',
    features:    ['Keypad, app & voice entry', 'Remote lock / unlock', 'Access logs & guest codes'],
    brands:      'Schlage, Yale, Kwikset, Ultraloq, Level',
    price:       '$100 – $300',
    href:        '/compatibility?category=locks',
    cta:         'Browse Smart Locks',
    note:        'Z-Wave locks integrate best with Home Assistant or SmartThings. WiFi locks work standalone.',
  },
  {
    type:        'thermostat',
    title:       'Smart Thermostats',
    description: 'Programmable thermostats that learn your schedule, detect occupancy, and control remotely. Can save 10–23% on heating and cooling bills.',
    features:    ['Remote temperature control', 'Schedules & geofencing', 'Energy usage reports'],
    brands:      'Ecobee, Google Nest, Honeywell, Emerson',
    price:       '$90 – $250',
    href:        '/compatibility?category=climate',
    cta:         'Browse Thermostats',
    note:        'Check your HVAC wiring type before buying. Most systems use a C-wire for smart thermostats.',
  },
  {
    type:        'camera',
    title:       'Security Cameras',
    description: 'Indoor and outdoor cameras with motion detection, night vision, and two-way audio. Record to cloud or local storage and get alerts on your phone.',
    features:    ['Motion alerts & recording', '1080p / 4K video, night vision', 'Two-way audio'],
    brands:      'Arlo, Ring, Eufy, Wyze, Reolink, Amcrest',
    price:       '$30 – $250',
    href:        '/compatibility?category=security',
    cta:         'Browse Cameras',
    note:        'Local storage cameras (SD card / NVR) avoid monthly fees. Cloud cameras offer easier remote access.',
  },
  {
    type:        'sensor',
    title:       'Sensors',
    description: 'Motion detectors, door/window sensors, water leak sensors, and temperature sensors that trigger automations and send alerts.',
    features:    ['Trigger automations', 'Low power — years on a battery', 'Compact & easy to install'],
    brands:      'Aqara, Samsung SmartThings, Sonoff, Fibaro',
    price:       '$10 – $40 each',
    href:        '/compatibility?category=sensors',
    cta:         'Browse Sensors',
    note:        'Zigbee sensors are the most cost-effective but need a Zigbee coordinator. Thread sensors are battery efficient.',
  },
  {
    type:        'switch',
    title:       'Smart Switches & Dimmers',
    description: 'Replace in-wall light switches to control any fixture — even non-smart bulbs. Works with existing lights; no bulb replacement needed.',
    features:    ['Control any light (bulb or fixture)', 'Dimming support (dimmer models)', 'No special bulbs required'],
    brands:      'Lutron Caseta, Leviton, GE Enbrighten, Inovelli',
    price:       '$30 – $80 per switch',
    href:        '/compatibility?category=switches',
    cta:         'Browse Smart Switches',
    note:        'Requires a neutral wire in most cases. Lutron Caseta works without neutral but needs a Lutron hub.',
  },
  {
    type:        'doorbell',
    title:       'Video Doorbells',
    description: 'See and speak to visitors before you open the door. Motion zones, package detection, and night vision keep your front door covered.',
    features:    ['Live video & two-way audio', 'Motion & package alerts', 'Cloud or local recording'],
    brands:      'Ring, Nest, Eufy, Arlo, Reolink, Amcrest',
    price:       '$50 – $200',
    href:        '/compatibility?category=doorbells',
    cta:         'Browse Video Doorbells',
    note:        'Wired doorbells are more reliable. Battery models are easier to install but need charging every few months.',
  },
];

export default function DeviceTypesPage() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-gradient-to-br from-[#f0f9f2] to-[#d1ecd7] py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Link
            href="/getting-started"
            className="inline-flex items-center gap-1.5 text-sm text-[#2e6f40] font-medium mb-6 hover:text-[#1f4d2b]"
          >
            ← Back to Getting Started
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Smart Home Device Types
          </h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto leading-relaxed">
            A visual guide to the most common smart home devices — what they do,
            what they cost, and which brands to look at.
          </p>
        </div>
      </div>

      {/* Device grid */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-8">
          {DEVICE_TYPES.map(device => (
            <div
              key={device.type}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Image area */}
              <div className="h-48 w-full">
                <DeviceExampleImage
                  type={device.type}
                  alt={`${device.title} example`}
                  src={`/device-examples/device-types/${device.type}.jpg`}
                />
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-xl font-bold text-gray-900">{device.title}</h2>
                  <span className="text-sm font-semibold text-[#2e6f40] bg-[#f0f9f2] px-2.5 py-1 rounded-full whitespace-nowrap ml-3 flex-shrink-0">
                    {device.price}
                  </span>
                </div>

                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  {device.description}
                </p>

                <ul className="space-y-1.5 mb-4">
                  {device.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-[#2e6f40] flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <p className="text-xs text-gray-500 mb-4">
                  <span className="font-semibold text-gray-600">Popular brands:</span> {device.brands}
                </p>

                {device.note && (
                  <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
                    <p className="text-xs text-amber-800 leading-relaxed">💡 {device.note}</p>
                  </div>
                )}

                <Link
                  href={device.href}
                  className="block w-full text-center bg-[#2e6f40] text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-[#3d8b54] transition-colors"
                >
                  {device.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Protocol note */}
        <div className="mt-12 bg-white rounded-2xl border border-[#d1ecd7] p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            🔌 How Devices Connect
          </h2>
          <p className="text-gray-600 mb-6">
            Every smart device communicates using one or more wireless protocols.
            Understanding protocols helps you avoid buying devices that don't work with your setup.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'WiFi',      color: 'bg-green-100 text-green-800',   desc: 'Connects directly to your router. No hub needed, but can crowd your WiFi network.' },
              { name: 'Zigbee',    color: 'bg-amber-100 text-amber-800',   desc: 'Low-power mesh network. Needs a Zigbee coordinator. Great for lots of devices.' },
              { name: 'Z-Wave',    color: 'bg-blue-100 text-blue-800',     desc: 'Reliable 900 MHz mesh. Needs a Z-Wave controller. Common for locks and switches.' },
              { name: 'Matter',    color: 'bg-purple-100 text-purple-800', desc: 'New universal standard. Works across Alexa, Google, HomeKit, and Home Assistant.' },
            ].map(p => (
              <div key={p.name} className="rounded-xl p-4 bg-gray-50 border border-gray-100">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold mb-2 ${p.color}`}>
                  {p.name}
                </span>
                <p className="text-xs text-gray-600 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Link
              href="/controllers"
              className="text-sm text-[#2e6f40] font-semibold hover:text-[#1f4d2b]"
            >
              Browse Zigbee & Z-Wave Coordinators →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
