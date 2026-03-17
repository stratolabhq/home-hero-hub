'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ImportLog {
  id: string;
  run_at: string;
  trigger: 'manual' | 'cron';
  status: 'running' | 'completed' | 'failed';
  keywords_searched: string[];
  products_found: number;
  products_imported: number;
  products_updated: number;
  products_skipped: number;
  errors: { keyword?: string; message: string }[];
  duration_ms: number;
  completed_at: string | null;
}

interface ImportResult {
  logId: string;
  status: 'completed' | 'failed';
  productsFound: number;
  productsImported: number;
  productsUpdated: number;
  productsSkipped: number;
  errors: { keyword?: string; message: string }[];
  durationMs: number;
}

export default function AdminImportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
        return;
      }
      setToken(session.access_token);
      // Check admin by comparing email — server will enforce this too
      const email = session.user?.email;
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      if (adminEmail && email !== adminEmail) {
        setAuthorized(false);
        setLoading(false);
        return;
      }
      setAuthorized(true);
      setLoading(false);
    });
  }, [router]);

  const fetchLogs = useCallback(async (currentToken: string) => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/admin/logs', {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      const json = await res.json();
      if (res.ok) {
        setLogs(json.logs ?? []);
      } else {
        setError(json.error ?? 'Failed to fetch logs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authorized && token) {
      fetchLogs(token);
    }
  }, [authorized, token, fetchLogs]);

  const runImport = async () => {
    if (!token) return;
    setImporting(true);
    setError(null);
    setLastResult(null);

    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Import failed');
      } else {
        setLastResult(json as ImportResult);
        fetchLogs(token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  };

  const envVars = [
    { key: 'AMAZON_PA_ACCESS_KEY', label: 'Amazon PA Access Key' },
    { key: 'AMAZON_PA_SECRET_KEY', label: 'Amazon PA Secret Key' },
    { key: 'AMAZON_PA_PARTNER_TAG', label: 'Amazon Partner Tag' },
    { key: 'ADMIN_EMAIL', label: 'Admin Email' },
    { key: 'CRON_SECRET', label: 'Cron Secret' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Admin Access Required</h1>
          <p className="text-gray-600">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Device Importer</h1>
          <p className="text-gray-600">Import smart home devices from Amazon Product Advertising API</p>
        </div>

        {/* Import Action */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Run Import</h2>
          <p className="text-sm text-gray-600 mb-4">
            Searches Amazon for smart home devices across 8 categories and imports new products into your database.
            Existing products will have their image and price updated. This may take 2–3 minutes.
          </p>
          <button
            onClick={runImport}
            disabled={importing}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Importing... (this may take a few minutes)
              </span>
            ) : (
              'Run Import Now'
            )}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 font-medium">Error</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          )}

          {lastResult && (
            <div className={`mt-4 p-4 rounded-lg border ${lastResult.status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <p className={`text-sm font-semibold mb-3 ${lastResult.status === 'completed' ? 'text-green-800' : 'text-yellow-800'}`}>
                Import {lastResult.status === 'completed' ? 'Completed' : 'Completed with errors'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Found', value: lastResult.productsFound },
                  { label: 'Imported', value: lastResult.productsImported },
                  { label: 'Updated', value: lastResult.productsUpdated },
                  { label: 'Skipped', value: lastResult.productsSkipped },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white rounded p-3 text-center shadow-sm">
                    <div className="text-2xl font-bold text-gray-900">{value}</div>
                    <div className="text-xs text-gray-600">{label}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Duration: {(lastResult.durationMs / 1000).toFixed(1)}s
              </p>
              {lastResult.errors.length > 0 && (
                <details className="mt-3">
                  <summary className="text-sm text-yellow-700 cursor-pointer font-medium">
                    {lastResult.errors.length} error(s)
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {lastResult.errors.map((e, i) => (
                      <li key={i} className="text-xs text-red-600">
                        {e.keyword && <span className="font-medium">[{e.keyword}] </span>}
                        {e.message}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Cron Schedule */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Scheduled Import</h2>
          <p className="text-sm text-gray-600 mb-3">
            Automated weekly import runs every Sunday at 2:00 AM UTC via Vercel Cron.
          </p>
          <div className="bg-gray-50 rounded p-3 font-mono text-sm text-gray-700">
            <span className="text-purple-600">0 2 * * 0</span>
            <span className="text-gray-500 ml-3">→ /api/cron/import</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Secured with <code className="bg-gray-100 px-1 rounded">CRON_SECRET</code> header.
            Configure in Vercel Dashboard → Settings → Cron Jobs.
          </p>
        </div>

        {/* Environment Variables Checklist */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuration Checklist</h2>
          <p className="text-sm text-gray-600 mb-4">
            Add these variables to your <code className="bg-gray-100 px-1 rounded">.env.local</code> and Vercel project settings.
          </p>
          <div className="space-y-2">
            {envVars.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-400 text-lg">○</span>
                <div>
                  <code className="text-sm font-mono text-gray-900">{key}</code>
                  <span className="text-sm text-gray-500 ml-2">— {label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SQL Setup */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Database Setup</h2>
          <p className="text-sm text-gray-600 mb-3">
            Run this migration in your Supabase SQL editor to create the <code className="bg-gray-100 px-1 rounded">import_logs</code> table:
          </p>
          <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-lg overflow-x-auto">
{`-- See supabase/migrations/001_create_import_logs.sql`}
          </pre>
        </div>

        {/* Import Logs */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Import History</h2>
            {token && (
              <button
                onClick={() => fetchLogs(token)}
                disabled={logsLoading}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                {logsLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            )}
          </div>

          {logsLoading ? (
            <p className="text-sm text-gray-500">Loading logs...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-gray-500">No import runs yet. Run your first import above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200">
                    <th className="pb-3 font-medium text-gray-700">Date</th>
                    <th className="pb-3 font-medium text-gray-700">Trigger</th>
                    <th className="pb-3 font-medium text-gray-700">Status</th>
                    <th className="pb-3 font-medium text-gray-700 text-right">Found</th>
                    <th className="pb-3 font-medium text-gray-700 text-right">Imported</th>
                    <th className="pb-3 font-medium text-gray-700 text-right">Updated</th>
                    <th className="pb-3 font-medium text-gray-700 text-right">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="py-3 text-gray-600">
                        {new Date(log.run_at).toLocaleString()}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          log.trigger === 'cron'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {log.trigger}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          log.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : log.status === 'running'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 text-right text-gray-600">{log.products_found}</td>
                      <td className="py-3 text-right text-gray-600">{log.products_imported}</td>
                      <td className="py-3 text-right text-gray-600">{log.products_updated}</td>
                      <td className="py-3 text-right text-gray-600">
                        {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
