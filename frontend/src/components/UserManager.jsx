import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" style={{ borderRadius: '0.75rem' }}>
        <div className="flex items-center justify-between p-5 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="text-base font-semibold text-theme-primary">{title}</h3>
          <button onClick={onClose} className="text-xl leading-none text-theme-secondary hover-theme rounded p-1">✕</button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(null); // holds user object
  const [showResetPinModal, setShowResetPinModal] = useState(null); // holds user object
  const [deleteConfirm, setDeleteConfirm] = useState(null); // holds user object

  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'attendant', pin: '' });
  const [resetPassword, setResetPassword] = useState('');
  const [resetPin, setResetPin] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/users');
      if (!res.ok) throw new Error('Failed to load user accounts.');
      setUsers(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openAdd = () => {
    setForm({ name: '', username: '', password: '', role: 'attendant', pin: '' });
    setFormError('');
    setShowAddModal(true);
  };

  const handleAddSubmit = async e => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim() || !form.username.trim() || !form.password.trim() || !form.pin.trim()) {
      setFormError('All fields including a 4-digit PIN are required.');
      return;
    }
    if (!/^\d{4}$/.test(form.pin.trim())) {
      setFormError('PIN must be exactly 4 digits.');
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      await fetchUsers();
      setShowAddModal(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openReset = user => {
    setResetPassword('');
    setFormError('');
    setShowResetModal(user);
  };

  const handleResetSubmit = async e => {
    e.preventDefault();
    setFormError('');
    if (!resetPassword.trim()) {
      setFormError('Password cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch(`/api/users/${showResetModal.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      setShowResetModal(null);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openResetPin = user => {
    setResetPin('');
    setFormError('');
    setShowResetPinModal(user);
  };

  const handleResetPinSubmit = async e => {
    e.preventDefault();
    setFormError('');
    if (!resetPin.trim() || !/^\d{4}$/.test(resetPin.trim())) {
      setFormError('PIN must be exactly 4 digits.');
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch(`/api/users/${showResetPinModal.id}/pin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: resetPin })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset PIN');
      await fetchUsers();
      setShowResetPinModal(null);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await apiFetch(`/api/users/${deleteConfirm.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');
      await fetchUsers();
      setDeleteConfirm(null);
    } catch (err) {
      alert(err.message);
    }
  };

  if (error) return <div className="rounded-lg p-4" style={{ background: '#fee2e2', color: '#991b1b' }}>{error}</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-theme-primary">Staff Management</h2>
          <p className="text-sm mt-1 text-theme-secondary">{users.length} active users</p>
        </div>
        <button onClick={openAdd} className="btn-primary">👤 + Add Staff User</button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-10 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-muted)' }} />)}</div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-theme-secondary"><span className="text-5xl">👤</span><p className="mt-3">No staff accounts found.</p></div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: 'var(--bg-muted)', borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    {['Name', 'Username', 'Role', 'PIN Code', 'Date Registered', 'Actions'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs uppercase tracking-wide text-theme-secondary font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="hover-theme" style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td className="py-3 px-4 font-medium text-theme-primary">{user.name}</td>
                      <td className="py-3 px-4 text-theme-secondary">{user.username}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${user.role === 'admin' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400' : 'bg-slate-50 text-slate-700 dark:bg-slate-800/30 dark:text-slate-400'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-theme-primary font-bold">{user.pin || '—'}</td>
                      <td className="py-3 px-4 text-theme-secondary">{new Date(user.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <button onClick={() => openReset(user)} className="text-xs font-medium mr-4 text-indigo-600 hover:underline">Reset Pass</button>
                        <button onClick={() => openResetPin(user)} className="text-xs font-medium mr-4 text-indigo-600 hover:underline">Reset PIN</button>
                        <button onClick={() => setDeleteConfirm(user)} className="text-xs font-medium text-red-500 hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden">
              {users.map(user => (
                <div key={user.id} className="p-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-theme-primary">{user.name}</p>
                      <p className="text-xs text-theme-secondary">@{user.username}</p>
                      <p className="text-xs text-theme-secondary mt-1">PIN: <span className="font-mono font-semibold">{user.pin || '—'}</span></p>
                    </div>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${user.role === 'admin' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400' : 'bg-slate-50 text-slate-700 dark:bg-slate-800/30 dark:text-slate-400'}`}>
                      {user.role}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-dashed" style={{ borderColor: 'var(--border-light)' }}>
                    <span className="text-xs text-theme-muted">Registered: {new Date(user.created_at).toLocaleDateString()}</span>
                    <div className="flex gap-2">
                      <button onClick={() => openReset(user)} className="text-xs font-medium text-indigo-600 hover:underline">Reset Pass</button>
                      <button onClick={() => openResetPin(user)} className="text-xs font-medium text-indigo-600 hover:underline">Reset PIN</button>
                      <button onClick={() => setDeleteConfirm(user)} className="text-xs font-medium text-red-500 hover:underline">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <Modal title="Create Staff Account" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            {formError && <p className="text-sm p-2 rounded" style={{ background: '#fee2e2', color: '#991b1b' }}>{formError}</p>}
            
            <div>
              <label className="label">Full Name *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Jane Doe" />
            </div>

            <div>
              <label className="label">Username *</label>
              <input className="input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="e.g. jane_doe" />
            </div>

            <div>
              <label className="label">Initial Password *</label>
              <input type="password" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
            </div>

            <div>
              <label className="label">Unique 4-Digit PIN *</label>
              <input className="input font-mono" maxLength="4" pattern="\d{4}" value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))} placeholder="e.g. 1234" />
            </div>

            <div>
              <label className="label">System Role *</label>
              <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="attendant">Shop Attendant (Restricted Rights)</option>
                <option value="workshop">Workshop Attendant (Transit Dispatch Only)</option>
                <option value="embroidery">Embroidery Attendant (Transit Check-in & Dispatch)</option>
                <option value="admin">System Administrator (Full Access)</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Creating...' : 'Create Account'}
              </button>
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <Modal title={`Reset Password for ${showResetModal.name}`} onClose={() => setShowResetModal(null)}>
          <form onSubmit={handleResetSubmit} className="space-y-4">
            {formError && <p className="text-sm p-2 rounded" style={{ background: '#fee2e2', color: '#991b1b' }}>{formError}</p>}

            <div>
              <label className="label">New Password *</label>
              <input type="password" className="input" value={resetPassword} onChange={e => setResetPassword(e.target.value)} placeholder="••••••••" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Resetting...' : 'Update Password'}
              </button>
              <button type="button" onClick={() => setShowResetModal(null)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reset PIN Modal */}
      {showResetPinModal && (
        <Modal title={`Reset PIN for ${showResetPinModal.name}`} onClose={() => setShowResetPinModal(null)}>
          <form onSubmit={handleResetPinSubmit} className="space-y-4">
            {formError && <p className="text-sm p-2 rounded" style={{ background: '#fee2e2', color: '#991b1b' }}>{formError}</p>}

            <div>
              <label className="label">New 4-Digit PIN *</label>
              <input className="input font-mono" maxLength="4" pattern="\d{4}" value={resetPin} onChange={e => setResetPin(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 1234" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Updating...' : 'Update PIN'}
              </button>
              <button type="button" onClick={() => setShowResetPinModal(null)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete User Confirmation */}
      {deleteConfirm && (
        <Modal title="Delete Staff Account" onClose={() => setDeleteConfirm(null)}>
          <p className="text-theme-secondary mb-5">
            Are you sure you want to delete the staff account for <strong className="text-theme-primary">{deleteConfirm.name} (@{deleteConfirm.username})</strong>? 
            This user will immediately lose system access.
          </p>
          <div className="flex gap-3">
            <button onClick={handleDelete} className="btn-danger flex-1">Delete Account</button>
            <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
