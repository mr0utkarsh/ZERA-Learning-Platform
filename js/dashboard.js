(function () {
  const API_BASE_URL = 'http://localhost:5000/api';

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function getToken() {
    return localStorage.getItem('zera_token');
  }

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

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Request failed.');
    }

    return data.data;
  }

  function getCoreStats() {
    const progress = read('zera_progress', { overall: 0, courses: {} });
    const user = read('zera_user', { name: 'Student' });
    const streak = read('zera_streak', { days: 0 });
    const achievements = read('zera_achievements', []);
    const notes = read('zera_notes', []);
    const quizAttempts = read('zera_quiz_attempts', []);
    const mockTests = read('zera_mock_tests', []);

    return {
      progress,
      user,
      streak,
      achievements,
      notes,
      quizAttempts,
      mockTests
    };
  }

  function renderFallbackDashboard() {
    const stats = getCoreStats();
    const courseProgress = stats.progress.overall || 0;

    const overallValue = document.getElementById('overallProgressValue');
    const courseValue = document.getElementById('courseProgressValue');
    const streakValue = document.getElementById('streakValue');
    const achievementsValue = document.getElementById('achievementValue');
    const continueTitle = document.getElementById('continueTitle');
    const continueTopic = document.getElementById('continueTopic');
    const userName = document.getElementById('userName');

    if (userName) userName.textContent = stats.user.name || 'Student';
    if (overallValue) overallValue.textContent = `${courseProgress}%`;
    if (courseValue) courseValue.textContent = `${courseProgress}%`;
    if (streakValue) streakValue.textContent = `${stats.streak.days || 0} days`;
    if (achievementsValue) achievementsValue.textContent = `${(stats.achievements || []).length}`;

    if (continueTitle) continueTitle.textContent = 'Continue learning';
    if (continueTopic) continueTopic.textContent = 'Learning data is unavailable.';

    const progressBar = document.getElementById('mainProgressBar');
    if (progressBar) progressBar.style.width = `${courseProgress}%`;

    const placeholder = document.getElementById('emptyStatePlaceholder');
    if (placeholder && stats.quizAttempts.length === 0) {
      placeholder.classList.remove('hidden');
    }
  }

  function renderDashboardData(snapshot, onboarding) {
    const userData = read('zera_user', { name: 'Student' });
    const userName = document.getElementById('userName');
    const overallValue = document.getElementById('overallProgressValue');
    const courseValue = document.getElementById('courseProgressValue');
    const streakValue = document.getElementById('streakValue');
    const achievementsValue = document.getElementById('achievementValue');
    const continueTitle = document.getElementById('continueTitle');
    const continueTopic = document.getElementById('continueTopic');
    const progressBar = document.getElementById('mainProgressBar');

    if (userName) userName.textContent = userData.name || 'Student';

    const overallProgress = snapshot?.overallProgress ?? 0;
    if (overallValue) overallValue.textContent = `${overallProgress}%`;
    if (courseValue) courseValue.textContent = `${overallProgress}%`;
    if (streakValue) streakValue.textContent = `${read('zera_streak', { days: 0 }).days || 0} days`;
    if (achievementsValue) achievementsValue.textContent = `${(read('zera_achievements', []) || []).length}`;

    if (continueTitle) continueTitle.textContent = 'Continue learning';
    if (continueTopic) {
      const nextLesson = snapshot?.continueLearning?.nextLesson;
      if (nextLesson && nextLesson.title) {
        continueTopic.textContent = nextLesson.title;
        continueTopic.style.cursor = 'pointer';
        continueTopic.onclick = function () {
          const courseId = snapshot?.continueLearning?.courseId;
          const lessonId = nextLesson.id;
          if (courseId && lessonId) {
            window.location.href = `./lesson.html?courseId=${encodeURIComponent(courseId)}&lessonId=${encodeURIComponent(lessonId)}`;
          }
        };
      } else {
        continueTopic.textContent = snapshot?.totalCourses
          ? 'All enrolled lessons are complete.'
          : onboarding?.latestSyllabus
            ? 'Your syllabus is saved. Course creation is not configured yet.'
            : 'Complete your learning setup to begin.';
        continueTopic.style.cursor = 'default';
        continueTopic.onclick = null;
      }
    }

    if (progressBar) progressBar.style.width = `${overallProgress}%`;
  }

  async function loadDashboardData() {
    if (!getToken()) {
      window.location.href = './login.html';
      return;
    }

    try {
      const onboarding = await apiRequest('/onboarding');
      if (!onboarding.isComplete) {
        window.location.replace('./onboarding.html');
        return;
      }
      await apiRequest('/initialize-catalog', { method: 'POST' }).catch(() => null);

      const dashboard = await apiRequest('/dashboard');
      renderDashboardData(dashboard, onboarding);
    } catch (error) {
      console.error('Dashboard API fetch failed:', error);
      renderFallbackDashboard();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadDashboardData();

    const restartBtn = document.getElementById('restartCourseBtn');
    if (restartBtn) {
      restartBtn.addEventListener('click', function () {
        const confirmed = window.confirm('Restart Course will reset all progress for this course. Continue?');
        if (!confirmed) return;
        if (window.zeraProgress && typeof window.zeraProgress.restartCourse === 'function') {
          window.zeraProgress.restartCourse('ZERA Foundations');
        }
        renderFallbackDashboard();
      });
    }
  });
})();
