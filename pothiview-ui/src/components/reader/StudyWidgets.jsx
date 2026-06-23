import { useState } from 'react'

export const TypingDots = () => (
  <div className="flex items-center gap-1.5 px-4 py-3">
    {[0, 1, 2].map((i) => (
      <span key={i} className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
    ))}
  </div>
)

export const MCQView = ({ data }) => {
  const [answers, setAnswers] = useState({})
  const [revealed, setRevealed] = useState({})
  const questions = data?.questions || []

  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <div key={i} className="bg-paper-dim rounded-xl p-3 border border-ink/[0.06]">
          <p className="text-sm font-medium text-ink mb-2.5">{i + 1}. {q.question}</p>
          <div className="space-y-1.5">
            {(q.options || []).map((opt, j) => {
              const letter = String.fromCharCode(65 + j)
              const chosen = answers[i] === letter
              const correct = q.correct === letter
              const show = revealed[i]
              return (
                <button
                  key={j}
                  onClick={() => setAnswers((p) => ({ ...p, [i]: letter }))}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all border
                    ${show && correct ? 'bg-green-100 border-green-400 text-green-800 font-medium'
                      : show && chosen && !correct ? 'bg-rose-100 border-rose-300 text-rose-700'
                      : chosen ? 'border-brand-400 bg-brand-50 text-brand-700'
                      : 'bg-white border-ink/[0.08] text-ink-soft hover:border-ink/20'}`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
          {answers[i] && !revealed[i] && (
            <button onClick={() => setRevealed((p) => ({ ...p, [i]: true }))} className="mt-2 text-xs text-brand-700 font-medium hover:underline">
              Check answer
            </button>
          )}
          {revealed[i] && q.explanation && (
            <p className="mt-2 text-xs text-ink-soft bg-white rounded-lg px-2.5 py-1.5 border border-ink/[0.06]">{q.explanation}</p>
          )}
        </div>
      ))}
    </div>
  )
}

export const FlashcardView = ({ data }) => {
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const cards = data?.flashcards || []
  if (cards.length === 0) return null

  return (
    <div className="space-y-2.5">
      <div
        onClick={() => setFlipped((f) => !f)}
        className="cursor-pointer min-h-[120px] rounded-xl border-2 border-dashed border-brand-200 bg-brand-50 flex flex-col items-center justify-center p-4 text-center hover:border-brand-400 transition-colors"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-600 mb-2">
          {flipped ? 'Answer' : 'Question'} · {idx + 1}/{cards.length}
        </span>
        <p className="text-sm font-medium text-ink leading-snug">{flipped ? cards[idx].back : cards[idx].front}</p>
        <span className="mt-3 text-[10px] text-ink-faint">tap to flip</span>
      </div>
      <div className="flex gap-2 justify-center items-center">
        <button
          onClick={() => { setIdx((i) => Math.max(0, i - 1)); setFlipped(false) }}
          disabled={idx === 0}
          className="px-3 py-1 rounded-lg text-xs font-medium bg-paper-dim text-ink-soft disabled:opacity-40 hover:bg-ink/10 transition"
        >← Prev</button>
        <button
          onClick={() => { setIdx((i) => Math.min(cards.length - 1, i + 1)); setFlipped(false) }}
          disabled={idx === cards.length - 1}
          className="px-3 py-1 rounded-lg text-xs font-medium bg-paper-dim text-ink-soft disabled:opacity-40 hover:bg-ink/10 transition"
        >Next →</button>
      </div>
    </div>
  )
}
