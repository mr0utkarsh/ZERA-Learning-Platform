(function () {
  const STORAGE_KEYS = {
    user: 'zera_user',
    progress: 'zera_progress',
    courses: 'zera_courses',
    activity: 'zera_activity',
    bookmarks: 'zera_bookmarks',
    notes: 'zera_notes',
    personalNotes: 'zera_personal_notes',
    quizAttempts: 'zera_quiz_attempts',
    mockTests: 'zera_mock_tests',
    studyPlan: 'zera_study_plan',
    notifications: 'zera_notifications',
    streak: 'zera_streak',
    achievements: 'zera_achievements',
    preferences: 'zera_preferences'
  };

  function safeParse(raw) {
    try { return raw ? JSON.parse(raw) : null; } catch (error) { return null; }
  }

  function get(key, fallback) {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;
    return safeParse(value) ?? fallback;
  }

  function set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function initDefaults() {
    if (!get(STORAGE_KEYS.user, null)) {
      set(STORAGE_KEYS.user, {
        name: 'Aarav Sharma',
        email: 'aarav@example.com',
        role: 'student',
        isLoggedIn: true
      });
    }

    if (!get(STORAGE_KEYS.progress, null)) {
      set(STORAGE_KEYS.progress, {
        overall: 0,
        courses: {
          'ZERA Foundations': {
            progress: 0,
            subjects: {
              'Core Concepts': { progress: 0, topics: [
                { title: 'Introduction to Learning Systems', complete: false },
                { title: 'Study Methods and Habit Design', complete: false },
                { title: 'Course Planning Basics', complete: false },
                { title: 'Revision Techniques', complete: false }
              ] }
            }
          }
        }
      });
    }

    if (!get(STORAGE_KEYS.courses, null)) {
      set(STORAGE_KEYS.courses, [
        { id: 'course-foundations', name: 'ZERA Foundations', level: 'Beginner', progress: 0, status: 'Not Started' },
        { id: 'course-web', name: 'Web Development Fundamentals', level: 'Beginner', progress: 0, status: 'Not Started' },
        { id: 'course-data', name: 'Data Structures and Algorithms', level: 'Intermediate', progress: 0, status: 'Not Started' }
      ]);
    }

    if (!get(STORAGE_KEYS.activity, null)) {
      set(STORAGE_KEYS.activity, []);
    }

    if (!get(STORAGE_KEYS.bookmarks, null)) {
      set(STORAGE_KEYS.bookmarks, []);
    }

    if (!get(STORAGE_KEYS.notes, null)) {
      set(STORAGE_KEYS.notes, [
        { id: 'n1', title: 'AI revision note', category: 'AI-generated', content: 'Focus on active recall and spaced repetition.' }
      ]);
    }

    if (!get(STORAGE_KEYS.personalNotes, null)) {
      set(STORAGE_KEYS.personalNotes, []);
    }

    if (!get(STORAGE_KEYS.quizAttempts, null)) {
      set(STORAGE_KEYS.quizAttempts, []);
    }

    if (!get(STORAGE_KEYS.mockTests, null)) {
      set(STORAGE_KEYS.mockTests, []);
    }

    if (!get(STORAGE_KEYS.studyPlan, null)) {
      set(STORAGE_KEYS.studyPlan, []);
    }

    if (!get(STORAGE_KEYS.notifications, null)) {
      set(STORAGE_KEYS.notifications, [
        { id: 'n-1', title: 'Study plan reminder', text: 'Your revision block starts in 30 minutes.', time: 'Today' }
      ]);
    }

    if (!get(STORAGE_KEYS.streak, null)) {
      set(STORAGE_KEYS.streak, { days: 0, lastActiveDate: null });
    }

    if (!get(STORAGE_KEYS.achievements, null)) {
      set(STORAGE_KEYS.achievements, []);
    }

    if (!get(STORAGE_KEYS.preferences, null)) {
      set(STORAGE_KEYS.preferences, { theme: 'light', reducedMotion: false });
    }
  }

  const zeraStorage = { get, set, initDefaults, keys: STORAGE_KEYS };
  window.zeraStorage = zeraStorage;

  document.addEventListener('DOMContentLoaded', initDefaults);
})();
