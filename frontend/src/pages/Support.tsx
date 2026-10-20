import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { HelpCircle, Mail, MessageSquare, FileText } from 'lucide-react';

const FAQS = [
  {
    q: 'How do I reset my password?',
    a: 'Go to /forgot-password and enter your email. You will receive a reset link. Check your spam folder if it does not arrive within a few minutes.',
  },
  {
    q: 'Can I use ZERA without creating an account?',
    a: 'The landing page and public resources are open to everyone. To save progress, use the dashboard, syllabus workspace or AI tools, you need a free account.',
  },
  {
    q: 'What subjects does ZERA support?',
    a: 'ZERA is subject-agnostic. Upload any syllabus (PDF, DOCX, TXT, MD, CSV or JSON) and ZERA will extract subjects, units and topics for you to track.',
  },
  {
    q: 'Is the AI study assistant real?',
    a: 'The AI Study Support interface is ready. If no AI provider is configured, you will see an honest configuration message rather than a fake response.',
  },
  {
    q: 'How do I track my progress?',
    a: 'In the Syllabus workspace, mark topics as Not started, In progress, Completed or Needs revision. Your dashboard shows overall progress and weekly consistency.',
  },
];

const SUPPORT_CATEGORIES = [
  { label: 'Account & billing', icon: Mail, count: 4 },
  { label: 'Syllabus & uploads', icon: FileText, count: 6 },
  { label: 'Quizzes & practice', icon: MessageSquare, count: 5 },
  { label: 'AI study support', icon: HelpCircle, count: 3 },
];

export default function Support() {
  return (
    <div className="min-h-screen bg-void text-fg">
      <div className="container max-w-4xl mx-auto px-6 py-12 md:py-20">
        <nav className="mb-12">
          <Link to="/" className="btn-ghost mb-2 inline-flex items-center gap-2 text-sm">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/><path d="M19 12H5"/></svg>
            Back to home
          </Link>
        </nav>

        <div className="flex items-center gap-4 mb-12">
          <Logo variant="primary" className="h-10" showWordmark />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-fg">
            Support
          </h1>
        </div>

        <p className="text-lg text-muted mb-12 leading-relaxed">
          Stuck? Here you will find answers to common questions, help categories and a
          way to reach us.
        </p>

        <div className="grid gap-8 md:grid-cols-12 mb-16">
          <div className="md:col-span-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-6">Frequently asked questions</h3>
            <div className="space-y-4">
              {FAQS.map((faq, i) => (
                <div key={i} className="card-lift zera-card p-5">
                  <h4 className="text-sm font-semibold text-fg mb-2">{faq.q}</h4>
                  <p className="text-sm text-muted leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-6">Help categories</h3>
            <div className="space-y-3">
              {SUPPORT_CATEGORIES.map((cat, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl p-3 bg-surface-2 border border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
                  <cat.icon className="h-5 w-5 text-muted shrink-0" />
                  <span className="text-sm text-fg">{cat.label}</span>
                  <span className="ml-auto text-xs text-muted">{cat.count} articles</span>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-4">
            <div className="card-lift zera-card p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-6">Contact us</h3>
              <p className="text-sm text-muted mb-6">Send us a message and we will respond as soon as possible.</p>
              <form className="space-y-3">
                <div>
                  <label className="field-label">Your email</label>
                  <input className="field-input" type="email" placeholder="you@example.com" />
                </div>
                <div>
                  <label className="field-label">Subject</label>
                  <input className="field-input" placeholder="What do you need help with?" />
                </div>
                <div>
                  <label className="field-label">Message</label>
                  <textarea className="field-textarea" placeholder="Describe your issue…" rows={4} />
                </div>
                <button className="btn-primary w-full py-3">Send message</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}