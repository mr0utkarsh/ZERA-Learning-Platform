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

  function showMessage(text, type = 'info') {
    const el = document.getElementById('messageArea');
    if (!el) return; el.textContent = text; el.className = type;
  }

  async function init() {
    const courseId = qs('courseId');
    const lessonId = qs('lessonId');
    if (!courseId || !lessonId) {
      showMessage('Missing courseId or lessonId in URL.', 'error');
      return;
    }

    if (!getToken()) { window.location.href = './login.html'; return; }

    try {
      // ensure catalog
      await apiRequest('/initialize-catalog', { method: 'POST' }).catch(() => null);

      // fetch full sequence and progress
      const sequence = await apiRequest(`/courses/${courseId}/lessons`);
      const snapshot = await apiRequest(`/courses/${courseId}/progress`);

      const idx = sequence.findIndex((l) => l.id === lessonId);
      if (idx === -1) throw new Error('Lesson not found in this course.');

      const lesson = sequence[idx];
      document.getElementById('lessonTitle').textContent = lesson.title || 'Lesson';
      document.getElementById('lessonContent').innerHTML = lesson.content || '<p>No content available.</p>';

      const metaParts = [];
      if (lesson.topicTitle) metaParts.push(lesson.topicTitle);
      if (lesson.chapterTitle) metaParts.push(lesson.chapterTitle);
      if (lesson.unitTitle) metaParts.push(lesson.unitTitle);
      if (lesson.subjectTitle) metaParts.push(lesson.subjectTitle);
      document.getElementById('lessonMeta').textContent = metaParts.join(' › ');

      document.getElementById('courseBreadcrumb').href = `./course.html?courseId=${encodeURIComponent(courseId)}`;
      document.getElementById('courseBreadcrumb').textContent = snapshot.course.title || 'Course';
      document.getElementById('lessonBreadcrumb').textContent = lesson.title || 'Lesson';

      const prev = sequence[idx - 1] || null;
      const next = sequence[idx + 1] || null;

      const prevBtn = document.getElementById('prevBtn');
      const nextBtn = document.getElementById('nextBtn');
      const completeBtn = document.getElementById('completeBtn');

      if (prevBtn) {
        if (prev) {
          prevBtn.disabled = false;
          prevBtn.onclick = () => { window.location.href = `./lesson.html?courseId=${encodeURIComponent(courseId)}&lessonId=${encodeURIComponent(prev.id)}`; };
        } else { prevBtn.disabled = true; }
      }

      if (nextBtn) {
        if (next) {
          nextBtn.disabled = false;
          nextBtn.onclick = () => { window.location.href = `./lesson.html?courseId=${encodeURIComponent(courseId)}&lessonId=${encodeURIComponent(next.id)}`; };
        } else { nextBtn.disabled = true; }
      }

      if (completeBtn) {
        completeBtn.disabled = false;
        completeBtn.onclick = async function () {
          completeBtn.disabled = true; completeBtn.textContent = 'Saving...';
          try {
            const res = await apiRequest(`/courses/${courseId}/lessons/${lessonId}/complete`, { method: 'POST' });
            showMessage('Progress saved.', 'success');
            // navigate to next lesson if available
            const nextLesson = res.nextLesson || null;
            if (nextLesson && nextLesson.id && next && next.id === nextLesson.id) {
              // redirect to next lesson
              window.location.href = `./lesson.html?courseId=${encodeURIComponent(courseId)}&lessonId=${encodeURIComponent(nextLesson.id)}`;
            } else {
              // update UI progress
              completeBtn.textContent = 'Completed';
            }
          } catch (err) {
            console.error('Complete failed', err);
            showMessage(err.message || 'Failed to save progress', 'error');
            completeBtn.disabled = false; completeBtn.textContent = 'Mark as complete';
          }
        };
      }

    } catch (error) {
      console.error('Lesson load failed', error);
      showMessage(error.message || 'Failed to load lesson.', 'error');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
