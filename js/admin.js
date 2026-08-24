(function () {
  const API_BASE_URL = 'http://localhost:5000/api/admin';

  function getToken() { return localStorage.getItem('zera_token'); }

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {})
    });

    const data = await response.json().catch(() => ({ success: false, message: 'Request failed.' }));
    if (!response.ok || !data.success) throw new Error(data.message || 'Admin request failed.');
    return data.data;
  }

  function renderRecentStudents(students) {
    const container = document.getElementById('recentStudentsList');
    if (!container) return;
    if (!students || students.length === 0) {
      container.innerHTML = '<div class="empty-state"><strong>No students yet</strong><span>Students will appear here once they join.</span></div>';
      return;
    }

    container.innerHTML = students.map((student) => `
      <div class="task-item">
        <strong>${student.name}</strong>
        <span>${student.email} • ${student.status}</span>
      </div>
    `).join('');
  }

  function renderStudentsTable(students) {
    const container = document.getElementById('studentsList');
    if (!container) return;
    if (!students || students.length === 0) {
      container.innerHTML = '<div class="empty-state"><strong>No student matches</strong><span>Try another search or status filter.</span></div>';
      return;
    }

    container.innerHTML = students.map((student) => `
      <div class="task-item" style="display:block; padding:14px 16px; border-radius:12px;">
        <div class="flex justify-between wrap" style="gap:12px; align-items:center;">
          <div>
            <strong>${student.name}</strong><br />
            <span>${student.email}</span>
          </div>
          <span class="status-badge ${student.status === 'SUSPENDED' ? 'warning' : 'success'}">${student.status}</span>
        </div>
        <div style="margin-top:8px; color:#52657a; font-size:0.92rem;">
          Joined: ${new Date(student.createdAt).toLocaleDateString()} • Institution: ${student.profile?.institution || 'Not set'}
        </div>
        <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn btn-small ${student.status === 'SUSPENDED' ? 'btn-primary' : 'btn-secondary'}" data-action="toggle-status" data-id="${student.id}" data-status="${student.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED'}">
            ${student.status === 'SUSPENDED' ? 'Restore' : 'Suspend'}
          </button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-action="toggle-status"]').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.dataset.id;
        const status = button.dataset.status;
        button.disabled = true;
        button.textContent = 'Updating...';
        try {
          await apiRequest(`/students/${id}/status`, { method: 'PATCH', body: { status } });
          await loadStudents();
        } catch (error) {
          alert(error.message || 'Unable to update student status.');
          button.disabled = false;
        }
      });
    });
  }

  async function loadOverview() {
    if (!getToken()) {
      window.location.href = './admin-login.html';
      return;
    }

    try {
      const overview = await apiRequest('/overview');
      const user = JSON.parse(localStorage.getItem('zera_user') || '{}');
      document.getElementById('adminName').textContent = user.name || 'Admin';
      document.getElementById('totalStudents').textContent = String(overview.totalStudents || 0);
      document.getElementById('activeStudents').textContent = String(overview.activeStudents || 0);
      document.getElementById('suspendedStudents').textContent = String(overview.suspendedStudents || 0);
      document.getElementById('totalEnrollments').textContent = String(overview.totalEnrollments || 0);
      document.getElementById('totalCourses').textContent = String(overview.totalCourses || 0);
      document.getElementById('activeRatio').textContent = `${overview.summary?.activeRatio ?? 0}%`;
      document.getElementById('suspendedRatio').textContent = `${overview.summary?.suspendedRatio ?? 0}%`;
      renderRecentStudents(overview.recentStudents || []);
    } catch (error) {
      console.error('Admin overview failed', error);
      window.location.href = './admin-login.html';
    }
  }

  async function loadStudents() {
    const search = document.getElementById('studentSearch')?.value || '';
    const status = document.getElementById('statusFilter')?.value || '';

    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const students = await apiRequest(`/students${params.toString() ? `?${params.toString()}` : ''}`);
      renderStudentsTable(students);
    } catch (error) {
      console.error('Student fetch failed', error);
      document.getElementById('studentsList').innerHTML = '<div class="empty-state"><strong>Unable to load students</strong><span>Check your authentication and try again.</span></div>';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.endsWith('/admin.html')) {
      loadOverview();
    }

    if (window.location.pathname.endsWith('/admin-students.html')) {
      loadStudents();
      document.getElementById('searchStudentsBtn')?.addEventListener('click', loadStudents);
      document.getElementById('studentSearch')?.addEventListener('input', () => {
        if (!document.getElementById('studentSearch').value) loadStudents();
      });
      document.getElementById('statusFilter')?.addEventListener('change', loadStudents);
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('zera_token');
        localStorage.setItem('zera_user', JSON.stringify({ isLoggedIn: false }));
        window.location.href = './admin-login.html';
      });
    }
  });
})();
