import React, { useMemo, useState } from 'react';

const CATEGORIES = ['All resources', 'Computer science', 'Engineering', 'Mathematics', 'Business', 'Career prep'];
const RESOURCES = [
  { name: 'NPTEL', kind: 'University courses', category: 'Engineering', description: 'IIT- and IISc-led courses across engineering, science, management and humanities, with lectures and optional certification.', url: 'https://nptel.ac.in/', mark: 'N', color: 'resource-mark-nptel', tags: ['India', 'Video lectures', 'Courses'] },
  { name: 'SWAYAM', kind: 'Open courses', category: 'All disciplines', description: 'Government of India platform for online courses from school level through university and professional learning.', url: 'https://swayam.gov.in/', mark: 'S', color: 'resource-mark-swayam', tags: ['India', 'Courses', 'Certificates'] },
  { name: 'Khan Academy', kind: 'Practice & lessons', category: 'Mathematics', description: 'Free lessons and practice for mathematics, science, computing, economics and foundational subjects.', url: 'https://www.khanacademy.org/', mark: 'K', color: 'resource-mark-khan', tags: ['Free', 'Practice', 'Foundations'] },
  { name: 'MIT OpenCourseWare', kind: 'Lecture notes & courses', category: 'Engineering', description: 'Open course materials from MIT, including syllabi, lecture notes, assignments and selected video lectures.', url: 'https://ocw.mit.edu/', mark: 'M', color: 'resource-mark-mit', tags: ['Free', 'University level', 'Course material'] },
  { name: 'freeCodeCamp', kind: 'Hands-on coding', category: 'Computer science', description: 'Project-based programming lessons and certifications covering web development, data and software tools.', url: 'https://www.freecodecamp.org/learn/', mark: 'f', color: 'resource-mark-fcc', tags: ['Free', 'Projects', 'Coding'] },
  { name: 'MDN Web Docs', kind: 'Technical documentation', category: 'Computer science', description: 'A trusted reference for HTML, CSS, JavaScript and web platform APIs, with guides and examples.', url: 'https://developer.mozilla.org/', mark: 'M', color: 'resource-mark-mdn', tags: ['Free', 'Reference', 'Web development'] },
  { name: 'GeeksforGeeks', kind: 'Coding & interview prep', category: 'Computer science', description: 'Topic explanations, data structures and algorithms practice, computer science fundamentals and interview preparation.', url: 'https://www.geeksforgeeks.org/', mark: 'G', color: 'resource-mark-gfg', tags: ['Articles', 'DSA', 'Interview prep'] },
  { name: 'Microsoft Learn', kind: 'Guided learning paths', category: 'Computer science', description: 'Free, self-paced modules for cloud, data, AI, security and developer tools, with interactive practice.', url: 'https://learn.microsoft.com/training/', mark: '▦', color: 'resource-mark-ms', tags: ['Free', 'Cloud', 'Developer skills'] },
  { name: 'Google Career Certificates', kind: 'Career skills', category: 'Career prep', description: 'Career-focused certificate programs and learning resources for fields such as data analytics, UX and IT support.', url: 'https://grow.google/certificates/', mark: 'G', color: 'resource-mark-google', tags: ['Career', 'Professional skills', 'Certificates'] },
  { name: 'Coursera', kind: 'Courses & specializations', category: 'Business', description: 'University and industry courses across business, technology and other fields. Course access and pricing vary.', url: 'https://www.coursera.org/', mark: 'C', color: 'resource-mark-coursera', tags: ['University courses', 'Career', 'Varies by course'] },
  { name: 'Project Gutenberg', kind: 'Open learning library', category: 'All disciplines', description: 'A large collection of free ebooks, including public-domain classics useful for literature and independent study.', url: 'https://www.gutenberg.org/', mark: 'P', color: 'resource-mark-gutenberg', tags: ['Free', 'Books', 'Reading'] },
  { name: 'Desmos', kind: 'Interactive math tools', category: 'Mathematics', description: 'Free online graphing and geometry tools for exploring functions, equations and mathematical ideas visually.', url: 'https://www.desmos.com/', mark: 'D', color: 'resource-mark-desmos', tags: ['Free', 'Interactive', 'Visual learning'] },
];

export default function Resources() {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => RESOURCES.filter((resource) => {
    const matchesCategory = category === 'All resources' || resource.category === category || resource.category === 'All disciplines';
    const haystack = `${resource.name} ${resource.kind} ${resource.description} ${resource.category} ${resource.tags.join(' ')}`.toLowerCase();
    return matchesCategory && haystack.includes(query.trim().toLowerCase());
  }), [category, query]);

  return (
    <div className="page resources-page">
      <div className="resources-intro">
        <div>
          <span className="eyebrow">Your next step, made easier</span>
          <h1>Skills &amp; project resources</h1>
          <p className="sub">Explore trusted learning platforms, technical references and hands-on practice picked for university students and early-career job seekers.</p>
        </div>
        <div className="resource-note"><span aria-hidden="true">↗</span><span>These resources open on their own websites. Pricing, course access and certificates are set by each provider.</span></div>
      </div>

      <div className="resource-controls">
        <label className="resource-search">
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search skills, topics or platforms" aria-label="Search learning resources" />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search">×</button>}
        </label>
        <div className="resource-filters" role="group" aria-label="Filter resources by category">
          {CATEGORIES.map((item) => <button key={item} type="button" className={`resource-filter${category === item ? ' selected' : ''}`} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
      </div>

      <div className="resources-count">{filtered.length} curated resources <span>·</span> {category === 'All resources' ? 'Across subjects and career skills' : category}</div>
      {filtered.length ? (
        <div className="resource-grid">
          {filtered.map((resource) => (
            <article className="resource-card" key={resource.name}>
              <div className="resource-card-top">
                <span className={`resource-mark ${resource.color}`} aria-hidden="true">{resource.mark}</span>
                <span className="resource-kind">{resource.kind}</span>
              </div>
              <h2>{resource.name}</h2>
              <p>{resource.description}</p>
              <div className="resource-tags">{resource.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              <a className="resource-link" href={resource.url} target="_blank" rel="noreferrer">Explore resource <span aria-hidden="true">↗</span></a>
            </article>
          ))}
        </div>
      ) : (
        <div className="resource-empty"><span aria-hidden="true">⌕</span><h2>No resources found</h2><p>Try a different search term or choose another category.</p><button className="btn btn-outline btn-sm" onClick={() => { setQuery(''); setCategory('All resources'); }}>Clear filters</button></div>
      )}
      <p className="resource-disclaimer">ZERA is not affiliated with these providers. Check each platform’s current terms and verify course suitability before enrolling.</p>
    </div>
  );
}
