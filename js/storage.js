(function () {
  'use strict';

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

  /*
   * ---------------------------------------------------------
   * Safe JSON helpers
   * ---------------------------------------------------------
   */

  function safeParse(raw) {
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn('ZERA Storage: Invalid JSON found.', error);
      return null;
    }
  }

  function get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);

      if (raw === null) {
        return fallback;
      }

      const parsed = safeParse(raw);

      return parsed === null ? fallback : parsed;
    } catch (error) {
      console.warn('ZERA Storage: Unable to read key:', key, error);
      return fallback;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('ZERA Storage: Unable to save key:', key, error);
      return false;
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('ZERA Storage: Unable to remove key:', key, error);
      return false;
    }
  }

  function clearAll() {
    Object.values(STORAGE_KEYS).forEach(function (key) {
      remove(key);
    });
  }

  /*
   * ---------------------------------------------------------
   * Default user
   * ---------------------------------------------------------
   */

  const DEFAULT_USER = {
    name: 'Aarav Sharma',
    email: 'aarav@example.com',
    role: 'student',
    isLoggedIn: true
  };

  /*
   * ---------------------------------------------------------
   * Default progress
   * ---------------------------------------------------------
   */

  const DEFAULT_PROGRESS = {
    overall: 0,

    courses: {
      'ZERA Foundations': {
        progress: 0,

        subjects: {
          'Core Concepts': {
            progress: 0,

            topics: [
              {
                title: 'Introduction to Learning Systems',
                complete: false
              },
              {
                title: 'Study Methods and Habit Design',
                complete: false
              },
              {
                title: 'Course Planning Basics',
                complete: false
              },
              {
                title: 'Revision Techniques',
                complete: false
              }
            ]
          }
        }
      }
    }
  };

  /*
   * ---------------------------------------------------------
   * Default courses
   * ---------------------------------------------------------
   */

  const DEFAULT_COURSES = [
    {
      id: 'course-foundations',
      name: 'ZERA Foundations',
      level: 'Beginner',
      progress: 0,
      status: 'Not Started'
    },

    {
      id: 'course-web',
      name: 'Web Development Fundamentals',
      level: 'Beginner',
      progress: 0,
      status: 'Not Started'
    },

    {
      id: 'course-data',
      name: 'Data Structures and Algorithms',
      level: 'Intermediate',
      progress: 0,
      status: 'Not Started'
    }
  ];

  /*
   * ---------------------------------------------------------
   * Default notes
   * ---------------------------------------------------------
   */

  const DEFAULT_NOTES = [
    {
      id: 'n1',
      title: 'AI Revision Note',
      category: 'AI-generated',
      content: 'Focus on active recall and spaced repetition.',
      createdAt: new Date().toISOString()
    }
  ];

  /*
   * ---------------------------------------------------------
   * Default notifications
   * ---------------------------------------------------------
   */

  const DEFAULT_NOTIFICATIONS = [
    {
      id: 'notification-1',
      title: 'Study plan reminder',
      text: 'Your revision block starts in 30 minutes.',
      time: 'Today',
      read: false
    }
  ];

  /*
   * ---------------------------------------------------------
   * Default streak
   * ---------------------------------------------------------
   */

  const DEFAULT_STREAK = {
    days: 0,
    lastActiveDate: null
  };

  /*
   * ---------------------------------------------------------
   * Default preferences
   * ---------------------------------------------------------
   */

  const DEFAULT_PREFERENCES = {
    theme: 'light',
    reducedMotion: false
  };

  /*
   * ---------------------------------------------------------
   * Initialize one storage item
   * ---------------------------------------------------------
   */

  function initializeKey(key, defaultValue) {
    const existing = get(key, null);

    if (existing === null) {
      set(key, defaultValue);
      return defaultValue;
    }

    return existing;
  }

  /*
   * ---------------------------------------------------------
   * Initialize all ZERA data
   * ---------------------------------------------------------
   */

  function initDefaults() {
    initializeKey(
      STORAGE_KEYS.user,
      DEFAULT_USER
    );

    initializeKey(
      STORAGE_KEYS.progress,
      DEFAULT_PROGRESS
    );

    initializeKey(
      STORAGE_KEYS.courses,
      DEFAULT_COURSES
    );

    initializeKey(
      STORAGE_KEYS.activity,
      []
    );

    initializeKey(
      STORAGE_KEYS.bookmarks,
      []
    );

    initializeKey(
      STORAGE_KEYS.notes,
      DEFAULT_NOTES
    );

    initializeKey(
      STORAGE_KEYS.personalNotes,
      []
    );

    initializeKey(
      STORAGE_KEYS.quizAttempts,
      []
    );

    initializeKey(
      STORAGE_KEYS.mockTests,
      []
    );

    initializeKey(
      STORAGE_KEYS.studyPlan,
      []
    );

    initializeKey(
      STORAGE_KEYS.notifications,
      DEFAULT_NOTIFICATIONS
    );

    initializeKey(
      STORAGE_KEYS.streak,
      DEFAULT_STREAK
    );

    initializeKey(
      STORAGE_KEYS.achievements,
      []
    );

    initializeKey(
      STORAGE_KEYS.preferences,
      DEFAULT_PREFERENCES
    );
  }

  /*
   * ---------------------------------------------------------
   * Update helpers
   * ---------------------------------------------------------
   */

  function update(key, updater, fallback) {
    const currentValue = get(key, fallback);

    if (typeof updater !== 'function') {
      return currentValue;
    }

    const updatedValue = updater(currentValue);

    set(key, updatedValue);

    return updatedValue;
  }

  /*
   * ---------------------------------------------------------
   * Activity helper
   * ---------------------------------------------------------
   */

  function addActivity(activity) {
    const activities = get(
      STORAGE_KEYS.activity,
      []
    );

    const newActivity = {
      id: 'activity-' + Date.now(),
      createdAt: new Date().toISOString(),
      ...activity
    };

    activities.unshift(newActivity);

    set(
      STORAGE_KEYS.activity,
      activities
    );

    return newActivity;
  }

  /*
   * ---------------------------------------------------------
   * Bookmark helper
   * ---------------------------------------------------------
   */

  function addBookmark(bookmark) {
    const bookmarks = get(
      STORAGE_KEYS.bookmarks,
      []
    );

    const exists = bookmarks.some(function (item) {
      return item.id === bookmark.id;
    });

    if (exists) {
      return false;
    }

    const newBookmark = {
      id: bookmark.id || 'bookmark-' + Date.now(),
      title: bookmark.title || 'Untitled',
      url: bookmark.url || '',
      category: bookmark.category || 'General',
      createdAt: new Date().toISOString()
    };

    bookmarks.push(newBookmark);

    set(
      STORAGE_KEYS.bookmarks,
      bookmarks
    );

    return newBookmark;
  }

  function removeBookmark(id) {
    const bookmarks = get(
      STORAGE_KEYS.bookmarks,
      []
    );

    const filtered = bookmarks.filter(function (item) {
      return item.id !== id;
    });

    set(
      STORAGE_KEYS.bookmarks,
      filtered
    );

    return true;
  }

  /*
   * ---------------------------------------------------------
   * Notes helper
   * ---------------------------------------------------------
   */

  function addNote(note) {
    const notes = get(
      STORAGE_KEYS.personalNotes,
      []
    );

    const newNote = {
      id: note.id || 'note-' + Date.now(),
      title: note.title || 'Untitled Note',
      content: note.content || '',
      category: note.category || 'Personal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    notes.unshift(newNote);

    set(
      STORAGE_KEYS.personalNotes,
      notes
    );

    return newNote;
  }

  /*
   * ---------------------------------------------------------
   * Notification helper
   * ---------------------------------------------------------
   */

  function markNotificationRead(id) {
    const notifications = get(
      STORAGE_KEYS.notifications,
      []
    );

    const updated = notifications.map(function (notification) {
      if (notification.id === id) {
        return {
          ...notification,
          read: true
        };
      }

      return notification;
    });

    set(
      STORAGE_KEYS.notifications,
      updated
    );

    return updated;
  }

  /*
   * ---------------------------------------------------------
   * Streak helper
   * ---------------------------------------------------------
   */

  function updateStreak() {
    const streak = get(
      STORAGE_KEYS.streak,
      DEFAULT_STREAK
    );

    const today = new Date()
      .toISOString()
      .split('T')[0];

    if (streak.lastActiveDate === today) {
      return streak;
    }

    let days = Number(streak.days) || 0;

    if (streak.lastActiveDate) {
      const previous = new Date(
        streak.lastActiveDate + 'T00:00:00'
      );

      const current = new Date(
        today + 'T00:00:00'
      );

      const difference =
        Math.round(
          (current - previous) /
          (1000 * 60 * 60 * 24)
        );

      if (difference === 1) {
        days += 1;
      } else if (difference > 1) {
        days = 1;
      }
    } else {
      days = 1;
    }

    const updatedStreak = {
      days: days,
      lastActiveDate: today
    };

    set(
      STORAGE_KEYS.streak,
      updatedStreak
    );

    return updatedStreak;
  }

  /*
   * ---------------------------------------------------------
   * Public ZERA Storage API
   * ---------------------------------------------------------
   */

  const zeraStorage = {
    get: get,
    set: set,
    remove: remove,
    clearAll: clearAll,

    update: update,

    initDefaults: initDefaults,

    addActivity: addActivity,

    addBookmark: addBookmark,
    removeBookmark: removeBookmark,

    addNote: addNote,

    markNotificationRead: markNotificationRead,

    updateStreak: updateStreak,

    keys: STORAGE_KEYS
  };

  /*
   * ---------------------------------------------------------
   * Expose globally
   * ---------------------------------------------------------
   */

  window.zeraStorage = zeraStorage;

  /*
   * ---------------------------------------------------------
   * Initialize after DOM is ready
   * ---------------------------------------------------------
   */

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      initDefaults,
      { once: true }
    );
  } else {
    initDefaults();
  }

})();