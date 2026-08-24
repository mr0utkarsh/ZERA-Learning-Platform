(function () {
  const API_BASE = 'http://localhost:5000/api';

  function escapeHTML(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function load(filters = {}) {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, value]) => value)
    );

    const token = localStorage.getItem('zera_token');

    const response = await fetch(
      `${API_BASE}/student/resources?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || 'Unable to load resources.'
      );
    }

    const root = document.getElementById('resourceList');

    if (!root) return;

    if (!Array.isArray(data.data) || data.data.length === 0) {
      root.innerHTML = `
        <div class="empty-state">
          <strong>No resources found</strong>
          <span>Try another search.</span>
        </div>
      `;
      return;
    }

    root.innerHTML = data.data.map((item) => `
      <article class="card light-card">

        <span class="badge neutral">
          ${escapeHTML(item.resourceType)}
        </span>

        <h3>
          ${escapeHTML(item.title)}
        </h3>

        <p>
          ${escapeHTML(item.description || '')}
        </p>

        ${
          item.url
            ? `
              <a
                class="btn btn-secondary btn-small"
                href="${escapeHTML(item.url)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open resource
              </a>
            `
            : ''
        }

      </article>
    `).join('');
  }

  document.addEventListener('DOMContentLoaded', () => {

    const token = localStorage.getItem('zera_token');

    if (!token) {
      window.location.replace('./login.html');
      return;
    }

    const form = document.getElementById('resourceFilters');
    const root = document.getElementById('resourceList');

    if (!form || !root) return;

    const run = () => {
      const filters = Object.fromEntries(
        new FormData(form).entries()
      );

      load(filters).catch((error) => {
        root.innerHTML = `
          <div class="empty-state">
            <strong>Unable to load resources</strong>
            <span>${escapeHTML(error.message)}</span>
          </div>
        `;
      });
    };

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      run();
    });

    run();
  });
})();