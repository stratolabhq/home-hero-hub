'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminTest() {
  const [info, setInfo] = useState({
    userEmail: 'Loading...',
    adminEmail: 'Loading...',
    isAdmin: false,
    envVarExists: false
  });

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const adminEmailFromEnv = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

    setInfo({
      userEmail: user?.email || 'Not logged in',
      adminEmail: adminEmailFromEnv || 'NOT SET IN VERCEL',
      isAdmin: user?.email === adminEmailFromEnv && !!adminEmailFromEnv,
      envVarExists: !!adminEmailFromEnv
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Admin Access Test</h1>

        <div className="space-y-6">
          {/* Environment Variable Check */}
          <div className="border-2 rounded-lg p-4 bg-gray-50">
            <p className="text-sm font-semibold text-gray-600 mb-2">Environment Variable Status:</p>
            <div className={`text-lg font-bold ${info.envVarExists ? 'text-green-600' : 'text-red-600'}`}>
              {info.envVarExists ? '✅ NEXT_PUBLIC_ADMIN_EMAIL is set' : '❌ NEXT_PUBLIC_ADMIN_EMAIL not found'}
            </div>
            {!info.envVarExists && (
              <p className="text-sm text-red-600 mt-2">
                Add NEXT_PUBLIC_ADMIN_EMAIL to Vercel environment variables and redeploy
              </p>
            )}
          </div>

          {/* Current User */}
          <div className="border-2 rounded-lg p-4 bg-gray-50">
            <p className="text-sm font-semibold text-gray-600 mb-2">Currently Logged In As:</p>
            <p className="text-lg font-mono">{info.userEmail}</p>
          </div>

          {/* Admin Email */}
          <div className="border-2 rounded-lg p-4 bg-gray-50">
            <p className="text-sm font-semibold text-gray-600 mb-2">Admin Email (from Vercel):</p>
            <p className="text-lg font-mono">{info.adminEmail}</p>
          </div>

          {/* Match Status */}
          <div className={`border-2 rounded-lg p-6 ${info.isAdmin ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
            <p className="text-sm font-semibold text-gray-600 mb-2">Admin Status:</p>
            <div className={`text-2xl font-bold ${info.isAdmin ? 'text-green-700' : 'text-red-700'}`}>
              {info.isAdmin ? '🎉 ADMIN ACCESS GRANTED' : '❌ NOT AN ADMIN'}
            </div>

            {info.isAdmin ? (
              <div className="mt-4 text-sm text-green-700">
                <p className="font-semibold">Everything is working correctly!</p>
                <p className="mt-2">You can now:</p>
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>Build admin features</li>
                  <li>Access admin-only pages</li>
                  <li>Manage users and devices</li>
                </ul>
              </div>
            ) : (
              <div className="mt-4 text-sm text-red-700">
                <p className="font-semibold">Troubleshooting:</p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  {!info.envVarExists && <li>Set NEXT_PUBLIC_ADMIN_EMAIL in Vercel</li>}
                  {info.userEmail === 'Not logged in' && <li>Log in with alex.dickerson13@gmail.com</li>}
                  {info.envVarExists && info.userEmail !== 'Not logged in' && info.userEmail !== info.adminEmail && (
                    <li>Logged in email doesn't match admin email</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Debug Info */}
          <details className="border rounded-lg p-4 bg-gray-50">
            <summary className="cursor-pointer font-semibold text-gray-700">Debug Information</summary>
            <pre className="mt-4 text-xs bg-gray-100 p-4 rounded overflow-x-auto">
              {JSON.stringify(info, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}
