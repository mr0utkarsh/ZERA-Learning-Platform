(function () {
  const API_BASE_URL = 'http://localhost:5000/api';

  function getToken() { return localStorage.getItem('zera_token'); }

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        ...(options.headers || {})
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {})
    });

    const data = await response.json().catch(() => ({ success: false, message: 'Request failed.' }));
    if (!response.ok || !data.success) throw new Error(data.message || 'Request failed.');
    return data.data;
  }

  function qs(name) { return new URLSearchParams(window.location.search).get(name); }

  function renderHierarchy(hierarchy, courseId) {
    const container = document.getElementById('hierarchyContainer');
    container.innerHTML = '';

    (hierarchy || []).forEach((subject) => {
      const sEl = document.createElement('div');
      sEl.className = 'subject-block';
      sEl.innerHTML = `<h4>${subject.title}</h4><p style="color:#6b7b8f;">${subject.description || ''}</p>`;

      (subject.units || []).forEach((unit) => {
        const uEl = document.createElement('div');
        uEl.className = 'unit-block';
        uEl.style.marginLeft = '12px';
        uEl.innerHTML = `<h5 style="margin:8px 0 6px;">${unit.title}</h5>`;

        (unit.chapters || []).forEach((chapter) => {
          const cEl = document.createElement('div');
          cEl.className = 'chapter-block';
          cEl.style.marginLeft = '12px';
          cEl.innerHTML = `<strong>${chapter.title}</strong>`;

          (chapter.topics || []).forEach((topic) => {
            const tEl = document.createElement('div');
            tEl.className = 'topic-block';
            tEl.style.marginLeft = '12px';
            tEl.innerHTML = `<em style="display:block; margin-top:6px;">${topic.title}</em>`;

            const lessonsList = document.createElement('ol');
            lessonsList.style.marginTop = '6px';

            (topic.lessons || []).forEach((lesson) => {
              const li = document.createElement('li');
              const a = document.createElement('a');
              a.href = `./lesson.html?courseId=${encodeURIComponent(courseId)}&lessonId=${encodeURIComponent(lesson.id)}`;
              a.textContent = lesson.title;
              li.appendChild(a);
              lessonsList.appendChild(li);
            });

            tEl.appendChild(lessonsList);
            cEl.appendChild(tEl);
          });

          uEl.appendChild(cEl);
        });

        sEl.appendChild(uEl);
      });

      container.appendChild(sEl);
    });
  }

  function setProgressUI(progress) {
    const bar = document.getElementById('courseProgressBar');
    const summary = document.getElementById('progressSummary');
    const openBtn = document.getElementById('openCourseBtn');
    if (bar) bar.style.width = `${progress.completionPercentage || 0}%`;
    if (summary) summary.textContent = `${progress.completedLessons || 0} of ${progress.totalLessons || 0} lessons completed`;

    if (openBtn) {
      if (progress.nextLesson && progress.nextLesson.id) {
        openBtn.href = `./lesson.html?courseId=${encodeURIComponent(progress.course.id)}&lessonId=${encodeURIComponent(progress.nextLesson.id)}`;
        openBtn.classList.remove('disabled');
      } else {
        openBtn.href = '#';
        openBtn.classList.add('disabled');
      }
    }
  }

  async function init() {
    const courseId = qs('courseId');
    if (!courseId) {
      document.getElementById('hierarchyContainer').textContent = 'Missing course id in URL.';
      return;
    }

    if (!getToken()) { window.location.href = './login.html'; return; }

    try {
      // Ensure catalog exists (idempotent)
      await apiRequest('/initialize-catalog', { method: 'POST' }).catch(() => null);

      // Fetch course details (also ensures enrollment per backend controller)
      const details = await apiRequest(`/courses/${courseId}`);
      document.getElementById('courseTitle').textContent = details.course.title || 'Course';
      document.getElementById('courseTitleHeader').textContent = details.course.title || 'Course';
      document.getElementById('courseDescription').textContent = details.course.description || '';

      renderHierarchy(details.hierarchy || [], courseId);

      // Fetch progress snapshot
      const progressSnapshot = await apiRequest(`/courses/${courseId}/progress`);
      setProgressUI({ ...(progressSnapshot.progress || {}), nextLesson: progressSnapshot.nextLesson, course: progressSnapshot.course });

      // Enroll button
      const enrollBtn = document.getElementById('enrollBtn');
      if (enrollBtn) {
        enrollBtn.addEventListener('click', async function () {
          enrollBtn.disabled = true; enrollBtn.textContent = 'Enrolling...';
          try {
            const resp = await apiRequest(`/courses/${courseId}/enroll`, { method: 'POST' });
            // After enrolling refresh progress
            const p = await apiRequest(`/courses/${courseId}/progress`);
            setProgressUI({ ...(p.progress || {}), nextLesson: p.nextLesson, course: p.course });
            enrollBtn.textContent = 'Enrolled';
          } catch (err) {
            console.error('Enroll failed', err);
            enrollBtn.textContent = 'Enroll';
            alert(err.message || 'Enroll failed');
          } finally { enrollBtn.disabled = false; }
        });
      }
    } catch (error) {
      console.error('Course load failed', error);
      document.getElementById('hierarchyContainer').textContent = error.message || 'Failed to load course.';
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
