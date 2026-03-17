'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { StatsCard } from '@/components/ui/StatsCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface DeviceRequest {
  id: string;
  device_name: string;
  brand: string;
  category: string;
  model_number: string | null;
  purchase_link: string | null;
  reason: string | null;
  user_email: string | null;
  user_id: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'added';
  votes: number;
  created_at: string;
}

const STATUS_BADGE: Record<string, { label: string; variant: 'amber' | 'green' | 'red' | 'blue' }> = {
  pending:  { label: 'Pending',  variant: 'amber' },
  approved: { label: 'Approved', variant: 'green' },
  rejected: { label: 'Rejected', variant: 'red' },
  added:    { label: 'Added',    variant: 'blue' },
};

const PROTOCOLS = ['WiFi', 'Zigbee', 'Z-Wave', 'Thread', 'Matter', 'Bluetooth'];
const ECOSYSTEMS = ['alexa', 'google_home', 'apple_homekit', 'smartthings', 'matter'];

export default function AdminRequestsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [requests, setRequests] = useState<DeviceRequest[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortByVotes, setSortByVotes] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [addModalRequest, setAddModalRequest] = useState<DeviceRequest | null>(null);
  const [addForm, setAddForm] = useState<{
    name: string;
    brand: string;
    category: string;
    protocols: string[];
    ecosystems: Record<string, string>;
    home_assistant: string;
    image_url: string;
    requires_hub: string;
    hub_name: string;
  } | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
        return;
      }
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

  const fetchRequests = useCallback(async () => {
    setDataLoading(true);
    const { data, error } = await supabase
      .from('device_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setRequests(data as DeviceRequest[]);
    setDataLoading(false);
  }, []);

  useEffect(() => {
    if (authorized) fetchRequests();
  }, [authorized, fetchRequests]);

  const stats = useMemo(() => {
    const pending = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    const catCounts: Record<string, number> = {};
    for (const r of requests) {
      if (r.category) catCounts[r.category] = (catCounts[r.category] || 0) + 1;
    }
    const topCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
    return { pending, approved, rejected, topCategory };
  }, [requests]);

  const filtered = useMemo(() => {
    let list = statusFilter === 'all' ? requests : requests.filter(r => r.status === statusFilter);
    if (sortByVotes) list = [...list].sort((a, b) => b.votes - a.votes);
    return list;
  }, [requests, statusFilter, sortByVotes]);

  const updateStatus = async (id: string, status: DeviceRequest['status']) => {
    setActionLoading(id + status);
    const { error } = await supabase
      .from('device_requests')
      .update({ status })
      .eq('id', id);
    if (!error) {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    }
    setActionLoading(null);
  };

  const openAddModal = (request: DeviceRequest) => {
    setAddModalRequest(request);
    setAddError(null);
    setAddForm({
      name: request.device_name,
      brand: request.brand,
      category: request.category,
      protocols: [],
      ecosystems: { alexa: 'none', google_home: 'none', apple_homekit: 'none', smartthings: 'none', matter: 'none' },
      home_assistant: 'none',
      image_url: '',
      requires_hub: 'false',
      hub_name: '',
    });
  };

  const toggleProtocol = (protocol: string) => {
    if (!addForm) return;
    setAddForm(f => f ? {
      ...f,
      protocols: f.protocols.includes(protocol)
        ? f.protocols.filter(p => p !== protocol)
        : [...f.protocols, protocol],
    } : f);
  };

  const toggleEcosystem = (eco: string) => {
    if (!addForm) return;
    setAddForm(f => f ? {
      ...f,
      ecosystems: { ...f.ecosystems, [eco]: f.ecosystems[eco] === 'full' ? 'none' : 'full' },
    } : f);
  };

  const submitAddToDatabase = async () => {
    if (!addForm || !addModalRequest) return;
    setAddLoading(true);
    setAddError(null);

    const { error } = await supabase.from('products').insert([{
      name: addForm.name,
      brand: addForm.brand,
      category: addForm.category,
      protocols: addForm.protocols,
      ecosystems: addForm.ecosystems,
      home_assistant: addForm.home_assistant,
      image_url: addForm.image_url || null,
      requires_hub: addForm.requires_hub,
      hub_name: addForm.hub_name || null,
    }]);

    if (error) {
      setAddError(error.message);
      setAddLoading(false);
      return;
    }

    await supabase.from('device_requests').update({ status: 'added' }).eq('id', addModalRequest.id);
    setRequests(prev => prev.map(r => r.id === addModalRequest.id ? { ...r, status: 'added' } : r));
    setAddModalRequest(null);
    setAddForm(null);
    setAddLoading(false);
  };

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
        <div className="bg-white rounded-xl shadow p-8 text-center border border-gray-100">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Admin Access Required</h1>
          <p className="text-gray-600">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Device Requests</h1>
          <p className="text-gray-600">Review and manage community device requests</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatsCard label="Pending"      value={stats.pending}     valueColor="#f59e0b" />
          <StatsCard label="Approved"     value={stats.approved}    valueColor="#10b981" />
          <StatsCard label="Rejected"     value={stats.rejected}    valueColor="#ef4444" />
          <StatsCard label="Top Category" value={stats.topCategory} valueColor="#2e6f40" />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="added">Added</option>
            </select>
          </div>
          <button
            onClick={() => setSortByVotes(v => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              sortByVotes
                ? 'bg-[#f0f9f2] border-[#a3d9b0] text-[#2e6f40]'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            Sort by Votes {sortByVotes ? '(on)' : '(off)'}
          </button>
          <button
            onClick={fetchRequests}
            disabled={dataLoading}
            className="ml-auto text-sm text-[#2e6f40] hover:text-[#1f4d2b] disabled:opacity-50 font-medium"
          >
            {dataLoading ? 'Loading...' : '↻ Refresh'}
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {dataLoading ? (
            <div className="p-12 text-center text-gray-500">Loading requests...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No requests found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f0f9f2] border-b border-[#d1ecd7]">
                    <th className="px-4 py-3 text-left font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Device</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Brand</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Category</th>
                    <th className="px-4 py-3 text-center font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Votes</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Submitted</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">User Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#1f4d2b] text-xs uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(req => {
                    const statusInfo = STATUS_BADGE[req.status] ?? { label: req.status, variant: 'gray' as const };
                    return (
                      <tr key={req.id} className="hover:bg-[#f0f9f2] transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px]">
                          <div className="truncate" title={req.device_name}>{req.device_name}</div>
                          {req.model_number && (
                            <div className="text-xs text-gray-400 mt-0.5">#{req.model_number}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{req.brand}</td>
                        <td className="px-4 py-3 text-gray-600">{req.category}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#f0f9f2] border border-[#d1ecd7] font-semibold text-[#2e6f40] text-sm">
                            {req.votes}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {new Date(req.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-gray-500 max-w-[160px]">
                          <div className="truncate" title={req.user_email ?? ''}>{req.user_email ?? '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {req.status !== 'approved' && req.status !== 'added' && (
                              <button
                                onClick={() => updateStatus(req.id, 'approved')}
                                disabled={actionLoading === req.id + 'approved'}
                                className="px-2.5 py-1 bg-[#d1ecd7] text-[#1f4d2b] rounded text-xs font-medium hover:bg-[#a3d9b0] disabled:opacity-50 transition-colors"
                              >
                                Approve
                              </button>
                            )}
                            {req.status !== 'rejected' && req.status !== 'added' && (
                              <button
                                onClick={() => updateStatus(req.id, 'rejected')}
                                disabled={actionLoading === req.id + 'rejected'}
                                className="px-2.5 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200 disabled:opacity-50 transition-colors"
                              >
                                Reject
                              </button>
                            )}
                            {req.status !== 'added' && (
                              <button
                                onClick={() => openAddModal(req)}
                                className="px-2.5 py-1 bg-[#f0f9f2] text-[#2e6f40] border border-[#a3d9b0] rounded text-xs font-medium hover:bg-[#d1ecd7] transition-colors"
                              >
                                Add to DB
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add to Database Modal */}
      {addModalRequest && addForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Add to Products Database</h2>
                  <p className="text-sm text-gray-500 mt-1">Pre-filled from request — complete the technical details below</p>
                </div>
                <button
                  onClick={() => { setAddModalRequest(null); setAddForm(null); }}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Device Name</label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={e => setAddForm(f => f ? { ...f, name: e.target.value } : f)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              {/* Brand & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Brand</label>
                  <input
                    type="text"
                    value={addForm.brand}
                    onChange={e => setAddForm(f => f ? { ...f, brand: e.target.value } : f)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={addForm.category}
                    onChange={e => setAddForm(f => f ? { ...f, category: e.target.value } : f)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Image URL <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="url"
                  value={addForm.image_url}
                  onChange={e => setAddForm(f => f ? { ...f, image_url: e.target.value } : f)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              {/* Protocols */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Protocols</label>
                <div className="flex flex-wrap gap-2">
                  {PROTOCOLS.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => toggleProtocol(p)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        addForm.protocols.includes(p)
                          ? 'bg-[#2e6f40] text-white border-[#2e6f40]'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-[#6fbf7d]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ecosystems */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Ecosystems (full support)</label>
                <div className="flex flex-wrap gap-2">
                  {ECOSYSTEMS.map(eco => (
                    <button
                      key={eco}
                      type="button"
                      onClick={() => toggleEcosystem(eco)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize ${
                        addForm.ecosystems[eco] === 'full'
                          ? 'bg-[#3d8b54] text-white border-[#3d8b54]'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-[#6fbf7d]'
                      }`}
                    >
                      {eco.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Home Assistant */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Home Assistant Support</label>
                <div className="flex gap-3">
                  {['none', 'partial', 'full'].map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setAddForm(f => f ? { ...f, home_assistant: level } : f)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border capitalize transition-colors ${
                        addForm.home_assistant === level
                          ? 'bg-cyan-600 text-white border-cyan-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-cyan-400'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hub Required */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Requires Hub?</label>
                <div className="flex gap-3 flex-wrap">
                  {['false', 'true', 'thread_border_router'].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAddForm(f => f ? { ...f, requires_hub: val } : f)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        addForm.requires_hub === val
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-amber-400'
                      }`}
                    >
                      {val === 'false' ? 'No' : val === 'true' ? 'Yes' : 'Thread Border Router'}
                    </button>
                  ))}
                </div>
                {addForm.requires_hub === 'true' && (
                  <input
                    type="text"
                    value={addForm.hub_name}
                    onChange={e => setAddForm(f => f ? { ...f, hub_name: e.target.value } : f)}
                    placeholder="Hub name (e.g. Philips Hue Bridge)"
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                )}
              </div>

              {/* Request context */}
              {(addModalRequest.reason || addModalRequest.purchase_link) && (
                <div className="bg-[#f0f9f2] border border-[#d1ecd7] rounded-lg p-4 text-sm text-gray-600">
                  <p className="font-medium text-gray-700 mb-1">Request context:</p>
                  {addModalRequest.reason && <p className="mb-1">{addModalRequest.reason}</p>}
                  {addModalRequest.purchase_link && (
                    <a href={addModalRequest.purchase_link} target="_blank" rel="noopener noreferrer" className="text-[#2e6f40] hover:underline break-all">
                      {addModalRequest.purchase_link}
                    </a>
                  )}
                </div>
              )}

              {addError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {addError}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => { setAddModalRequest(null); setAddForm(null); }}
              >
                Cancel
              </Button>
              <Button
                onClick={submitAddToDatabase}
                loading={addLoading}
                disabled={addLoading || !addForm.name || !addForm.brand || !addForm.category}
              >
                Add to Database
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
