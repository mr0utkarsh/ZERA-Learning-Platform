(function () {
  const API_BASE_URL = 'http://localhost:5000/api';

  async function request(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('zera_token')}`
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.message || 'Request failed.');
    return data.data;
  }

  function renderCourse(course) {
    const title = document.getElementById('syllabusCourseTitle');
    const status = document.getElementById('syllabusCourseStatus');
    const bar = document.getElementById('syllabusProgressBar');
    const summary = document.getElementById('syllabusProgressSummary');
    const link = document.getElementById('syllabusCourseLink');

    if (title) title.textContent = course.title;
    if (status) status.textContent = `${course.completionPercentage}% complete`;
    if (bar) bar.style.width = `${course.completionPercentage}%`;
    if (summary) summary.textContent = `${course.completedLessons} of ${course.totalLessons} lessons completed`;
    if (link) link.href = `./course.html?courseId=${encodeURIComponent(course.courseId)}`;
  }

  async function init() {
    if (!localStorage.getItem('zera_token')) {
      window.location.replace('./login.html');
      return;
    }

    const courseList = document.getElementById('syllabusCourseList');
    try {
      await request('/initialize-catalog', { method: 'POST' });
      const dashboard = await request('/dashboard');
      const courses = dashboard.enrolledCourses?.length ? dashboard.enrolledCourses : await request('/catalog');

      if (!courses.length) {
        courseList.innerHTML = '<div class="empty-state"><strong>No courses available</strong><span>The course catalog is empty.</span></div>';
        return;
      }

      courseList.innerHTML = courses.map((course) => {
        const progress = course.completionPercentage ?? 0;
        const courseId = course.courseId || course.id;
        return `<div class="topic-item"><a href="./course.html?courseId=${encodeURIComponent(courseId)}">${course.title}</a><span class="badge neutral">${progress}%</span></div>`;
      }).join('');

      renderCourse(dashboard.enrolledCourses?.[0] || {
        ...courses[0],
        courseId: courses[0].courseId || courses[0].id,
        completionPercentage: 0,
        completedLessons: 0,
        totalLessons: 0
      });
    } catch (error) {
      courseList.innerHTML = `<div class="empty-state"><strong>Unable to load syllabus</strong><span>${error.message}</span></div>`;
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
