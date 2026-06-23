import { Link, Navigate } from 'react-router-dom'
import Logo from '../components/Logo'
import BrandLink from '../components/BrandLink'
import { useAuth } from '../lib/AuthContext'

const TextLine = ({ w = 'w-full', highlighted = false }) => (
  <div className={`h-[7px] rounded-full ${w} ${highlighted ? 'bg-amber-200' : 'bg-ink/10'}`} />
)

const FEATURES = [
  {
    title: 'Highlight & note',
    body: 'Select any passage to mark it, attach a note, or bookmark the page for later — all saved per document.',
  },
  {
    title: 'Ask the sidebar',
    body: 'A reading-aware AI sidebar answers questions about exactly what you selected, or the page you\'re on.',
  },
  {
    title: 'Study tools',
    body: 'Turn a page — or the whole document — into a summary, a set of MCQs, or spaced-repetition flashcards.',
  },
]

const Landing = () => {
  const { user, loading } = useAuth()

  // Someone who's already signed in landing here — via the back button,
  // a stale bookmark, typing "/" directly — should see their library, not
  // a sign-up pitch. Wait for hydration to finish first so a refresh
  // doesn't flash the marketing page before the session check resolves.
  if (loading) return <div className="min-h-screen bg-paper" />
  if (user) return <Navigate to="/library" replace />

  return (
    <div className="min-h-screen bg-paper">
      <header className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <BrandLink size={26} />
        <div className="flex items-center gap-2">
          <Link to="/login" className="px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink transition-colors">Sign in</Link>
          <Link to="/signup" className="px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors">Get started</Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-5 pt-14 pb-20 grid md:grid-cols-2 gap-14 items-center">
        <div>
          <h1 className="font-serif text-[2.6rem] leading-[1.12] font-semibold text-ink tracking-tight">
            Read your PDFs<br />with a mind of their own.
          </h1>
          <p className="mt-5 text-[1.05rem] text-ink-soft leading-relaxed max-w-md">
            Upload any PDF, highlight what matters, and ask an AI sidebar to explain it, summarize it, or turn it into MCQs and flashcards — without leaving the page.
          </p>
          <div className="mt-7 flex items-center gap-3">
            <Link to="/signup" className="px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors shadow-soft">
              Start reading free
            </Link>
            <Link to="/login" className="px-5 py-3 text-sm font-medium text-ink-soft hover:text-ink transition-colors">
              Sign in →
            </Link>
          </div>
        </div>

        {/* Signature visual: a page with a highlighted line bridging into an AI reply */}
        <div className="relative">
          <div className="rounded-2xl bg-white border border-ink/[0.07] shadow-lift p-5 flex gap-4">
            <div className="flex-1 space-y-2.5 py-1">
              <TextLine w="w-11/12" />
              <TextLine w="w-full" />
              <TextLine w="w-4/5" highlighted />
              <TextLine w="w-full" />
              <TextLine w="w-3/4" />
              <TextLine w="w-full" />
              <TextLine w="w-10/12" />
            </div>
            <div className="w-px bg-ink/[0.07]" />
            <div className="w-[150px] space-y-2 py-1">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 text-[9px] text-amber-700 leading-snug">
                "...explain this part?"
              </div>
              <div className="bg-brand-50 rounded-lg px-2 py-1.5 space-y-1">
                <div className="h-[5px] w-full bg-brand-200 rounded-full" />
                <div className="h-[5px] w-4/5 bg-brand-200 rounded-full" />
                <div className="h-[5px] w-3/5 bg-brand-200 rounded-full" />
              </div>
            </div>
          </div>
          <div className="absolute -bottom-4 -left-4 bg-white border border-ink/[0.07] rounded-xl shadow-soft px-3.5 py-2 text-xs font-medium text-ink-soft hidden sm:block">
            📑 Reading progress saved automatically
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-2xl border border-ink/[0.06] p-6">
              <h3 className="font-serif text-lg font-semibold text-ink mb-2">{f.title}</h3>
              <p className="text-sm text-ink-soft leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-ink/[0.06] py-8">
        <div className="max-w-6xl mx-auto px-5 flex items-center justify-between text-xs text-ink-faint">
          <Logo size={18} textClassName="text-xs" />
          <span>Built for focused reading.</span>
        </div>
      </footer>
    </div>
  )
}

export default Landing
