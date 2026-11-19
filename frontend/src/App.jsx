import React, { useState, useEffect } from 'react';

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
const API_ORIGIN = new URL(API_URL, window.location.origin).origin;
const TEAM_PROFILES = [
  'Mawejje Alesha',
  'Nangiro Apollo',
  'Mulungi Favour Priscilla',
  'Osire Samuel',
  'Okumu Oscar Ebiru',
  'Nimusiima Cuthbert'
];

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('ucu_token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('ucu_user') || 'null'));
  const [view, setView] = useState('browse');
  const [authMode, setAuthMode] = useState('login');

  const [authForm, setAuthForm] = useState({ full_name: '', reg_no: '', email: '', password: '' });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const [items, setItems] = useState([]);
  const [claims, setClaims] = useState([]);
  const [filters, setFilters] = useState({ keyword: '', category: '', location: '', date: '', type: '' });

  const [reportForm, setReportForm] = useState({
    report_type: 'FOUND', title: '', category: 'Keys', public_description: '',
    private_details: '', campus_location: 'N5B Lecture Room', incident_date: ''
  });
  const [imageFile, setImageFile] = useState(null);

  const [claimingItem, setClaimingItem] = useState(null);
  const [evidenceText, setEvidenceText] = useState('');
  const [reviewInputs, setReviewInputs] = useState({});

  const notify = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const fetchItems = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const query = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))).toString();
      const res = await fetch(`${API_URL}/items?${query}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setItems(data);
    } catch {
      notify('error', 'Could not connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClaims = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/claims`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setClaims(data);
    } catch {}
  };

  useEffect(() => {
    if (token) {
      fetchItems();
      fetchClaims();
    }
  }, [token, filters]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    const endpoint = authMode === 'login' ? '/login' : '/register';
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (!res.ok) return notify('error', data.error);

      if (authMode === 'register') {
        notify('success', data.message);
        setAuthMode('login');
      } else {
        localStorage.setItem('ucu_token', data.token);
        localStorage.setItem('ucu_user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        setView(data.user.role === 'ADMIN' ? 'admin' : 'browse');
      }
    } catch {
      notify('error', 'Server unreachable. Ensure Express backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ucu_token');
    localStorage.removeItem('ucu_user');
    setToken('');
    setUser(null);
  };

  const handleCreateReport = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(reportForm).forEach(([k, v]) => formData.append(k, v));
    if (imageFile) formData.append('image', imageFile);

    const res = await fetch(`${API_URL}/items`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) return notify('error', data.error);

    notify('success', data.message);
    setReportForm({ report_type: 'FOUND', title: '', category: 'Keys', public_description: '', private_details: '', campus_location: 'N5B Lecture Room', incident_date: '' });
    setImageFile(null);
    fetchItems();
    setView('browse');
  };

  const handleSubmitClaim = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ item_id: claimingItem.item_id, evidence_text: evidenceText })
    });
    const data = await res.json();
    if (!res.ok) return notify('error', data.error);

    notify('success', data.message);
    setClaimingItem(null);
    setEvidenceText('');
    fetchClaims();
    setView('claims');
  };

  const handleAdminReview = async (claimId, decision) => {
    const reason = reviewInputs[claimId] || '';
    if (!reason.trim()) return notify('error', 'Please enter a reason before approving or rejecting.');

    const res = await fetch(`${API_URL}/claims/${claimId}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ decision, admin_reason: reason })
    });
    const data = await res.json();
    if (!res.ok) return notify('error', data.error);

    notify('success', data.message);
    fetchClaims();
    fetchItems();
  };

  const handleConfirmReturn = async (itemId) => {
    const res = await fetch(`${API_URL}/items/${itemId}/return`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) return notify('error', data.error);
    notify('success', data.message);
    fetchItems();
    fetchClaims();
  };

  if (!token) {
    return (
      <main className="auth-page relative flex min-h-screen items-center justify-center p-4">
        <nav aria-label="Site navigation" className="absolute right-4 top-4 z-20">
          <details className="group relative">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md border border-white/70 bg-slate-950/30 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-blue-300">
              Profiles
              <svg aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </summary>
            <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white py-2 text-slate-800 shadow-xl">
              <p className="px-4 pb-2 pt-1 text-xs font-semibold uppercase tracking-widest text-slate-500">Project team</p>
              <ul className="divide-y divide-slate-100">
                {TEAM_PROFILES.map((name) => (
                  <li key={name} className="px-4 py-2.5 text-sm">{name}</li>
                ))}
              </ul>
            </div>
          </details>
        </nav>

        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white/40 p-4 shadow-md backdrop-blur-sm sm:p-6">
          <h1 className="text-center text-2xl font-bold text-slate-900">UCU Campus Lost &amp; Found</h1>
          <p className="mt-1 mb-6 text-center text-sm text-slate-600">Uganda Christian University • Mukono Campus</p>
          <p className="-mt-3 mb-6 text-center text-sm leading-relaxed text-slate-700">Sign in to report, find, and reunite lost belongings across campus.</p>

          {message.text && (
            <div role="alert" className={`mb-4 rounded p-3 text-sm font-medium ${message.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <>
                <div>
                  <label htmlFor="full_name" className="block text-sm font-semibold text-slate-800">Full Name</label>
                  <input id="full_name" required className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-blue-700"
                    value={authForm.full_name} onChange={e => setAuthForm({ ...authForm, full_name: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="reg_no" className="block text-sm font-semibold text-slate-800">Registration Number</label>
                  <input id="reg_no" required placeholder="e.g. S25D14/020" className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-blue-700"
                    value={authForm.reg_no} onChange={e => setAuthForm({ ...authForm, reg_no: e.target.value })} />
                </div>
              </>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-800">University Email</label>
              <input id="email" type="email" required className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-blue-700"
                value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-800">Password</label>
              <input id="password" type="password" required minLength={6} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-blue-700"
                value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} />
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-900 py-2.5 font-semibold text-white hover:bg-blue-800 focus:ring-4 focus:ring-blue-300">
              {loading ? 'Processing...' : authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
            className="mt-4 w-full rounded p-1 text-sm font-semibold text-blue-900 underline focus:outline-none focus:ring-2 focus:ring-blue-700">
            {authMode === 'login' ? 'Need a student account? Register here' : 'Already have an account? Sign in'}
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-blue-950 text-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap justify-between items-center gap-3">
          <div>
            <h1 className="text-lg font-bold">UCU Campus Lost & Found</h1>
            <p className="text-xs text-blue-200">{user.full_name} ({user.reg_no}) • Role: {user.role}</p>
          </div>
          <nav aria-label="Main Navigation" className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
            <button onClick={() => setView('browse')} className={`px-3 py-2 rounded text-sm font-medium focus:ring-2 focus:ring-white ${view === 'browse' ? 'bg-blue-700' : 'bg-blue-900 hover:bg-blue-800'}`}>
              Browse Items
            </button>
            <button onClick={() => setView('report')} className={`px-3 py-2 rounded text-sm font-medium focus:ring-2 focus:ring-white ${view === 'report' ? 'bg-blue-700' : 'bg-blue-900 hover:bg-blue-800'}`}>
              + Report Item
            </button>
            <button onClick={() => setView('claims')} className={`px-3 py-2 rounded text-sm font-medium focus:ring-2 focus:ring-white ${view === 'claims' ? 'bg-blue-700' : 'bg-blue-900 hover:bg-blue-800'}`}>
              {user.role === 'ADMIN' ? 'All Claims' : 'My Claims'}
            </button>
            {user.role === 'ADMIN' && (
              <button onClick={() => setView('admin')} className={`px-3 py-2 rounded text-sm font-medium focus:ring-2 focus:ring-white ${view === 'admin' ? 'bg-amber-600' : 'bg-amber-700 hover:bg-amber-600'}`}>
                Admin Review Panel
              </button>
            )}
            <button onClick={handleLogout} className="px-3 py-2 rounded text-sm font-medium bg-red-700 hover:bg-red-600 focus:ring-2 focus:ring-white">
              Log Out
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {message.text && (
          <div role="alert" className={`p-3 rounded-lg mb-4 text-sm font-semibold ${message.type === 'error' ? 'bg-red-100 text-red-900 border border-red-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'}`}>
            {message.text}
          </div>
        )}

        {view === 'browse' && (
          <section>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label htmlFor="f-kw" className="block text-xs font-bold text-slate-700">Keyword</label>
                <input id="f-kw" placeholder="e.g. Keys, Charger" className="mt-1 w-full border rounded p-2 text-sm"
                  value={filters.keyword} onChange={e => setFilters({ ...filters, keyword: e.target.value })} />
              </div>
              <div>
                <label htmlFor="f-type" className="block text-xs font-bold text-slate-700">Report Type</label>
                <select id="f-type" className="mt-1 w-full border rounded p-2 text-sm" value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })}>
                  <option value="">All Reports</option>
                  <option value="FOUND">Found Items</option>
                  <option value="LOST">Lost Items</option>
                </select>
              </div>
              <div>
                <label htmlFor="f-cat" className="block text-xs font-bold text-slate-700">Category</label>
                <select id="f-cat" className="mt-1 w-full border rounded p-2 text-sm" value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })}>
                  <option value="">All Categories</option>
                  <option value="Keys">Keys</option>
                  <option value="Electronics">Electronics</option>
                  <option value="ID / Cards">ID / Cards</option>
                  <option value="Books / Stationery">Books / Stationery</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="f-loc" className="block text-xs font-bold text-slate-700">Campus Location</label>
                <input id="f-loc" placeholder="e.g. N5B, Library" className="mt-1 w-full border rounded p-2 text-sm"
                  value={filters.location} onChange={e => setFilters({ ...filters, location: e.target.value })} />
              </div>
              <div>
                <label htmlFor="f-date" className="block text-xs font-bold text-slate-700">Date</label>
                <input id="f-date" type="date" className="mt-1 w-full border rounded p-2 text-sm"
                  value={filters.date} onChange={e => setFilters({ ...filters, date: e.target.value })} />
              </div>
            </div>

            {loading ? <p className="text-center py-8 text-slate-600">Loading listings...</p> : items.length === 0 ? (
              <p className="text-center py-8 bg-white rounded-xl border text-slate-600">No items match your current filters.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(item => (
                  <article key={item.item_id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded ${item.report_type === 'FOUND' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>
                          {item.report_type}
                        </span>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded ${item.status === 'RETURNED' ? 'bg-slate-200 text-slate-800' : item.status === 'CLAIM_APPROVED' ? 'bg-blue-100 text-blue-900' : 'bg-green-50 text-green-800'}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-slate-900">{item.title}</h2>
                      <p className="text-xs text-slate-500 mt-0.5">{item.category} • {item.campus_location} • {item.incident_date?.slice(0, 10)}</p>
                      {item.image_url && (
                        <img src={`${API_ORIGIN}${item.image_url}`} alt={item.title} className="mt-3 h-36 w-full object-cover rounded-lg border" />
                      )}
                      <p className="text-sm text-slate-700 mt-3">{item.public_description}</p>
                      {item.private_details && (
                        <div className="mt-3 p-2 bg-slate-100 rounded border border-slate-300 text-xs">
                          <strong className="text-slate-900">Private Identifying Details (Visible only to you/admin):</strong>
                          <p className="text-slate-700 mt-0.5">{item.private_details}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t flex justify-between items-center">
                      <span className="text-xs text-slate-500">By: {item.reporter_name}</span>
                      {item.report_type === 'FOUND' && item.status === 'OPEN' && item.reporter_id !== user.user_id && (
                        <button onClick={() => setClaimingItem(item)}
                          className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold px-3 py-2 rounded focus:ring-2 focus:ring-blue-600">
                          Claim This Item
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {view === 'report' && (
          <section className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold mb-4">Report a Lost or Found Item</h2>
            <form onSubmit={handleCreateReport} className="space-y-4">
              <div>
                <label htmlFor="r-type" className="block text-sm font-bold">Report Type</label>
                <select id="r-type" className="mt-1 w-full border rounded-lg p-2.5" value={reportForm.report_type}
                  onChange={e => setReportForm({ ...reportForm, report_type: e.target.value })}>
                  <option value="FOUND">I Found an Item</option>
                  <option value="LOST">I Lost an Item</option>
                </select>
              </div>
              <div>
                <label htmlFor="r-title" className="block text-sm font-bold">Item Title</label>
                <input id="r-title" required placeholder="e.g. Set of Keys with Blue Keyring" className="mt-1 w-full border rounded-lg p-2.5"
                  value={reportForm.title} onChange={e => setReportForm({ ...reportForm, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="r-cat" className="block text-sm font-bold">Category</label>
                  <select id="r-cat" className="mt-1 w-full border rounded-lg p-2.5" value={reportForm.category}
                    onChange={e => setReportForm({ ...reportForm, category: e.target.value })}>
                    <option value="Keys">Keys</option>
                    <option value="Electronics">Electronics</option>
                    <option value="ID / Cards">ID / Cards</option>
                    <option value="Books / Stationery">Books / Stationery</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="r-date" className="block text-sm font-bold">Date Lost/Found</label>
                  <input id="r-date" type="date" required className="mt-1 w-full border rounded-lg p-2.5"
                    value={reportForm.incident_date} onChange={e => setReportForm({ ...reportForm, incident_date: e.target.value })} />
                </div>
              </div>
              <div>
                <label htmlFor="r-loc" className="block text-sm font-bold">Campus Location</label>
                <input id="r-loc" required placeholder="e.g. N5B, Hamu Mukasa Library, Touch of Class" className="mt-1 w-full border rounded-lg p-2.5"
                  value={reportForm.campus_location} onChange={e => setReportForm({ ...reportForm, campus_location: e.target.value })} />
              </div>
              <div>
                <label htmlFor="r-pub" className="block text-sm font-bold">Public Description</label>
                <textarea id="r-pub" required rows={2} placeholder="General description visible to everyone. Keep private marks or phone numbers out!"
                  className="mt-1 w-full border rounded-lg p-2.5" value={reportForm.public_description}
                  onChange={e => setReportForm({ ...reportForm, public_description: e.target.value })} />
              </div>
              {reportForm.report_type === 'FOUND' && (
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-300">
                  <label htmlFor="r-priv" className="block text-sm font-bold text-amber-950">Private Identifying Details (Hidden from Public)</label>
                  <p className="text-xs text-amber-800 mb-1">Record hidden serial numbers, inscriptions, or unique marks only the real owner knows.</p>
                  <textarea id="r-priv" required rows={2} className="w-full border border-amber-400 rounded-lg p-2 text-sm"
                    value={reportForm.private_details} onChange={e => setReportForm({ ...reportForm, private_details: e.target.value })} />
                </div>
              )}
              <div>
                <label htmlFor="r-img" className="block text-sm font-bold">Optional Photograph (Exclude private details from photo)</label>
                <input id="r-img" type="file" accept="image/*" className="mt-1 w-full text-sm" onChange={e => setImageFile(e.target.files[0])} />
              </div>
              <button type="submit" className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-2.5 rounded-lg">
                Submit Report
              </button>
            </form>
          </section>
        )}

        {view === 'claims' && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold">{user.role === 'ADMIN' ? 'All Submitted Claims' : 'My Ownership Claims'}</h2>
            {claims.length === 0 ? <p className="bg-white p-6 rounded-xl border text-slate-600">No claims recorded yet.</p> : (
              claims.map(c => (
                <div key={c.claim_id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg">{c.item_title}</h3>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded ${c.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-900' : c.status === 'REJECTED' ? 'bg-red-100 text-red-900' : 'bg-amber-100 text-amber-900'}`}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-sm mt-2"><strong>Your Private Evidence:</strong> {c.evidence_text}</p>
                  {c.admin_reason && (
                    <p className="text-sm mt-2 p-2 bg-blue-50 text-blue-950 rounded border border-blue-200">
                      <strong>Administrator Response:</strong> {c.admin_reason}
                    </p>
                  )}
                </div>
              ))
            )}
          </section>
        )}

        {view === 'admin' && user.role === 'ADMIN' && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold">Administrator Claim Verification & Handover Panel</h2>
            {claims.map(c => (
              <div key={c.claim_id} className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm space-y-3">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <h3 className="font-bold text-lg">{c.item_title} (Item Status: {c.item_status})</h3>
                    <p className="text-xs text-slate-600">Claimant: {c.claimant_name} ({c.claimant_reg})</p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded bg-slate-100 border">Claim Status: {c.status}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                    <strong>Finder's Private Item Details:</strong>
                    <p className="mt-1">{c.item_private_details || 'None recorded'}</p>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <strong>Claimant's Private Proof:</strong>
                    <p className="mt-1">{c.evidence_text}</p>
                  </div>
                </div>

                {c.status === 'PENDING' && c.item_status === 'OPEN' && (
                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <input aria-label="Decision Reason or Collection Instructions"
                      placeholder="Enter collection office/reason (e.g. Verified inscription. Collect at Dean of Students Office)"
                      className="flex-1 border rounded-lg p-2 text-sm"
                      value={reviewInputs[c.claim_id] || ''}
                      onChange={e => setReviewInputs({ ...reviewInputs, [c.claim_id]: e.target.value })} />
                    <button onClick={() => handleAdminReview(c.claim_id, 'APPROVED')} className="bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-bold px-4 py-2 rounded-lg">
                      Approve Claim
                    </button>
                    <button onClick={() => handleAdminReview(c.claim_id, 'REJECTED')} className="bg-red-700 hover:bg-red-600 text-white text-sm font-bold px-4 py-2 rounded-lg">
                      Reject Claim
                    </button>
                  </div>
                )}

                {c.status === 'APPROVED' && c.item_status === 'CLAIM_APPROVED' && (
                  <div className="pt-2">
                    <button onClick={() => handleConfirmReturn(c.item_id)} className="bg-blue-900 hover:bg-blue-800 text-white text-sm font-bold px-4 py-2 rounded-lg">
                      Confirm Physical Collection & Mark Item Returned
                    </button>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {claimingItem && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white max-w-md w-full rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-bold">Submit Ownership Claim</h3>
              <p className="text-sm text-slate-600 mt-1">Item: <strong>{claimingItem.title}</strong></p>
              <form onSubmit={handleSubmitClaim} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="claim-ev" className="block text-sm font-bold">Private Ownership Evidence</label>
                  <p className="text-xs text-slate-500 mb-1">Describe unique hidden details (e.g., inscription on the back, serial number, contents) visible only to you and the administrator.</p>
                  <textarea id="claim-ev" required rows={3} className="w-full border rounded-lg p-2.5 text-sm"
                    value={evidenceText} onChange={e => setEvidenceText(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setClaimingItem(null)} className="px-4 py-2 rounded border text-sm font-semibold">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded bg-blue-900 text-white text-sm font-semibold">Submit Private Claim</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
