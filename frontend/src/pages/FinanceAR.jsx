import { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:8000/api';
const tok = () => localStorage.getItem('token');
const fmt = v => `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const daysUntil = d => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;

const authHdr = () => ({ Authorization: `Bearer ${tok()}` });
const jsonHdr = () => ({ 'Content-Type': 'application/json', ...authHdr() });

const URGENCY_STYLE = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  high:     'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  normal:   'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

const STATUS_LABEL = {
  secured_deposit:       'Secured (deposit)',
  secured_full:          'Secured (full)',
  secured_authorization: 'Secured (auth)',
};

// ─── Shared ───────────────────────────────────────────────────────────────────

const CARD_BORDER = {
  blue:   'border-l-blue-500',
  red:    'border-l-red-500',
  green:  'border-l-green-500',
  orange: 'border-l-orange-400',
  purple: 'border-l-purple-500',
};
const CARD_VALUE_COLOR = {
  blue:   'text-blue-600 dark:text-blue-400',
  red:    'text-red-600 dark:text-red-400',
  green:  'text-green-600 dark:text-green-400',
  orange: 'text-orange-500 dark:text-orange-400',
  purple: 'text-purple-600 dark:text-purple-400',
};

const MetricCard = ({ label, value, sub, color = 'blue' }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 shadow-sm p-4 ${CARD_BORDER[color]}`}>
    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider leading-none">{label}</p>
    <p className={`text-2xl font-bold mt-2 leading-none ${CARD_VALUE_COLOR[color]}`}>{value}</p>
    {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
  </div>
);

const DueDateCell = ({ date, overdue }) => {
  const days = daysUntil(date);
  if (!date) return <span className="text-gray-400">—</span>;
  return (
    <div>
      <span className={overdue ? 'text-red-600 font-semibold' : days !== null && days <= 3 ? 'text-orange-500 font-medium' : 'text-gray-700 dark:text-gray-300'}>
        {fmtDate(date)}
      </span>
      {days !== null && (
        <span className={`ml-1 text-xs ${overdue ? 'text-red-500' : days <= 7 ? 'text-orange-400' : 'text-gray-400'}`}>
          {overdue ? `${Math.abs(days)}d overdue` : `in ${days}d`}
        </span>
      )}
    </div>
  );
};

// ─── Edit Due Dates Modal ─────────────────────────────────────────────────────

const DueDateModal = ({ booking, onClose, onSaved }) => {
  const [depositDate, setDepositDate] = useState(
    booking.deposit_due_date ? new Date(booking.deposit_due_date).toISOString().slice(0, 10) : ''
  );
  const [balanceDate, setBalanceDate] = useState(
    booking.balance_due_date ? new Date(booking.balance_due_date).toISOString().slice(0, 10) : ''
  );
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!booking.payment_id) return;
    setSaving(true);
    const updates = [];
    if (depositDate) updates.push({ field: 'deposit_due_date', new_date: new Date(depositDate).toISOString() });
    if (balanceDate) updates.push({ field: 'balance_due_date', new_date: new Date(balanceDate).toISOString() });
    for (const u of updates) {
      await fetch(`${API}/finance-ar/payment/${booking.payment_id}/due-date`, {
        method: 'PUT', headers: jsonHdr(), body: JSON.stringify({ ...u, reason }),
      });
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Edit Due Dates — {booking.booking_name}</h3>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Deposit due date</label>
          <input type="date" value={depositDate} onChange={e => setDepositDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Balance due date</label>
          <input type="date" value={balanceDate} onChange={e => setBalanceDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Reason (audit trail)</label>
          <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Agent agreed to extend"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white" />
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Audit History Modal ──────────────────────────────────────────────────────

const AuditModal = ({ booking, onClose }) => {
  const [audits, setAudits] = useState(null);

  useEffect(() => {
    fetch(`${API}/finance-ar/payment/${booking.payment_id}/audit`, { headers: authHdr() })
      .then(r => r.ok ? r.json() : [])
      .then(setAudits);
  }, [booking.payment_id]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Due Date History — {booking.booking_name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
        </div>
        {!audits ? (
          <p className="text-sm text-gray-400 py-6 text-center">Loading…</p>
        ) : audits.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No due date changes recorded.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 uppercase">
                {['Field', 'From', 'To', 'Reason', 'By', 'When'].map(h => (
                  <th key={h} className="pb-2 text-left pr-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {audits.map((a, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-3 font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {a.field.replace('_due_date', '')}
                  </td>
                  <td className="py-1.5 pr-3 text-gray-500">{fmtDate(a.old)}</td>
                  <td className="py-1.5 pr-3 text-gray-900 dark:text-white">{fmtDate(a.new)}</td>
                  <td className="py-1.5 pr-3 text-gray-500 max-w-[140px] truncate">{a.reason || '—'}</td>
                  <td className="py-1.5 pr-3 text-gray-500">{a.changed_by || '—'}</td>
                  <td className="py-1.5 text-gray-400">{fmtDate(a.changed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ─── Record Payment Modal ─────────────────────────────────────────────────────

const RecordPaymentModal = ({ booking, onClose, onSaved }) => {
  const [paymentType, setPaymentType] = useState(
    booking.payment_status === 'deposit_paid' ? 'full' : 'deposit'
  );
  const [amount, setAmount] = useState(String(booking.amount_owed || ''));
  const [returnRd, setReturnRd] = useState(booking.has_rolling_deposit && booking.rd_applied);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!amount || isNaN(amount)) return;
    setSaving(true);
    await fetch(`${API}/finance-ar/payment/${booking.payment_id}/record-payment`, {
      method: 'POST',
      headers: jsonHdr(),
      body: JSON.stringify({ payment_type: paymentType, amount: parseFloat(amount), notes, return_rd: returnRd }),
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Record Payment — {booking.booking_name}</h3>
        <p className="text-xs text-gray-500">{booking.agent_client_name || '—'} · {fmtDate(booking.trek_date)}</p>

        <div className="flex gap-3">
          {[['deposit', 'Deposit received'], ['full', 'Full / balance received']].map(([val, label]) => (
            <label key={val} className={`flex-1 flex items-center gap-2 p-3 rounded-lg border cursor-pointer text-sm
              ${paymentType === val ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600'}`}>
              <input type="radio" name="ptype" value={val} checked={paymentType === val} onChange={() => setPaymentType(val)} />
              {label}
            </label>
          ))}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Amount received ($)</label>
          <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white" />
          <p className="text-xs text-gray-400 mt-1">Amount owed: {fmt(booking.amount_owed)}</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes / reference</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Wire ref, cheque no., etc."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white" />
        </div>

        {booking.has_rolling_deposit && booking.rd_applied && (
          <label className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 cursor-pointer">
            <input type="checkbox" className="mt-0.5" checked={returnRd} onChange={e => setReturnRd(e.target.checked)} />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Return to rolling deposit pot</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                Agent's funds were used to cover this permit. Checking this restores the amount to their pot.
              </p>
            </div>
          </label>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
          <button onClick={save} disabled={saving || !amount}
            className="px-4 py-2 text-sm text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Rolling Deposit Ledger Modal ────────────────────────────────────────────

const TXN_COLORS = {
  top_up:     'text-green-600 dark:text-green-400',
  returned:   'text-blue-600 dark:text-blue-400',
  applied:    'text-orange-600 dark:text-orange-400',
  adjustment: 'text-purple-600 dark:text-purple-400',
};

const LedgerModal = ({ agent, onClose, onAction }) => {
  const [ledger, setLedger] = useState(null);
  const [topUpAmt, setTopUpAmt] = useState('');
  const [topUpNote, setTopUpNote] = useState('');
  const [returningId, setReturningId] = useState(null);
  const [returnAmt, setReturnAmt] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchLedger = useCallback(async () => {
    const res = await fetch(`${API}/finance-ar/rolling-deposit/${agent.agent_client_id}/ledger`, {
      headers: authHdr(),
    });
    if (res.ok) setLedger(await res.json());
  }, [agent.agent_client_id]);

  useEffect(() => { fetchLedger(); }, [fetchLedger]);

  const handleTopUp = async () => {
    if (!topUpAmt || isNaN(topUpAmt)) return;
    setSaving(true);
    await fetch(`${API}/finance-ar/rolling-deposit/${agent.agent_client_id}/top-up`, {
      method: 'POST', headers: jsonHdr(),
      body: JSON.stringify({ amount: parseFloat(topUpAmt), notes: topUpNote }),
    });
    setSaving(false);
    setTopUpAmt(''); setTopUpNote('');
    fetchLedger(); onAction();
  };

  const handleReturn = async (pending) => {
    const amt = returningId === pending.booking_id ? parseFloat(returnAmt) : pending.outstanding;
    if (!amt) return;
    setSaving(true);
    await fetch(`${API}/finance-ar/rolling-deposit/${agent.agent_client_id}/return`, {
      method: 'POST', headers: jsonHdr(),
      body: JSON.stringify({ booking_id: pending.booking_id, amount: amt, notes: 'Agent payment received' }),
    });
    setSaving(false);
    setReturningId(null); setReturnAmt('');
    fetchLedger(); onAction();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl p-6 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{agent.agent_client_name} — Rolling Deposit</h3>
            {ledger && (
              <p className="text-xs text-gray-500 mt-0.5">
                Limit: {fmt(ledger.rolling_deposit_limit)} &nbsp;|&nbsp;
                Available: <span className={ledger.rolling_deposit_balance < ledger.rolling_deposit_limit * 0.2 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                  {fmt(ledger.rolling_deposit_balance)}
                </span>
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
        </div>

        {/* Pending Returns */}
        {ledger && ledger.pending_returns.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-2">
              Pending Returns ({ledger.pending_returns.length})
            </p>
            <div className="space-y-2">
              {ledger.pending_returns.map(pr => (
                <div key={pr.booking_id} className="flex items-center justify-between bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-xs font-medium text-gray-900 dark:text-white">{pr.booking_name}</p>
                    <p className="text-xs text-gray-500">Applied {fmt(pr.applied)} · Returned {fmt(pr.returned)} · Outstanding {fmt(pr.outstanding)}</p>
                  </div>
                  {returningId === pr.booking_id ? (
                    <div className="flex items-center gap-2">
                      <input type="number" value={returnAmt} onChange={e => setReturnAmt(e.target.value)}
                        placeholder={pr.outstanding} step="0.01" min="0"
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-xs dark:bg-gray-700 dark:text-white" />
                      <button onClick={() => handleReturn(pr)} disabled={saving}
                        className="px-2 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50">
                        {saving ? '…' : 'Confirm'}
                      </button>
                      <button onClick={() => setReturningId(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => { setReturningId(pr.booking_id); setReturnAmt(String(pr.outstanding)); }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap">
                      Record Return
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top-up form */}
        <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-3 mb-4 flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Top-up amount ($)</label>
            <input type="number" min="0" step="100" value={topUpAmt} onChange={e => setTopUpAmt(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Reference / note</label>
            <input type="text" value={topUpNote} onChange={e => setTopUpNote(e.target.value)} placeholder="Wire ref, etc."
              className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white" />
          </div>
          <button onClick={handleTopUp} disabled={saving || !topUpAmt}
            className="px-4 py-1.5 text-sm text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 whitespace-nowrap">
            {saving ? '…' : 'Record Top-up'}
          </button>
        </div>

        {/* Transaction list */}
        <div className="overflow-y-auto flex-1">
          {!ledger ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
          ) : ledger.transactions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No transactions yet.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b dark:border-gray-700">
                  {['Date', 'Type', 'Booking', 'Amount', 'Balance After', 'Notes'].map(h => (
                    <th key={h} className={`pb-2 ${h === 'Amount' || h === 'Balance After' ? 'text-right' : 'text-left'} ${h === 'Notes' ? 'pl-3' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {ledger.transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-2 text-xs text-gray-500">{fmtDate(t.created_at)}</td>
                    <td className={`py-2 text-xs font-semibold capitalize ${TXN_COLORS[t.type] || ''}`}>{t.type.replace('_', ' ')}</td>
                    <td className="py-2 text-xs text-gray-600 dark:text-gray-400">{t.booking_name || '—'}</td>
                    <td className={`py-2 text-xs font-mono text-right ${t.type === 'applied' ? 'text-orange-600' : 'text-green-600'}`}>
                      {t.type === 'applied' ? '-' : '+'}{fmt(t.amount)}
                    </td>
                    <td className="py-2 text-xs font-mono text-right">{fmt(t.balance_after)}</td>
                    <td className="py-2 text-xs text-gray-500 pl-3 max-w-[160px] truncate">{t.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const FinanceAR = () => {
  const [tab, setTab] = useState('ar');
  const [arData, setArData] = useState(null);
  const [rdData, setRdData] = useState(null);
  const [apData, setApData] = useState(null);

  // Modal state — only one open at a time
  const [editBooking,   setEditBooking]   = useState(null);
  const [auditBooking,  setAuditBooking]  = useState(null);
  const [payBooking,    setPayBooking]    = useState(null);
  const [ledgerAgent,   setLedgerAgent]   = useState(null);

  // AR filters
  const [urgencyFilter, setUrgencyFilter]   = useState('all');
  const [statusFilter,  setStatusFilter]    = useState('all');
  const [agentFilter,   setAgentFilter]     = useState('all');
  const [productFilter, setProductFilter]   = useState('all');
  const [bkgStatusFilter, setBkgStatusFilter] = useState('all');
  const [dateFrom,      setDateFrom]        = useState('');
  const [dateTo,        setDateTo]          = useState('');
  // AP filters
  const [apAgentFilter,   setApAgentFilter]   = useState('all');
  const [apProductFilter, setApProductFilter] = useState('all');
  const [apStatusFilter,  setApStatusFilter]  = useState('all');

  const fetchAR = useCallback(async () => {
    const res = await fetch(`${API}/finance-ar/ar`, { headers: authHdr() });
    if (res.ok) setArData(await res.json());
  }, []);

  const fetchRD = useCallback(async () => {
    const res = await fetch(`${API}/finance-ar/rolling-deposit`, { headers: authHdr() });
    if (res.ok) setRdData(await res.json());
  }, []);

  const fetchAP = useCallback(async () => {
    const res = await fetch(`${API}/finance-ar/ap`, { headers: authHdr() });
    if (res.ok) setApData(await res.json());
  }, []);

  useEffect(() => { fetchAR(); fetchRD(); fetchAP(); }, [fetchAR, fetchRD, fetchAP]);

  const refreshAll = () => { fetchAR(); fetchRD(); fetchAP(); };

  const bookings = arData?.bookings || [];

  // Unique option lists for AR
  const arAgents   = [...new Set(bookings.map(b => b.agent_client_name).filter(Boolean))].sort();
  const arProducts = [...new Set(bookings.map(b => b.product).filter(Boolean))].sort();
  const arStatuses = [...new Set(bookings.map(b => b.booking_status).filter(Boolean))].sort();

  const filtered = bookings.filter(b => {
    if (urgencyFilter   !== 'all' && b.urgency           !== urgencyFilter)   return false;
    if (statusFilter    !== 'all' && b.payment_status    !== statusFilter)     return false;
    if (agentFilter     !== 'all' && b.agent_client_name !== agentFilter)      return false;
    if (productFilter   !== 'all' && b.product           !== productFilter)    return false;
    if (bkgStatusFilter !== 'all' && b.booking_status    !== bkgStatusFilter)  return false;
    if (dateFrom && b.trek_date && new Date(b.trek_date) < new Date(dateFrom)) return false;
    if (dateTo   && b.trek_date && new Date(b.trek_date) > new Date(dateTo))   return false;
    return true;
  });

  // Unique option lists for AP
  const apBookings   = apData?.bookings || [];
  const apAgents     = [...new Set(apBookings.map(b => b.agent_client_name).filter(Boolean))].sort();
  const apProducts   = [...new Set(apBookings.map(b => b.product).filter(Boolean))].sort();
  const apStatuses   = [...new Set(apBookings.map(b => b.booking_status).filter(Boolean))].sort();

  const filteredAP = apBookings.filter(b => {
    if (apAgentFilter   !== 'all' && b.agent_client_name !== apAgentFilter)   return false;
    if (apProductFilter !== 'all' && b.product           !== apProductFilter)  return false;
    if (apStatusFilter  !== 'all' && b.booking_status    !== apStatusFilter)   return false;
    return true;
  });

  const apTotal = filteredAP.reduce((s, b) => s + (b.permit_cost || 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Accounts Receivable & Payable</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          AR — agent payments due &nbsp;·&nbsp; AP — permits purchased from the park &nbsp;·&nbsp; Rolling deposit accounts
        </p>
      </div>

      {/* Metrics */}
      {arData && rdData && apData && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <MetricCard label="Total AR"           value={fmt(arData.metrics.total_ar)}          color="blue" />
          <MetricCard label="Overdue AR"          value={fmt(arData.metrics.overdue_ar)}         color="red" />
          <MetricCard label="Critical slots"      value={arData.metrics.critical_slots}          sub="< 10 slots left"  color="red" />
          <MetricCard label="High urgency"        value={arData.metrics.high_slots}              sub="10–20 slots"      color="orange" />
          <MetricCard label="Total AP (permits)"  value={fmt(apData.metrics.total_ap)}           sub={`${apData.metrics.total_permits} bookings`} color="purple" />
          <MetricCard label="RD held"             value={fmt(rdData.metrics.total_held)}         color="green" />
          <MetricCard label="RD available"        value={fmt(rdData.metrics.total_available)}    sub={`${fmt(rdData.metrics.total_pending_return)} pending return`} color="green" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {[['ar', 'Accounts Receivable'], ['ap', 'Accounts Payable (Permits)'], ['rd', 'Rolling Deposits']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── AR Tab ── */}
      {tab === 'ar' && (
        <div className="space-y-3">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex gap-2 flex-wrap items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Agent / Client</label>
              <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white">
                <option value="all">All agents</option>
                {arAgents.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Product</label>
              <select value={productFilter} onChange={e => setProductFilter(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white">
                <option value="all">All products</option>
                {arProducts.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Booking status</label>
              <select value={bkgStatusFilter} onChange={e => setBkgStatusFilter(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white">
                <option value="all">All statuses</option>
                {arStatuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Payment status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white">
                <option value="all">All payment</option>
                <option value="pending">Pending</option>
                <option value="deposit_paid">Deposit paid</option>
                <option value="no_payment">No payment</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Urgency</label>
              <select value={urgencyFilter} onChange={e => setUrgencyFilter(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white">
                <option value="all">All urgency</option>
                <option value="critical">Critical (&lt;10 slots)</option>
                <option value="high">High (10–20)</option>
                <option value="normal">Normal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Trek from</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Trek to</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white" />
            </div>
            {(agentFilter !== 'all' || productFilter !== 'all' || bkgStatusFilter !== 'all' ||
              statusFilter !== 'all' || urgencyFilter !== 'all' || dateFrom || dateTo) && (
              <button onClick={() => {
                setAgentFilter('all'); setProductFilter('all'); setBkgStatusFilter('all');
                setStatusFilter('all'); setUrgencyFilter('all'); setDateFrom(''); setDateTo('');
              }} className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 bg-white border border-gray-300 dark:border-gray-600 rounded-md transition-colors">
                Clear filters
              </button>
            )}
            <span className="text-xs font-medium text-gray-400 self-end pb-1.5 ml-auto">{filtered.length} of {bookings.length}</span>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/40 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                <tr>
                  {['Booking', 'Agent/Client', 'Trek Date', 'Slots', 'Deposit Due', 'Balance Due', 'Owed', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-3 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No outstanding receivables.</td></tr>
                ) : filtered.map(b => (
                  <tr key={b.booking_id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${
                    b.is_cancellation ? 'bg-red-50/30 dark:bg-red-900/10' :
                    b.is_amendment    ? 'bg-amber-50/30 dark:bg-amber-900/10' :
                    (b.deposit_overdue || b.balance_overdue) ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                  }`}>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-gray-900 dark:text-white text-xs">{b.booking_name}</div>
                      <div className="text-xs text-gray-400">{b.booking_ref}</div>
                      {b.is_amendment    && <span className="mt-0.5 inline-block px-1 py-0.5 rounded text-xs bg-amber-100 text-amber-700">Amendment pending</span>}
                      {b.is_cancellation && <span className="mt-0.5 inline-block px-1 py-0.5 rounded text-xs bg-red-100 text-red-600">Cancellation pending</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-xs text-gray-700 dark:text-gray-300">{b.agent_client_name || '—'}</div>
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {b.is_trusted      && <span className="text-xs text-green-600 font-medium">Trusted</span>}
                        {b.has_rolling_deposit && <span className="text-xs text-blue-600 font-medium">RD</span>}
                        {b.rd_applied      && <span className="px-1 py-0.5 rounded text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">RD Applied</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{fmtDate(b.trek_date)}</td>
                    <td className="px-3 py-2.5">
                      {b.slots_available !== null ? (
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${URGENCY_STYLE[b.urgency]}`}>
                          {b.slots_available} {b.urgency === 'critical' ? '🔴' : b.urgency === 'high' ? '⚠️' : ''}
                        </span>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      <DueDateCell date={b.deposit_due_date} overdue={b.deposit_overdue} />
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      <DueDateCell date={b.balance_due_date} overdue={b.balance_overdue} />
                    </td>
                    <td className="px-3 py-2.5 text-xs font-semibold text-gray-900 dark:text-white whitespace-nowrap">{fmt(b.amount_owed)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        b.deposit_overdue || b.balance_overdue ? 'bg-red-100 text-red-700' :
                        b.payment_status === 'deposit_paid'    ? 'bg-yellow-100 text-yellow-700' :
                        b.payment_status === 'fully_paid'      ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {b.deposit_overdue || b.balance_overdue ? 'Overdue' : (b.payment_status || '').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-1">
                        {b.payment_id && b.amount_owed > 0 && (
                          <button onClick={() => setPayBooking(b)}
                            className="px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 transition-colors whitespace-nowrap">
                            Record Payment
                          </button>
                        )}
                        {b.payment_id && (
                          <button onClick={() => setEditBooking(b)}
                            className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 transition-colors whitespace-nowrap">
                            Edit Dates
                          </button>
                        )}
                        {b.payment_id && (
                          <button onClick={() => setAuditBooking(b)}
                            className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-400 transition-colors whitespace-nowrap">
                            History
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── AP Tab ── */}
      {tab === 'ap' && (
        <div className="space-y-3">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex gap-2 flex-wrap items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Agent / Client</label>
              <select value={apAgentFilter} onChange={e => setApAgentFilter(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white">
                <option value="all">All agents</option>
                {apAgents.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Product</label>
              <select value={apProductFilter} onChange={e => setApProductFilter(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white">
                <option value="all">All products</option>
                {apProducts.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Status</label>
              <select value={apStatusFilter} onChange={e => setApStatusFilter(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white">
                <option value="all">All statuses</option>
                {apStatuses.map(s => <option key={s} value={s}>{STATUS_LABEL[s] || s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            {(apAgentFilter !== 'all' || apProductFilter !== 'all' || apStatusFilter !== 'all') && (
              <button onClick={() => { setApAgentFilter('all'); setApProductFilter('all'); setApStatusFilter('all'); }}
                className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 bg-white border border-gray-300 dark:border-gray-600 rounded-md transition-colors">
                Clear filters
              </button>
            )}
            <span className="text-xs font-medium text-gray-400 self-end pb-1.5 ml-auto">{filteredAP.length} of {apBookings.length}</span>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/40 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                <tr>
                  {['Booking', 'Agent/Client', 'Product', 'Trek Date', 'People', 'Unit Cost', 'Permit Cost', 'Status', 'Validated By'].map(h => (
                    <th key={h} className="px-3 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredAP.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No secured bookings match the filters.</td></tr>
                ) : filteredAP.map(b => (
                  <tr key={b.booking_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-gray-900 dark:text-white text-xs">{b.booking_name}</div>
                      <div className="text-xs text-gray-400">{b.booking_ref}</div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-700 dark:text-gray-300">{b.agent_client_name}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400">{b.product}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{fmtDate(b.trek_date)}</td>
                    <td className="px-3 py-2.5 text-xs text-center text-gray-700 dark:text-gray-300">{b.people}</td>
                    <td className="px-3 py-2.5 text-xs font-mono text-gray-600 dark:text-gray-400">{fmt(b.unit_cost)}</td>
                    <td className="px-3 py-2.5 text-xs font-semibold text-gray-900 dark:text-white">{fmt(b.permit_cost)}</td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 capitalize whitespace-nowrap">
                        {STATUS_LABEL[b.booking_status] || b.booking_status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">
                      {b.processed_by ? (
                        <div>
                          <div>{b.processed_by}</div>
                          <div className="text-gray-400">{fmtDate(b.processed_at)}</div>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              {filteredAP.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-900/30 border-t-2 border-gray-200 dark:border-gray-700">
                    <td colSpan={6} className="px-3 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-400 text-right">
                      Total ({filteredAP.length} permits · {filteredAP.reduce((s,b) => s+(b.people||0),0)} people):
                    </td>
                    <td className="px-3 py-2.5 text-sm font-bold text-gray-900 dark:text-white">{fmt(apTotal)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ── Rolling Deposits Tab ── */}
      {tab === 'rd' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              <tr>
                {['Agent / Client', 'Agreed Limit', 'Available', 'Utilisation', 'Pending Return', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {!rdData || rdData.agents.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No rolling deposit accounts configured.</td></tr>
              ) : rdData.agents.map(a => {
                const lowBalance = a.rolling_deposit_balance < a.rolling_deposit_limit * 0.2;
                return (
                  <tr key={a.agent_client_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{a.agent_client_name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{fmt(a.rolling_deposit_limit)}</td>
                    <td className={`px-4 py-3 font-semibold ${lowBalance ? 'text-red-600' : 'text-green-600'}`}>
                      {fmt(a.rolling_deposit_balance)}
                      {lowBalance && <span className="ml-1 text-xs font-normal text-red-500">Low</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${a.utilisation_pct > 80 ? 'bg-red-500' : a.utilisation_pct > 50 ? 'bg-orange-400' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(a.utilisation_pct, 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{a.utilisation_pct}%</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 font-medium ${a.pending_return > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                      {a.pending_return > 0 ? fmt(a.pending_return) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setLedgerAgent(a)}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 transition-colors whitespace-nowrap">
                        View Ledger / Top up
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {editBooking  && <DueDateModal       booking={editBooking}  onClose={() => setEditBooking(null)}  onSaved={fetchAR} />}
      {auditBooking && <AuditModal         booking={auditBooking} onClose={() => setAuditBooking(null)} />}
      {payBooking   && <RecordPaymentModal booking={payBooking}   onClose={() => setPayBooking(null)}   onSaved={refreshAll} />}
      {ledgerAgent  && <LedgerModal        agent={ledgerAgent}    onClose={() => setLedgerAgent(null)}  onAction={refreshAll} />}
    </div>
  );
};

export default FinanceAR;
