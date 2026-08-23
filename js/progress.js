(function () {
  function getProgressState() {
    return JSON.parse(localStorage.getItem('zera_progress') || JSON.stringify({
      overall: 0,
      courses: {
        'ZERA Foundations': {
          progress: 0,
          subjects: {
            'Core Concepts': {
              progress: 0,
              topics: [
                { title: 'Introduction to Learning Systems', complete: false },
                { title: 'Study Methods and Habit Design', complete: false },
                { title: 'Course Planning Basics', complete: false },
                { title: 'Revision Techniques', complete: false }
              ]
            }
          }
        }
      }
    }));
  }

  function saveProgressState(data) {
    localStorage.setItem('zera_progress', JSON.stringify(data));
  }

  function getNextIncompleteTopic() {
    const state = getProgressState();
    const courseName = Object.keys(state.courses || {})[0] || 'ZERA Foundations';
    const subjectMap = state.courses[courseName]?.subjects || {};
    for (const subjectName of Object.keys(subjectMap)) {
      const topics = subjectMap[subjectName].topics || [];
      const nextTopic = topics.find((topic) => !topic.complete);
      if (nextTopic) {
        return { courseName, subjectName, topic: nextTopic.title };
      }
    }
    return { courseName, subjectName: 'Core Concepts', topic: 'No incomplete topic' };
  }

  function updateProgressFromTopics() {
    const state = getProgressState();
    for (const courseName of Object.keys(state.courses || {})) {
      const course = state.courses[courseName];
      let totalTopics = 0;
      let completedTopics = 0;

      for (const subjectName of Object.keys(course.subjects || {})) {
        const subject = course.subjects[subjectName];
        const topics = subject.topics || [];
        totalTopics += topics.length;
        completedTopics += topics.filter((t) => t.complete).length;
      }

      course.progress = totalTopics ? Math.round((completedTopics / totalTopics) * 100) : 0;
      state.overall = course.progress;
    }

    saveProgressState(state);
    return state;
  }

  function restartCourse(courseName = 'ZERA Foundations') {
    const state = getProgressState();
    if (!state.courses[courseName]) return false;

    for (const subjectName of Object.keys(state.courses[courseName].subjects)) {
      const subject = state.courses[courseName].subjects[subjectName];
      if (Array.isArray(subject.topics)) {
        subject.topics = subject.topics.map((topic) => ({ ...topic, complete: false }));
        subject.progress = 0;
      }
    }
    state.courses[courseName].progress = 0;
    state.overall = 0;
    saveProgressState(state);
    return true;
  }

  window.zeraProgress = { getProgressState, saveProgressState, getNextIncompleteTopic, updateProgressFromTopics, restartCourse };
})();
