/**
 * Legacy admin console.
 *
 * The console talks to the same backend as the React app through the shared
 * client in js/api.js, so the API origin and the session token are handled in
 * exactly one place instead of being re-declared per page.
 */
(function () {
  'use strict';

  const api = window.ZeraApi;
  const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];
  const ADMIN_LOGIN = './admin-login.html';

  const getUser = () => api.getUser() || {};

  const isAdmin = (user) => Boolean(user && ADMIN_ROLES.includes(user.role));

  /**
   * Every admin page sits behind the same guard: a session must exist and it
   * must belong to an administrator. A student session is dropped so the
   * browser lands on the admin login form instead of the student app.
   */
  function requireAdminSession() {
    if (!api.getToken()) {
      window.location.href = ADMIN_LOGIN;
      return false;
    }
    if (!isAdmin(getUser())) {
      api.clearSession();
      window.location.href = ADMIN_LOGIN;
      return false;
    }
    return true;
  }

  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString();
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  function ratio(part, total) {
    const numerator = Number(part) || 0;
    const denominator = Number(total) || 0;
    if (!denominator) return '0%';
    return `${Math.round((numerator / denominator) * 100)}%`;
  }

  function statusBadge(status) {
    const normalized = String(status || 'UNKNOWN').toUpperCase();
    const tone = normalized === 'ACTIVE'
      ? 'success'
      : normalized === 'SUSPENDED'
        ? 'warning'
        : 'neutral';
    return `<span class="status-badge ${tone}">${escapeHtml(normalized)}</span>`;
  }

  function roleBadge(role) {
    const normalized = String(role || 'STUDENT').toUpperCase();
    const tone = normalized === 'SUPER_ADMIN'
      ? 'danger'
      : normalized === 'ADMIN'
        ? 'info'
        : 'neutral';
    return `<span class="status-badge ${tone}">${escapeHtml(normalized.replace('_', ' '))}</span>`;
  }

  function notify(message, type = 'info') {
    const el = document.getElementById('adminNotice');
    if (!el) return;
    el.textContent = message;
    el.className = `notice ${type}`;
    el.style.display = message ? 'block' : 'none';
  }

  function isAuthError(error) {
    return error && (error.status === 401 || error.status === 403);
  }

  // ─── Overview ───────────────────────────────────────────────────────────────

  function renderRecentAccounts(accounts) {
    const container = document.getElementById('recentStudentsList');
    if (!container) return;

    if (!accounts || accounts.length === 0) {
      container.innerHTML = '<div class="empty-state"><strong>No accounts yet</strong><span>Accounts will appear here once users register.</span></div>';
      return;
    }

    container.innerHTML = accounts.map((account) => `
      <div class="task-item">
        <div>
          <strong>${escapeHtml(account.name || 'Unnamed user')}</strong>
          <span>${escapeHtml(account.email || '')}</span>
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:flex-end;">
          ${roleBadge(account.role)}
          ${statusBadge(account.status)}
        </div>
      </div>
    `).join('');
  }

  async function loadOverview() {
    if (!requireAdminSession()) return;

    const user = getUser();
    setText('adminName', user.name || 'Administrator');
    setText('adminAccessLevel', String(user.role || 'ADMIN').replace('_', ' '));

    try {
      const stats = await api.admin.stats();
      const counts = (stats && stats.counts) || {};

      setText('totalStudents', counts.totalStudents || 0);
      setText('activeStudents', counts.activeStudents || 0);
      setText('suspendedStudents', counts.suspendedStudents || 0);
      setText('totalEnrollments', counts.totalEnrollments || 0);
      setText('totalCourses', counts.totalCourses || 0);
      setText('totalAdmins', counts.totalAdmins || 0);
      setText('totalSuperAdmins', counts.totalSuperAdmins || 0);
      setText('pendingInvites', counts.pendingInvites || 0);
      setText('totalQuizzes', counts.totalQuizzes || 0);
      setText('activeRatio', ratio(counts.activeStudents, counts.totalStudents));
      setText('suspendedRatio', ratio(counts.suspendedStudents, counts.totalStudents));

      renderRecentAccounts((stats && stats.recentUsers) || []);
    } catch (error) {
      if (isAuthError(error)) {
        api.clearSession();
        window.location.href = ADMIN_LOGIN;
        return;
      }
      console.error('Admin overview failed', error);
      const container = document.getElementById('recentStudentsList');
      if (container) {
        container.innerHTML = `<div class="empty-state"><strong>Unable to load the overview</strong><span>${escapeHtml(error.message || 'Please try again.')}</span></div>`;
      }
    }
  }

  // ─── Students ───────────────────────────────────────────────────────────────

  function renderStudents(students) {
    const container = document.getElementById('studentsList');
    if (!container) return;

    if (!students || students.length === 0) {
      container.innerHTML = '<div class="empty-state"><strong>No student matches</strong><span>Try another search or status filter.</span></div>';
      return;
    }

    container.innerHTML = students.map((student) => {
      const suspended = String(student.status || '').toUpperCase() === 'SUSPENDED';
      const counts = student._count || {};
      return `
        <div class="task-item" style="display:block; padding:14px 16px; border-radius:12px;">
          <div class="flex justify-between wrap" style="gap:12px; align-items:center;">
            <div>
              <strong>${escapeHtml(student.name || 'Unnamed user')}</strong><br />
              <span>${escapeHtml(student.email || '')}</span>
            </div>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:flex-end;">
              ${roleBadge(student.role)}
              ${statusBadge(student.status)}
            </div>
          </div>
          <div style="margin-top:8px; color:#b9b3d2; font-size:0.92rem;">
            Joined: ${escapeHtml(formatDate(student.createdAt))} • Enrollments: ${escapeHtml(counts.enrollments || 0)} • Notes: ${escapeHtml(counts.notes || 0)} • Quizzes: ${escapeHtml(counts.quizAttempts || 0)}
          </div>
          <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
            <button class="btn btn-small ${suspended ? 'btn-primary' : 'btn-secondary'}" data-action="toggle-status" data-id="${escapeHtml(student.id)}" data-status="${suspended ? 'ACTIVE' : 'SUSPENDED'}">
              ${suspended ? 'Restore' : 'Suspend'}
            </button>
            <select class="admin-select" data-action="change-role" data-id="${escapeHtml(student.id)}" aria-label="Change role">
              <option value="STUDENT"${student.role === 'STUDENT' ? ' selected' : ''}>Student</option>
              <option value="ADMIN"${student.role === 'ADMIN' ? ' selected' : ''}>Admin</option>
            </select>
            <button class="btn btn-small btn-danger" data-action="delete-user" data-id="${escapeHtml(student.id)}" data-email="${escapeHtml(student.email || '')}">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  }

  async function loadStudents() {
    if (!requireAdminSession()) return;

    const container = document.getElementById('studentsList');
    const search = (document.getElementById('studentSearch')?.value || '').trim();
    const status = document.getElementById('statusFilter')?.value || '';

    if (container) {
      container.innerHTML = '<div class="empty-state"><strong>Loading students…</strong><span>Fetching the latest accounts.</span></div>';
    }

    try {
      const students = await api.admin.users({ role: 'STUDENT', search, status });
      renderStudents(students || []);
    } catch (error) {
      if (isAuthError(error)) {
        api.clearSession();
        window.location.href = ADMIN_LOGIN;
        return;
      }
      console.error('Student fetch failed', error);
      if (container) {
        container.innerHTML = `<div class="empty-state"><strong>Unable to load students</strong><span>${escapeHtml(error.message || 'Check your authentication and try again.')}</span></div>`;
      }
    }
  }

  async function setStatus(id, status, button) {
    if (button) {
      button.disabled = true;
      button.textContent = 'Updating…';
    }
    try {
      if (status === 'SUSPENDED') {
        await api.admin.suspendUser(id);
      } else {
        await api.admin.restoreUser(id);
      }
      notify(status === 'SUSPENDED' ? 'The account has been suspended.' : 'The account has been restored.', 'success');
      await loadStudents();
    } catch (error) {
      notify(error.message || 'Unable to update the account status.', 'error');
      if (button) {
        button.disabled = false;
        button.textContent = status === 'SUSPENDED' ? 'Suspend' : 'Restore';
      }
    }
  }

  async function changeRole(id, role) {
    try {
      await api.admin.updateUserRole(id, role);
      notify(`The account role was updated to ${role.replace('_', ' ')}.`, 'success');
    } catch (error) {
      notify(error.message || 'Unable to update the account role.', 'error');
    }
    await loadStudents();
  }

  async function deleteUser(id, email, button) {
    const confirmed = window.confirm(`Permanently delete ${email || 'this account'}? This cannot be undone.`);
    if (!confirmed) return;

    if (button) {
      button.disabled = true;
      button.textContent = 'Deleting…';
    }
    try {
      await api.admin.deleteUser(id);
      notify(`The account ${email || ''} has been deleted.`.trim(), 'success');
      await loadStudents();
    } catch (error) {
      notify(error.message || 'Unable to delete the account.', 'error');
      if (button) {
        button.disabled = false;
        button.textContent = 'Delete';
      }
    }
  }

  function bindStudentActions() {
    const container = document.getElementById('studentsList');
    if (!container) return;

    container.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button || button.tagName !== 'BUTTON') return;

      const id = button.dataset.id;
      if (button.dataset.action === 'toggle-status') {
        setStatus(id, button.dataset.status, button);
      } else if (button.dataset.action === 'delete-user') {
        deleteUser(id, button.dataset.email, button);
      }
    });

    container.addEventListener('change', (event) => {
      const select = event.target.closest('[data-action="change-role"]');
      if (!select) return;
      changeRole(select.dataset.id, select.value);
    });
  }

  // ─── Invitations ─────────────────────────────────────────────────────────────

  // The invite that is currently waiting for a password, if any.
  let approvingInviteId = null;

  // The last loaded list, kept so the row can be re-rendered in place when an
  // approval is started or cancelled.
  let currentInvites = [];

  function inviteStatusBadge(status) {
    const normalized = String(status || 'PENDING').toUpperCase();
    const tone = normalized === 'APPROVED'
      ? 'success'
      : normalized === 'REVOKED'
        ? 'danger'
        : 'warning';
    return `<span class="status-badge ${tone}">${escapeHtml(normalized)}</span>`;
  }

  function renderInvites(invites) {
    const container = document.getElementById('invitesList');
    if (!container) return;

    if (!invites || invites.length === 0) {
      container.innerHTML = '<div class="empty-state"><strong>No invitations</strong><span>Invite an administrator to give them access to this console.</span></div>';
      return;
    }

    container.innerHTML = invites.map((invite) => {
      const isPending = String(invite.status || '').toUpperCase() === 'PENDING';
      const isApproving = approvingInviteId === invite.id;
      const invitedBy = invite.invitedBy ? invite.invitedBy.email : 'an administrator';

      return `
        <div class="task-item" style="display:block; padding:14px 16px; border-radius:12px;">
          <div class="flex justify-between wrap" style="gap:12px; align-items:center;">
            <div>
              <strong>${escapeHtml(invite.name || 'Unnamed invitee')}</strong><br />
              <span>${escapeHtml(invite.email || '')}</span>
            </div>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:flex-end;">
              ${roleBadge(invite.role)}
              ${inviteStatusBadge(invite.status)}
            </div>
          </div>
          <div style="margin-top:8px; color:#b9b3d2; font-size:0.92rem;">
            Invited by ${escapeHtml(invitedBy)} on ${escapeHtml(formatDate(invite.createdAt))}
          </div>
          ${isPending && !isApproving ? `
            <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
              <button class="btn btn-small btn-primary" data-action="approve" data-id="${escapeHtml(invite.id)}">Approve</button>
              <button class="btn btn-small btn-danger" data-action="revoke" data-id="${escapeHtml(invite.id)}" data-email="${escapeHtml(invite.email || '')}">Revoke</button>
            </div>` : ''}
          ${isPending && isApproving ? `
            <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap; align-items:flex-end;">
              <div class="field" style="flex:1; min-width:220px;">
                <label for="invitePassword-${escapeHtml(invite.id)}">Set the account password</label>
                <input id="invitePassword-${escapeHtml(invite.id)}" type="password" autocomplete="new-password" minlength="8" placeholder="At least 8 characters" />
              </div>
              <button class="btn btn-small btn-primary" data-action="confirm-approve" data-id="${escapeHtml(invite.id)}">Activate</button>
              <button class="btn btn-small btn-secondary" data-action="cancel-approve">Cancel</button>
            </div>` : ''}
        </div>
      `;
    }).join('');
  }

  async function loadInvites() {
    if (!requireAdminSession()) return;

    const container = document.getElementById('invitesList');
    const status = document.getElementById('inviteStatusFilter')?.value || '';

    if (container) {
      container.innerHTML = '<div class="empty-state"><strong>Loading invitations…</strong><span>Fetching the latest administrator requests.</span></div>';
    }

    try {
      const invites = await api.admin.invites(status);
      currentInvites = invites || [];
      renderInvites(currentInvites);
    } catch (error) {
      if (isAuthError(error)) {
        api.clearSession();
        window.location.href = ADMIN_LOGIN;
        return;
      }
      console.error('Invite fetch failed', error);
      if (container) {
        container.innerHTML = `<div class="empty-state"><strong>Unable to load invitations</strong><span>${escapeHtml(error.message || 'Please try again.')}</span></div>`;
      }
    }
  }

  async function createInvite(form) {
    const button = document.getElementById('sendInviteBtn');
    const name = document.getElementById('inviteName').value.trim();
    const email = document.getElementById('inviteEmail').value.trim();
    const role = document.getElementById('inviteRole').value;

    const resetButton = () => {
      if (button) {
        button.disabled = false;
        button.textContent = 'Send invitation';
      }
    };

    if (button) {
      button.disabled = true;
      button.textContent = 'Sending…';
    }

    try {
      await api.admin.createInvite({ name, email, role });
      notify(`Invitation sent to ${email}. The account stays inactive until it is approved.`, 'success');
      form.reset();
      await loadInvites();
    } catch (error) {
      notify(error.message || 'Unable to create the invitation.', 'error');
    }

    resetButton();
  }

  async function approveInvite(id) {
    const input = document.getElementById(`invitePassword-${id}`);
    const password = input ? input.value : '';

    if (password.length < 8) {
      notify('A password of at least 8 characters is required to activate the account.', 'error');
      if (input) input.focus();
      return;
    }

    try {
      await api.admin.approveInvite(id, { password });
      approvingInviteId = null;
      notify('The administrator account is now active.', 'success');
      await loadInvites();
    } catch (error) {
      notify(error.message || 'Unable to approve the invitation.', 'error');
    }
  }

  async function revokeInvite(id, email) {
    const confirmed = window.confirm(`Revoke the invitation for ${email || 'this address'}?`);
    if (!confirmed) return;

    try {
      await api.admin.revokeInvite(id);
      notify(`The invitation for ${email || ''} was revoked.`.trim(), 'success');
      await loadInvites();
    } catch (error) {
      notify(error.message || 'Unable to revoke the invitation.', 'error');
    }
  }

  function bindInviteActions() {
    const container = document.getElementById('invitesList');
    if (!container) return;

    container.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button || button.tagName !== 'BUTTON') return;

      const id = button.dataset.id;
      if (button.dataset.action === 'approve') {
        approvingInviteId = id;
        renderInvites(currentInvites);
        const input = document.getElementById(`invitePassword-${id}`);
        if (input) input.focus();
      } else if (button.dataset.action === 'confirm-approve') {
        approveInvite(id);
      } else if (button.dataset.action === 'cancel-approve') {
        approvingInviteId = null;
        renderInvites(currentInvites);
      } else if (button.dataset.action === 'revoke') {
        revokeInvite(id, button.dataset.email);
      }
    });

    const form = document.getElementById('inviteForm');
    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        createInvite(form);
      });
    }

    document.getElementById('inviteStatusFilter')?.addEventListener('change', loadInvites);
  }

  /**
   * The console header collapses on narrow screens, so the pages carry their
   * own toggle for the collapsed navigation. The same behaviour lives in
   * js/app.js for the student pages, which do not load the console script.
   */
  function bindMobileNav() {
    const toggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.mobile-nav');
    if (!toggle || !nav) return;

    const close = () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    };

    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    // Following a link reloads the page, but the open state has to be cleared
    // first or the next page opens with the menu already expanded.
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) close();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 980) close();
    });
  }

  // ─── Bootstrap ──────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {
    bindMobileNav();

    // The console is published both as /admin.html and as /admin, so the route
    // is matched on the page it renders rather than on one exact file name.
    const path = window.location.pathname.replace(/\/+$/, '');
    const isOverview = path.endsWith('/admin') || path.endsWith('/admin.html');
    const isStudents = path.endsWith('/admin-students.html');
    const isInvites = path.endsWith('/admin-invites.html');

    if (isOverview) {
      loadOverview();
    }

    if (isStudents) {
      loadStudents();
      bindStudentActions();
      document.getElementById('searchStudentsBtn')?.addEventListener('click', loadStudents);
      document.getElementById('studentSearch')?.addEventListener('input', () => {
        if (!document.getElementById('studentSearch').value) loadStudents();
      });
      document.getElementById('statusFilter')?.addEventListener('change', loadStudents);
    }

    if (isInvites) {
      // Only a super administrator may invite another super administrator, so
      // the option is removed for everyone else instead of failing server side.
      if (getUser().role !== 'SUPER_ADMIN') {
        document.getElementById('inviteRoleSuper')?.remove();
      }
      loadInvites();
      bindInviteActions();
    }
  });
})();
