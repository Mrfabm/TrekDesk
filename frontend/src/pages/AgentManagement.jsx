import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RowActionsDropdown from '../components/RowActionsDropdown';

const API = 'http://localhost:8000/api';
const token = () => localStorage.getItem('token');

const ANCHOR_LABELS = {
  from_request: 'Days from request date',
  from_authorization: 'Days from authorization date',
  before_trek: 'Days before trek date',
};

const EMPTY_FORM = {
  name: '',
  type: 'agent',
  is_trusted: false,
  has_rolling_deposit: false,
  email: '',
  phone: '',
  notes: '',
  payment_terms_deposit_days: 7,
  payment_terms_balance_days: 45,
  payment_terms_anchor: 'from_request',
  rolling_deposit_limit: 0,
};

const inputCls =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white';

const Toggle = ({ checked, onChange, disabled, colorOn = 'bg-green-500' }) => (
  <button
    type="button"
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
      checked ? colorOn : 'bg-gray-300 dark:bg-gray-600'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span
      className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out ${
        checked ? 'translate-x-4' : 'translate-x-0'
      }`}
    />
  </button>
);

const AgentManagement = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  const [agents, setAgents] = useState([]);
  const [newAgent, setNewAgent] = useState(EMPTY_FORM);
  const [editAgent, setEditAgent] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: '' });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    if (!['superuser', 'admin'].includes(role)) navigate('/');
    fetchAgents();
  }, [navigate, role]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 3000);
  };

  const fetchAgents = async () => {
    const res = await fetch(`${API}/agents`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (res.ok) setAgents(await res.json());
  };

  const handleAdd = async e => {
    e.preventDefault();
    const res = await fetch(`${API}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(newAgent),
    });
    if (res.ok) {
      showToast('Added successfully');
      setNewAgent(EMPTY_FORM);
      fetchAgents();
    } else {
      const d = await res.json();
      showToast(d.detail || 'Failed to add', 'error');
    }
  };

  const handleToggle = async (agent, field) => {
    setSaving(agent.id);
    const res = await fetch(`${API}/agents/${agent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ ...agent, [field]: !agent[field] }),
    });
    if (res.ok) {
      setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, [field]: !a[field] } : a));
      showToast('Updated');
    } else {
      showToast('Failed to update', 'error');
    }
    setSaving(null);
  };

  const handleEdit = async e => {
    e.preventDefault();
    const res = await fetch(`${API}/agents/${editAgent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      showToast('Updated');
      setEditAgent(null);
      fetchAgents();
    } else {
      const d = await res.json();
      showToast(d.detail || 'Failed to update', 'error');
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this agent/client? Their bookings will be unlinked.')) return;
    const res = await fetch(`${API}/agents/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (res.ok) { showToast('Deleted'); fetchAgents(); }
    else showToast('Failed to delete', 'error');
  };

  const filtered = agents.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.email || '').toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || a.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Agent / Client Management</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Manage external agents and clients that bookings belong to. Trust status drives the authorization workflow.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All types</option>
            <option value="agent">Agents</option>
            <option value="client">Clients</option>
          </select>
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Add form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Add New Agent / Client</h3>
        <form onSubmit={handleAdd}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name <span className="text-red-500">*</span></label>
              <input type="text" required value={newAgent.name} onChange={e => setNewAgent(a => ({ ...a, name: e.target.value }))} className={inputCls} placeholder="e.g. Gorilla Dreams Ltd" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type</label>
              <select value={newAgent.type} onChange={e => setNewAgent(a => ({ ...a, type: e.target.value }))} className={inputCls}>
                <option value="agent">Agent</option>
                <option value="client">Client</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label>
              <input type="email" value={newAgent.email} onChange={e => setNewAgent(a => ({ ...a, email: e.target.value }))} className={inputCls} placeholder="optional" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Phone</label>
              <input type="text" value={newAgent.phone} onChange={e => setNewAgent(a => ({ ...a, phone: e.target.value }))} className={inputCls} placeholder="optional" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
              <input type="text" value={newAgent.notes} onChange={e => setNewAgent(a => ({ ...a, notes: e.target.value }))} className={inputCls} placeholder="optional" />
            </div>
            <div className="flex flex-col justify-center gap-3 pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Toggle checked={newAgent.is_trusted} onChange={() => setNewAgent(a => ({ ...a, is_trusted: !a.is_trusted }))} />
                <span className="text-sm text-gray-700 dark:text-gray-300">Trusted</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Toggle checked={newAgent.has_rolling_deposit} onChange={() => setNewAgent(a => ({ ...a, has_rolling_deposit: !a.has_rolling_deposit }))} colorOn="bg-blue-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Rolling Deposit</span>
              </label>
            </div>
          </div>

          {/* Payment Terms */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Payment Terms</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Deposit due (days)</label>
                <input type="number" min="1" value={newAgent.payment_terms_deposit_days}
                  onChange={e => setNewAgent(a => ({ ...a, payment_terms_deposit_days: parseInt(e.target.value) || 7 }))}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Balance due (days)</label>
                <input type="number" min="1" value={newAgent.payment_terms_balance_days}
                  onChange={e => setNewAgent(a => ({ ...a, payment_terms_balance_days: parseInt(e.target.value) || 45 }))}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Anchor</label>
                <select value={newAgent.payment_terms_anchor}
                  onChange={e => setNewAgent(a => ({ ...a, payment_terms_anchor: e.target.value }))}
                  className={inputCls}>
                  {Object.entries(ANCHOR_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              {newAgent.has_rolling_deposit && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Rolling deposit limit ($)</label>
                  <input type="number" min="0" step="100" value={newAgent.rolling_deposit_limit}
                    onChange={e => setNewAgent(a => ({ ...a, rolling_deposit_limit: parseFloat(e.target.value) || 0 }))}
                    className={inputCls} />
                </div>
              )}
            </div>
          </div>

          <button type="submit" className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
            Add Agent / Client
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/30">
            <tr>
              {['Name', 'Type', 'Contact', 'Trusted', 'Rolling Deposit', 'Notes', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                  {search || typeFilter !== 'all' ? 'No results match your filters.' : 'No agents or clients yet. Add one above.'}
                </td>
              </tr>
            ) : filtered.map(a => (
              <tr
                key={a.id}
                onClick={() => { setEditAgent(a); setEditForm({ ...a }); }}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{a.name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${a.type === 'agent' ? 'bg-purple-100 text-purple-700' : 'bg-cyan-100 text-cyan-700'}`}>
                    {a.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                  {a.email && <div>{a.email}</div>}
                  {a.phone && <div>{a.phone}</div>}
                  {!a.email && !a.phone && <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <Toggle checked={a.is_trusted} onChange={() => handleToggle(a, 'is_trusted')} disabled={saving === a.id} />
                    <span className={`text-xs font-medium ${a.is_trusted ? 'text-green-600' : 'text-gray-400'}`}>
                      {a.is_trusted ? 'Trusted' : 'Untrusted'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <Toggle checked={a.has_rolling_deposit} onChange={() => handleToggle(a, 'has_rolling_deposit')} disabled={saving === a.id} colorOn="bg-blue-500" />
                    <span className={`text-xs font-medium ${a.has_rolling_deposit ? 'text-blue-600' : 'text-gray-400'}`}>
                      {a.has_rolling_deposit ? 'Yes' : 'No'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-[160px] truncate">{a.notes || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <RowActionsDropdown actions={[
                    { label: 'Edit', onClick: () => { setEditAgent(a); setEditForm({ ...a }); } },
                    { label: 'Delete', onClick: () => handleDelete(a.id), variant: 'danger' },
                  ]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editAgent && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Edit {editAgent.name}</h2>
            <form onSubmit={handleEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
                  <input type="text" required value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type</label>
                  <select value={editForm.type || 'agent'} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))} className={inputCls}>
                    <option value="agent">Agent</option>
                    <option value="client">Client</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label>
                  <input type="email" value={editForm.email || ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Phone</label>
                  <input type="text" value={editForm.phone || ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
                  <input type="text" value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div className="flex gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Toggle checked={editForm.is_trusted || false} onChange={() => setEditForm(f => ({ ...f, is_trusted: !f.is_trusted }))} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Trusted</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Toggle checked={editForm.has_rolling_deposit || false} onChange={() => setEditForm(f => ({ ...f, has_rolling_deposit: !f.has_rolling_deposit }))} colorOn="bg-blue-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Rolling Deposit</span>
                </label>
              </div>

              {/* Payment Terms */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Payment Terms</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Deposit due (days)</label>
                    <input type="number" min="1" value={editForm.payment_terms_deposit_days ?? 7}
                      onChange={e => setEditForm(f => ({ ...f, payment_terms_deposit_days: parseInt(e.target.value) || 7 }))}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Balance due (days)</label>
                    <input type="number" min="1" value={editForm.payment_terms_balance_days ?? 45}
                      onChange={e => setEditForm(f => ({ ...f, payment_terms_balance_days: parseInt(e.target.value) || 45 }))}
                      className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Anchor</label>
                    <select value={editForm.payment_terms_anchor || 'from_request'}
                      onChange={e => setEditForm(f => ({ ...f, payment_terms_anchor: e.target.value }))}
                      className={inputCls}>
                      {Object.entries(ANCHOR_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  {editForm.has_rolling_deposit && (
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Rolling deposit limit ($)</label>
                      <input type="number" min="0" step="100" value={editForm.rolling_deposit_limit ?? 0}
                        onChange={e => setEditForm(f => ({ ...f, rolling_deposit_limit: parseFloat(e.target.value) || 0 }))}
                        className={inputCls} />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditAgent(null)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast.msg && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default AgentManagement;
