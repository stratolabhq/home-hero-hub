'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { format, formatDistanceToNow } from 'date-fns';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface CollectionRun {
  id: string;
  run_date: string;
  devices_found: number;
  devices_imported: number;
  sources_used: string[];
  status: 'running' | 'completed' | 'failed';
  created_at: string;
}

interface PreviewDevice {
  _id: string;
  name: string;
  brand: string;
  category: string;
  source: string;
  selected: boolean;
}

const SOURCES = [
  { id: 'philips_hue',     label: 'Philips Hue Catalog',          icon: '💡' },
  { id: 'wyze',            label: 'Wyze Products',                  icon: '📷' },
  { id: 'ring',            label: 'Ring Devices',                   icon: '🔔' },
  { id: 'matter_database', label: 'Matter Database',                icon: '⚡' },
  { id: 'home_assistant',  label: 'Home Assistant Integrations',    icon: '🏠' },
];

// Simulated devices that would be found during collection
const MOCK_PREVIEW_DEVICES: Omit<PreviewDevice, 'selected'>[] = [
  { _id: 'p1', name: 'Hue White Ambiance Bulb E26',  brand: 'Philips Hue', category: 'Smart Bulb',   source: 'philips_hue' },
  { _id: 'p2', name: 'Hue Play Gradient Lightstrip',  brand: 'Philips Hue', category: 'Smart Light',  source: 'philips_hue' },
  { _id: 'p3', name: 'Wyze Cam Pan v3',               brand: 'Wyze',        category: 'Security Cam', source: 'wyze' },
  { _id: 'p4', name: 'Wyze Lock Bolt',                brand: 'Wyze',        category: 'Smart Lock',   source: 'wyze' },
  { _id: 'p5', name: 'Ring Video Doorbell 4',         brand: 'Ring',        category: 'Doorbell',     source: 'ring' },
  { _id: 'p6', name: 'Ring Floodlight Cam Wired Pro', brand: 'Ring',        category: 'Security Cam', source: 'ring' },
];

export default function AdminCollectorPage() {
  const [runs, setRuns] = useState<CollectionRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [enabledSources, setEnabledSources] = useState<Set<string>>(
    new Set(SOURCES.map(s => s.id))
  );
  const [previewDevices, setPreviewDevices] = useState<PreviewDevice[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qualityThreshold, setQualityThreshold] = useState(70);
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('weekly');

  const fetchRuns = useCallback(async () => {
    setRunsLoading(true);
    const { data, error: err } = await supabase
      .from('collection_runs')
      .select('*')
      .order('run_date', { ascending: false })
      .limit(10);
    if (!err && data) setRuns(data as CollectionRun[]);
    setRunsLoading(false);
  }, []);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const lastRun = runs[0] ?? null;

  const runCollection = async () => {
    setCollecting(true);
    setError(null);
    setShowPreview(false);
    setImportResult(null);

    // Simulate collection delay
    await new Promise(res => setTimeout(res, 2000));

    // Filter mock devices by enabled sources
    const found = MOCK_PREVIEW_DEVICES
      .filter(d => enabledSources.has(d.source))
      .map(d => ({ ...d, selected: true }));

    // Log this run to Supabase
    const { error: insertErr } = await supabase.from('collection_runs').insert([{
      run_date: new Date().toISOString(),
      devices_found: found.length,
      devices_imported: 0,
      sources_used: Array.from(enabledSources),
      status: 'completed',
    }]);

    if (insertErr) {
      // Table may not exist yet — show friendly message
      setError(`collection_runs table not found. Run the SQL migration in Supabase first.\n\n${insertErr.message}`);
      setCollecting(false);
      return;
    }

    setPreviewDevices(found);
    setShowPreview(true);
    setCollecting(false);
    fetchRuns();
  };

  const toggleSource = (id: string) => {
    setEnabledSources(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePreviewDevice = (id: string) => {
    setPreviewDevices(prev =>
      prev.map(d => d._id === id ? { ...d, selected: !d.selected } : d)
    );
  };

  const selectAll = () => setPreviewDevices(prev => prev.map(d => ({ ...d, selected: true })));
  const selectNone = () => setPreviewDevices(prev => prev.map(d => ({ ...d, selected: false })));

  const importSelected = async () => {
    const selected = previewDevices.filter(d => d.selected);
    if (selected.length === 0) return;
    setImporting(true);

    let importedCount = 0;
    let skippedCount = 0;

    for (const device of selected) {
      const { error: err } = await supabase.from('products').insert([{
        name: device.name,
        brand: device.brand,
        category: device.category,
        protocols: [],
        ecosystems: { alexa: 'none', google_home: 'none', apple_homekit: 'none', smartthings: 'none', matter: 'none' },
        home_assistant: 'none',
        requires_hub: 'false',
      }]);
      if (err) {
        // May already exist — count as skipped
        skippedCount++;
      } else {
        importedCount++;
      }
    }

    // Update the most recent run's imported count
    if (runs[0]) {
      await supabase
        .from('collection_runs')
        .update({ devices_imported: importedCount })
        .eq('id', runs[0].id);
    }

    setImportResult({ imported: importedCount, skipped: skippedCount });
    setShowPreview(false);
    setPreviewDevices([]);
    setImporting(false);
    fetchRuns();
  };

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Data Collector</h1>
          <p className="text-gray-500 text-sm">Collect and import devices from external sources</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Last Run</p>
            <p className="text-sm font-semibold text-gray-900">
              {lastRun ? formatDistanceToNow(new Date(lastRun.run_date), { addSuffix: true }) : 'Never'}
            </p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Devices Found</p>
            <p className="text-2xl font-bold text-[#2e6f40]">{lastRun?.devices_found ?? 0}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Imported</p>
            <p className="text-2xl font-bold text-[#3d8b54]">{lastRun?.devices_imported ?? 0}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Total Runs</p>
            <p className="text-2xl font-bold text-gray-700">{runs.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* Left column: run + sources */}
          <div className="lg:col-span-2 space-y-6">

            {/* Run Collection */}
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-2">Collect Devices Now</h2>
              <p className="text-sm text-gray-500 mb-5">
                Fetches device data from enabled sources. Results will be shown in a preview table for review before import.
              </p>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-semibold text-red-700 mb-1">Error</p>
                  <pre className="text-xs text-red-600 whitespace-pre-wrap">{error}</pre>
                  <p className="text-xs text-red-500 mt-2">
                    Create the <code className="bg-red-100 px-1 rounded">collection_runs</code> table in Supabase SQL Editor — see the SQL below.
                  </p>
                </div>
              )}

              {importResult && (
                <div className="mb-4 p-4 bg-[#f0f9f2] border border-[#d1ecd7] rounded-lg">
                  <p className="text-sm font-semibold text-[#1f4d2b] mb-1">Import Complete</p>
                  <p className="text-sm text-gray-700">
                    {importResult.imported} device{importResult.imported !== 1 ? 's' : ''} imported
                    {importResult.skipped > 0 && `, ${importResult.skipped} skipped (duplicates)`}
                  </p>
                </div>
              )}

              <button
                onClick={runCollection}
                disabled={collecting || enabledSources.size === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#2e6f40] text-white rounded-lg font-medium text-sm hover:bg-[#3d8b54] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {collecting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Collecting...
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    Collect Devices Now
                  </>
                )}
              </button>
            </div>

            {/* Preview Table */}
            {showPreview && previewDevices.length > 0 && (
              <div className="bg-white border border-[#d1ecd7] rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Preview — {previewDevices.length} devices found</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Select which devices to import into the products database</p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button onClick={selectAll} className="text-[#2e6f40] hover:underline font-medium">All</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={selectNone} className="text-gray-500 hover:underline">None</button>
                  </div>
                </div>

                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#f0f9f2] border-b border-[#d1ecd7]">
                        <th className="px-3 py-2 text-left w-8"></th>
                        <th className="px-3 py-2 text-left font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Name</th>
                        <th className="px-3 py-2 text-left font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Brand</th>
                        <th className="px-3 py-2 text-left font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Category</th>
                        <th className="px-3 py-2 text-left font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {previewDevices.map(device => (
                        <tr key={device._id} className={`transition-colors ${device.selected ? 'hover:bg-[#f0f9f2]' : 'opacity-50 bg-gray-50'}`}>
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={device.selected}
                              onChange={() => togglePreviewDevice(device._id)}
                              className="rounded border-gray-300 text-[#2e6f40] focus:ring-[#2e6f40]"
                            />
                          </td>
                          <td className="px-3 py-2.5 font-medium text-gray-900">{device.name}</td>
                          <td className="px-3 py-2.5 text-gray-600">{device.brand}</td>
                          <td className="px-3 py-2.5 text-gray-600">{device.category}</td>
                          <td className="px-3 py-2.5">
                            <span className="px-2 py-0.5 text-xs rounded-full bg-[#f0f9f2] border border-[#d1ecd7] text-[#2e6f40] font-medium">
                              {SOURCES.find(s => s.id === device.source)?.label ?? device.source}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {previewDevices.filter(d => d.selected).length} of {previewDevices.length} selected
                  </p>
                  <button
                    onClick={importSelected}
                    disabled={importing || previewDevices.filter(d => d.selected).length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-[#2e6f40] text-white rounded-lg text-sm font-medium hover:bg-[#3d8b54] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {importing ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Importing...
                      </>
                    ) : (
                      `Import ${previewDevices.filter(d => d.selected).length} Selected`
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Collection History */}
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b border-[#d1ecd7] flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">Collection History</h2>
                <button
                  onClick={fetchRuns}
                  disabled={runsLoading}
                  className="text-xs text-[#2e6f40] hover:underline font-medium disabled:opacity-50"
                >
                  {runsLoading ? 'Loading...' : '↻ Refresh'}
                </button>
              </div>

              {runsLoading ? (
                <div className="p-8 text-center text-sm text-gray-500">Loading history...</div>
              ) : runs.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  No collection runs yet. Click &ldquo;Collect Devices Now&rdquo; to get started.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#f0f9f2] border-b border-[#d1ecd7]">
                        <th className="px-4 py-3 text-left font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Date</th>
                        <th className="px-4 py-3 text-left font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3 text-center font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Found</th>
                        <th className="px-4 py-3 text-center font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Imported</th>
                        <th className="px-4 py-3 text-left font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Sources</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {runs.map(run => (
                        <tr key={run.id} className="hover:bg-[#f0f9f2] transition-colors">
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {format(new Date(run.run_date), 'MMM d, yyyy HH:mm')}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              run.status === 'completed' ? 'bg-green-100 text-green-700'
                              : run.status === 'running'  ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                            }`}>
                              {run.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-[#2e6f40]">{run.devices_found}</td>
                          <td className="px-4 py-3 text-center font-semibold text-gray-700">{run.devices_imported}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {(run.sources_used ?? []).slice(0, 3).map(src => (
                                <span key={src} className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded font-medium">
                                  {SOURCES.find(s => s.id === src)?.label.split(' ')[0] ?? src}
                                </span>
                              ))}
                              {(run.sources_used ?? []).length > 3 && (
                                <span className="text-[10px] text-gray-400">+{run.sources_used.length - 3}</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* Right column: settings */}
          <div className="space-y-6">

            {/* Collection Sources */}
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Collection Sources</h2>
              <div className="space-y-2">
                {SOURCES.map(source => (
                  <label
                    key={source.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#f0f9f2] cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={enabledSources.has(source.id)}
                      onChange={() => toggleSource(source.id)}
                      className="rounded border-gray-300 text-[#2e6f40] focus:ring-[#2e6f40]"
                    />
                    <span className="text-base">{source.icon}</span>
                    <span className="text-sm text-gray-700 font-medium">{source.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                {enabledSources.size} of {SOURCES.length} sources enabled
              </p>
            </div>

            {/* Settings */}
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Settings</h2>

              <div className="space-y-5">
                {/* Auto-run frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Auto-run Frequency</label>
                  <div className="flex gap-2">
                    {(['weekly', 'monthly'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setFrequency(f)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border capitalize transition-colors ${
                          frequency === f
                            ? 'bg-[#2e6f40] text-white border-[#2e6f40]'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-[#6fbf7d]'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quality threshold */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-700">Min. Data Quality</label>
                    <span className="text-sm font-semibold text-[#2e6f40]">{qualityThreshold}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={qualityThreshold}
                    onChange={e => setQualityThreshold(Number(e.target.value))}
                    className="w-full accent-[#2e6f40]"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SQL Migration */}
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Database Setup</h2>
              <p className="text-xs text-gray-500 mb-3">
                Run this SQL in your Supabase editor to create the <code className="bg-gray-100 px-1 rounded">collection_runs</code> table:
              </p>
              <pre className="bg-gray-900 text-green-400 text-[10px] p-3 rounded-lg overflow-x-auto leading-relaxed">
{`CREATE TABLE collection_runs (
  id UUID PRIMARY KEY
    DEFAULT gen_random_uuid(),
  run_date TIMESTAMPTZ
    NOT NULL DEFAULT NOW(),
  devices_found INTEGER DEFAULT 0,
  devices_imported INTEGER DEFAULT 0,
  sources_used TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ
    DEFAULT NOW()
);

ALTER TABLE collection_runs
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON collection_runs
  FOR ALL USING (false);`}
              </pre>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
