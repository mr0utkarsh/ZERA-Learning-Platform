(function () {
  const API_BASE_URL = 'http://localhost:5000/api';

  const fallbackUser = { name: 'Student' };

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

  function renderDashboardData(snapshot, onboarding) {
    const userData = snapshot?.user || fallbackUser;
    const userName = document.getElementById('userName');
    const overallValue = document.getElementById('overallProgressValue');
    const courseValue = document.getElementById('courseProgressValue');
    const streakValue = document.getElementById('streakValue');
    const achievementsValue = document.getElementById('achievementValue');
    const continueTitle = document.getElementById('continueTitle');
    const continueTopic = document.getElementById('continueTopic');
    const progressBar = document.getElementById('mainProgressBar');

    if (userName) userName.textContent = userData?.name || 'Student';

    const overallProgress = Number(snapshot?.overallProgress ?? 0);
    const continueLearning = snapshot?.continueLearning || null;
    const nextLesson = continueLearning?.nextLesson || null;
    const courseLabel = continueLearning?.title || 'Continue learning';

    if (overallValue) overallValue.textContent = `${overallProgress}%`;
    if (courseValue) courseValue.textContent = `${overallProgress}%`;
    if (streakValue) streakValue.textContent = '0 days';
    if (achievementsValue) achievementsValue.textContent = '0';

    if (continueTitle) continueTitle.textContent = courseLabel;
    if (continueTopic) {
      if (nextLesson && nextLesson.title) {
        continueTopic.textContent = nextLesson.title;
        continueTopic.style.cursor = 'pointer';
        continueTopic.onclick = function () {
          const courseId = continueLearning?.courseId || continueLearning?.id;
          const lessonId = nextLesson.id;
          if (courseId && lessonId) {
            window.location.href = `./lesson.html?courseId=${encodeURIComponent(courseId)}&lessonId=${encodeURIComponent(lessonId)}`;
          }
        };
      } else {
        continueTopic.textContent = snapshot?.totalCourses
          ? 'All enrolled lessons are complete.'
          : onboarding?.latestSyllabus
            ? 'Your syllabus is saved. Start a course to begin.'
            : 'Complete your learning setup to begin.';
        continueTopic.style.cursor = 'default';
        continueTopic.onclick = null;
      }
    }

    if (progressBar) progressBar.style.width = `${overallProgress}%`;

    const recentBatch = document.querySelector('.task-list');
    if (recentBatch) {
      const taskItems = [];

      if (continueLearning?.title) {
        taskItems.push({ title: 'In progress', detail: continueLearning.title });
      }

      if (snapshot?.enrolledCourses?.length) {
        taskItems.push({ title: 'Courses enrolled', detail: `${snapshot.enrolledCourses.length} active course(s)` });
      }

      if (taskItems.length === 0) {
        taskItems.push({ title: 'Learning setup', detail: 'Start with your onboarding and first course' });
      }

      recentBatch.innerHTML = taskItems.map((item) => `
        <div class="task-item"><strong>${item.title}</strong><span>${item.detail}</span></div>
      `).join('');
    }
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

      const profile = await apiRequest('/student/profile');
      const dashboard = await apiRequest('/dashboard');
      dashboard.user = { ...dashboard.user, ...profile.user };
      renderDashboardData(dashboard, onboarding);
    } catch (error) {
      console.error('Dashboard API fetch failed:', error);
      const continueTopic = document.getElementById('continueTopic');
      if (continueTopic) continueTopic.textContent = error.message || 'Unable to load learning data.';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadDashboardData();

    const restartBtn = document.getElementById('restartCourseBtn');
    if (restartBtn) {
      restartBtn.addEventListener('click', function () {
        const confirmed = window.confirm('Restart Course will reset all progress for this course. Continue?');
        if (!confirmed) return;
        window.location.reload();
      });
    }
  });
})();
