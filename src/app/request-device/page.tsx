'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RequestDevice() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    device_name: '',
    brand: '',
    category: '',
    model_number: '',
    purchase_link: '',
    reason: '',
    user_email: ''
  });

  const categories = [
    'Lighting',
    'Security',
    'Climate',
    'Cleaning',
    'Entertainment',
    'Power',
    'Sensors',
    'Window Treatments',
    'Appliances',
    'Other'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error: insertError } = await supabase
        .from('device_requests')
        .insert([{
          ...formData,
          user_id: user?.id || null,
          status: 'pending',
          votes: 1
        }]);

      if (insertError) {
        console.error('Supabase error:', insertError);
        if (insertError.code === '42501' || insertError.message?.toLowerCase().includes('policy')) {
          setError('Permission denied. Please try again or sign in.');
        } else if (insertError.message?.toLowerCase().includes('column')) {
          setError(`Database schema error: ${insertError.message}`);
        } else {
          setError(insertError.message || 'Failed to submit request.');
        }
        return;
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error('Error submitting request:', err);
      setError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-xl shadow-lg p-12 max-w-2xl text-center">
          <div className="text-6xl mb-6">✅</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Request Submitted!</h2>
          <p className="text-gray-600 mb-8">
            Thank you for helping us expand our database. We'll review your request and add the device if it meets our criteria. You'll be notified when it's added!
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setSubmitted(false)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Submit Another Request
            </button>
            <button
              onClick={() => router.push('/compatibility')}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
            >
              Browse Database
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-8 text-white mb-8">
          <h1 className="text-3xl font-bold mb-2">Request a Device</h1>
          <p className="text-blue-100">
            Can't find a device in our database? Request it here and we'll add it! Popular requests get priority.
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-2">🎯</div>
            <h3 className="font-bold text-gray-900 mb-1">What We Need</h3>
            <p className="text-sm text-gray-600">
              Device name, brand, and category are required. Links and model numbers help us find accurate specs faster.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl mb-2">⏱️</div>
            <h3 className="font-bold text-gray-900 mb-1">Review Time</h3>
            <p className="text-sm text-gray-600">
              Most requests are reviewed within 48 hours. Popular devices are added first!
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Device Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Device Name *
              </label>
              <input
                type="text"
                name="device_name"
                required
                value={formData.device_name}
                onChange={handleChange}
                placeholder="e.g., Philips Hue Play HDMI Sync Box"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Brand *
              </label>
              <input
                type="text"
                name="brand"
                required
                value={formData.brand}
                onChange={handleChange}
                placeholder="e.g., Philips Hue"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Category *
              </label>
              <select
                name="category"
                required
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a category...</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Model Number */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Model Number <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                type="text"
                name="model_number"
                value={formData.model_number}
                onChange={handleChange}
                placeholder="e.g., 8718699703547"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Purchase Link */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Purchase Link <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                type="url"
                name="purchase_link"
                value={formData.purchase_link}
                onChange={handleChange}
                placeholder="https://www.amazon.com/..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Amazon, manufacturer website, or retailer link</p>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Why do you want this device added? <span className="text-gray-400">(Optional)</span>
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                rows={3}
                placeholder="e.g., I own this device and want to track it in my inventory..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Email for Updates */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email for Updates <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                type="email"
                name="user_email"
                value={formData.user_email}
                onChange={handleChange}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">We'll notify you when the device is added</p>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>

        {/* FAQ */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h3 className="font-bold text-gray-900 mb-4">Frequently Asked Questions</h3>
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <p className="font-semibold">How long until my device is added?</p>
              <p className="text-gray-600">Most requests are reviewed within 48 hours. Popular devices are prioritized.</p>
            </div>
            <div>
              <p className="font-semibold">What if the device is already in the database?</p>
              <p className="text-gray-600">Check the <a href="/compatibility" className="text-blue-600 underline">Compatibility Checker</a> first! You can search our current database of 100+ devices.</p>
            </div>
            <div>
              <p className="font-semibold">Can I request multiple devices?</p>
              <p className="text-gray-600">Yes! Submit a separate request for each device.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
