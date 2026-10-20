import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { AlertCircle, CheckCircle2, LogOut, Users, ShieldCheck, UserPlus, Search, Loader2 } from 'lucide-react';

type Tab = 'overview' | 'users' | 'invites';

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
};

const roleBadge = (role: string) => {
  if (role === 'SUPER_ADMIN') return 'bg-cyan-500/10 text-cyan-300 ring-cyan-500/20';
  if (role === 'ADMIN') return 'bg-violet-500/10 text-violet-300 ring-violet-500/20';
  return 'bg-white/5 text-muted ring-white/10';
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isSuper = user?.role === 'SUPER_ADMIN';

  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('ADMIN');
  const [inviteBusy, setInviteBusy] = useState(false);

  const [approving, setApproving] = useState<any>(null);
  const [approveName, setApproveName] = useState('');
  const [approvePassword, setApprovePassword] = useState('');
  const [approveBusy, setApproveBusy] = useState(false);

  const flash = (message: string) => {
    setNotice(message);
    setError('');
    window.setTimeout(() => setNotice(''), 6000);
  };

  const fail = (err: any) => {
    setError(err?.message || 'Something went wrong.');
    setNotice('');
  };

  const loadStats = async () => {
    try {
      setStats(await api.admin.stats());
    } catch (err) {
      fail(err);
    }
  };

  const loadUsers = async (nextSearch = search, nextRole = roleFilter) => {
    try {
      setUsers(await api.admin.users({ search: nextSearch || undefined, role: nextRole || undefined }));
    } catch (err) {
      fail(err);
    }
  };

  const loadInvites = async () => {
    try {
      setInvites(await api.admin.invites());
    } catch (err) {
      fail(err);
    }
  };

  useEffect(() => {
    (async () => {
      await Promise.all([loadStats(), loadUsers(), loadInvites()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchTab = (next: Tab) => {
    setTab(next);
    if (next === 'users') loadUsers();
    if (next === 'invites') loadInvites();
  };

  const runAction = async (action: () => Promise<any>, success: string) => {
    try {
      await action();
      flash(success);
      await Promise.all([loadStats(), loadUsers()]);
    } catch (err) {
      fail(err);
    }
  };

  const submitInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteBusy(true);
    try {
      const created = await api.admin.inviteAdmin({ name: inviteName, email: inviteEmail, role: inviteRole });
      flash(
        created?.emailSent
          ? `Invitation sent to ${created.email}. The account activates after approval.`
          : `Invitation created for ${created?.email}, but the notification email could not be sent.`
      );
      setInviteName('');
      setInviteEmail('');
      await Promise.all([loadInvites(), loadStats()]);
    } catch (err) {
      fail(err);
    } finally {
      setInviteBusy(false);
    }
  };

  const submitApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approving) return;
    setApproveBusy(true);
    try {
      await api.admin.approveInvite(approving.id, {
        name: approveName || approving.name,
        password: approvePassword
      });
      flash(`Administrator account activated for ${approving.email}.`);
      setApproving(null);
      setApproveName('');
      setApprovePassword('');
      await Promise.all([loadInvites(), loadUsers(), loadStats()]);
    } catch (err) {
      fail(err);
    } finally {
      setApproveBusy(false);
    }
  };

  const signOut = () => {
    logout();
    navigate('/admin-login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-void text-fg flex items-center justify-center">
        <div className="loading-spinner" />
      </div>
    );
  }

  const counts = stats?.counts || {};
  const statCards = [
    { label: 'Total users', value: counts.totalUsers ?? 0 },
    { label: 'Students', value: counts.totalStudents ?? 0 },
    { label: 'Administrators', value: (counts.totalAdmins ?? 0) + (counts.totalSuperAdmins ?? 0) },
    { label: 'Suspended', value: counts.suspendedUsers ?? 0 },
    { label: 'Courses', value: counts.totalCourses ?? 0 },
    { label: 'Enrollments', value: counts.totalEnrollments ?? 0 },
    { label: 'Quiz attempts', value: counts.totalQuizAttempts ?? 0 },
    { label: 'Pending invites', value: counts.pendingInvites ?? 0 }
  ];

  const pendingInvites = invites.filter((i) => i.status === 'PENDING');
  const decidedInvites = invites.filter((i) => i.status !== 'PENDING');

  return (
    <div className="min-h-screen bg-void text-fg py-8 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Logo variant="primary" className="h-9" showWordmark />
            <div>
              <h1 className="text-2xl font-bold text-fg flex items-center gap-2">
                Admin console <ShieldCheck className="h-5 w-5 text-violet-300" />
              </h1>
              <p className="text-sm text-muted">
                Signed in as {user?.name} ({user?.role})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="btn-secondary px-4 py-2">Student app</Link>
            <button onClick={signOut} className="btn-ghost px-4 py-2 flex items-center gap-2">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-white/10">
          {([
            ['overview', 'Overview'],
            ['users', 'Users'],
            ['invites', 'Invites']
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => switchTab(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                tab === key
                  ? 'border-violet-400 text-violet-300'
                  : 'border-transparent text-muted hover:text-fg'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 px-4 py-3 ring-1 ring-red-500/20 text-sm text-error flex items-start gap-3 mb-6">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="rounded-xl bg-success/10 px-4 py-3 ring-1 ring-success/20 text-sm text-success flex items-start gap-3 mb-6">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{notice}</span>
          </div>
        )}

        {tab === 'overview' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              {statCards.map((s) => (
                <div key={s.label} className="card-lift zera-card p-5">
                  <div className="text-2xl font-bold text-fg">{s.value}</div>
                  <div className="text-sm text-muted">{s.label}</div>
                </div>
              ))}
            </div>

            {stats?.ai && (
              <div className="card-lift zera-card p-6 mb-8">
                <h2 className="text-lg font-semibold text-fg mb-2">AI providers</h2>
                <p className="text-sm text-muted mb-4">{stats.ai.message}</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(stats.ai.providers || {}).map(([id, meta]: [string, any]) => (
                    <div key={id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm">
                      <span className="text-fg">{id}</span>
                      <span className={meta.configured ? 'text-success' : 'text-muted'}>
                        {meta.configured ? meta.model : 'not configured'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card-lift zera-card p-6">
              <h2 className="text-lg font-semibold text-fg mb-4">Recent signups</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted">
                      <th className="pb-2 font-medium">Name</th>
                      <th className="pb-2 font-medium">Email</th>
                      <th className="pb-2 font-medium">Role</th>
                      <th className="pb-2 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats?.recentUsers || []).map((u: any) => (
                      <tr key={u.id} className="border-t border-white/5">
                        <td className="py-2">{u.name}</td>
                        <td className="py-2 text-muted">{u.email}</td>
                        <td className="py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs ring-1 ${roleBadge(u.role)}`}>{u.role}</span>
                        </td>
                        <td className="py-2 text-muted">{formatDate(u.createdAt)}</td>
                      </tr>
                    ))}
                    {(stats?.recentUsers || []).length === 0 && (
                      <tr><td colSpan={4} className="py-4 text-muted">No users yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === 'users' && (
          <div className="card-lift zera-card p-6">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                <Search className="h-4 w-4 text-muted shrink-0" />
                <input
                  className="field-input"
                  placeholder="Search by name or email"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') loadUsers(); }}
                />
              </div>
              <select
                className="field-select w-auto"
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); loadUsers(search, e.target.value); }}
              >
                <option value="">All roles</option>
                <option value="STUDENT">Students</option>
                <option value="ADMIN">Admins</option>
                <option value="SUPER_ADMIN">Super admins</option>
              </select>
              <button className="btn-secondary px-4 py-2" onClick={() => loadUsers()}>Apply</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Email</th>
                    <th className="pb-2 font-medium">Role</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Last login</th>
                    <th className="pb-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-white/5">
                      <td className="py-2">{u.name}</td>
                      <td className="py-2 text-muted">{u.email}</td>
                      <td className="py-2">
                        <select
                          className="field-select py-1 text-xs w-auto"
                          value={u.role}
                          disabled={u.id === user?.id}
                          onChange={(e) => runAction(() => api.admin.updateUserRole(u.id, e.target.value), `Role updated for ${u.email}.`)}
                        >
                          <option value="STUDENT">STUDENT</option>
                          <option value="ADMIN">ADMIN</option>
                          {isSuper && <option value="SUPER_ADMIN">SUPER_ADMIN</option>}
                        </select>
                      </td>
                      <td className="py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs ring-1 ${u.status === 'SUSPENDED' ? 'bg-red-500/10 text-error ring-red-500/20' : 'bg-success/10 text-success ring-success/20'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="py-2 text-muted">{formatDate(u.lastLoginAt)}</td>
                      <td className="py-2">
                        <div className="flex justify-end gap-2">
                          {u.status === 'SUSPENDED' ? (
                            <button className="btn-soft btn-sm" disabled={u.id === user?.id} onClick={() => runAction(() => api.admin.restoreUser(u.id), `Restored ${u.email}.`)}>Restore</button>
                          ) : (
                            <button className="btn-secondary btn-sm" disabled={u.id === user?.id} onClick={() => runAction(() => api.admin.suspendUser(u.id), `Suspended ${u.email}.`)}>Suspend</button>
                          )}
                          <button className="btn-secondary btn-sm" disabled={u.id === user?.id} onClick={() => runAction(() => api.admin.deleteUser(u.id), `Deleted ${u.email}.`)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={6} className="py-4 text-muted">No users match this filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'invites' && (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="card-lift zera-card p-6">
              <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-violet-300" /> Pending invitations
              </h2>

              <div className="space-y-4">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="rounded-xl bg-white/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-fg">{invite.name}</div>
                        <div className="text-xs text-muted">{invite.email} · {invite.role} · invited {formatDate(invite.createdAt)}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="btn-primary btn-sm"
                          onClick={() => { setApproving(invite); setApproveName(invite.name); setApprovePassword(''); }}
                        >
                          Approve
                        </button>
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => runAction(async () => { await api.admin.revokeInvite(invite.id); await loadInvites(); }, `Revoked the invite for ${invite.email}.`)}
                        >
                          Revoke
                        </button>
                      </div>
                    </div>

                    {approving?.id === invite.id && (
                      <form onSubmit={submitApproval} className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="field-label">Administrator name</label>
                          <input className="field-input" value={approveName} onChange={(e) => setApproveName(e.target.value)} required />
                        </div>
                        <div>
                          <label className="field-label">Temporary password</label>
                          <input className="field-input" type="password" minLength={8} value={approvePassword} onChange={(e) => setApprovePassword(e.target.value)} required />
                        </div>
                        <div className="sm:col-span-2 flex gap-2">
                          <button className="btn-primary btn-sm" disabled={approveBusy}>
                            {approveBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {approveBusy ? 'Activating…' : 'Activate account'}
                          </button>
                          <button type="button" className="btn-secondary btn-sm" onClick={() => setApproving(null)}>Cancel</button>
                        </div>
                      </form>
                    )}
                  </div>
                ))}
                {pendingInvites.length === 0 && (
                  <p className="text-sm text-muted">No pending invitations.</p>
                )}
              </div>

              {decidedInvites.length > 0 && (
                <>
                  <h3 className="text-base font-semibold text-fg mt-8 mb-3">Decided invitations</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted">
                          <th className="pb-2 font-medium">Name</th>
                          <th className="pb-2 font-medium">Email</th>
                          <th className="pb-2 font-medium">Role</th>
                          <th className="pb-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {decidedInvites.map((invite) => (
                          <tr key={invite.id} className="border-t border-white/5">
                            <td className="py-2">{invite.name}</td>
                            <td className="py-2 text-muted">{invite.email}</td>
                            <td className="py-2">{invite.role}</td>
                            <td className="py-2">{invite.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="card-lift zera-card p-6 h-fit">
              <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-cyan-300" /> Invite an administrator
              </h2>
              <form onSubmit={submitInvite} className="space-y-4">
                <div>
                  <label className="field-label">Name</label>
                  <input className="field-input" value={inviteName} onChange={(e) => setInviteName(e.target.value)} required />
                </div>
                <div>
                  <label className="field-label">Email</label>
                  <input className="field-input" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
                </div>
                <div>
                  <label className="field-label">Role</label>
                  <select className="field-select" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                    <option value="ADMIN">ADMIN</option>
                    {isSuper && <option value="SUPER_ADMIN">SUPER_ADMIN</option>}
                  </select>
                </div>
                <p className="text-xs text-muted">
                  The invited person receives an email with a sign-in link. The account only becomes active after you approve it and set a password.
                </p>
                <button className="btn-primary w-full py-2.5" disabled={inviteBusy}>
                  {inviteBusy ? 'Sending…' : 'Create invitation'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
