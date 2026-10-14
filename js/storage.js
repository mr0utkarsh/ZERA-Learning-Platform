/**
 * zeraStorage – thin localStorage wrapper.
 *
 * All mock / dummy user data has been removed.
 * The only thing this module does on DOMContentLoaded is initialize
 * application-level defaults (empty arrays / zero values) so that
 * code that reads storage does not crash on missing keys.
 *
 * User identity is managed exclusively by js/auth.js (JWT + real backend).
 */
(function () {
  const STORAGE_KEYS = {
    user: 'zera_user',
    token: 'zera_token',
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
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }

  function get(key, fallback) {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;
    return safeParse(value) ?? fallback;
  }

  function set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  /**
   * Initialize only non-user, non-auth defaults.
   * Streak, achievements, and preferences default to safe values.
   * Nothing here sets or fakes a logged-in user session.
   */
  function initDefaults() {
    if (!get(STORAGE_KEYS.activity, null)) {
      set(STORAGE_KEYS.activity, []);
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

  /** Clear all session data on logout – called by auth.js. */
  function clearSession() {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.user);
    localStorage.removeItem(STORAGE_KEYS.progress);
    localStorage.removeItem(STORAGE_KEYS.courses);
    localStorage.removeItem(STORAGE_KEYS.bookmarks);
    localStorage.removeItem(STORAGE_KEYS.notes);
    localStorage.removeItem(STORAGE_KEYS.personalNotes);
    localStorage.removeItem(STORAGE_KEYS.quizAttempts);
    localStorage.removeItem(STORAGE_KEYS.mockTests);
    localStorage.removeItem(STORAGE_KEYS.studyPlan);
    localStorage.removeItem(STORAGE_KEYS.notifications);
  }

  window.zeraStorage = { get, set, initDefaults, clearSession, keys: STORAGE_KEYS };

  document.addEventListener('DOMContentLoaded', initDefaults);
})();
