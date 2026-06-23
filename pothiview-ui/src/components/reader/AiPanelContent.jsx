import ReactMarkdown from 'react-markdown'
import PlanBadge from '../PlanBadge'
import { TypingDots, MCQView, FlashcardView } from './StudyWidgets'

/**
 * AiPanelContent — the full PothiAI tab: goal mini-panel, study-tool
 * shortcuts, message thread, and composer. Shared by the mobile slide-up
 * AI panel and the tablet/desktop inline sidebar so the chat logic lives
 * in exactly one place.
 */
const AiPanelContent = ({
  pdf, darkMode, aiScope, setAiScope, runSummary, runMcq, runFlashcards,
  aiLoading, aiMessages, aiBottomRef, aiInput, setAiInput, sendChatMessage,
  setPlanModalOpen,
}) => (
  <div className="flex flex-col flex-1 min-h-0">
    <div className={`p-3 border-b shrink-0 ${darkMode ? 'border-white/10' : 'border-ink/[0.06]'}`}>
      {pdf?.planStatus ? (
        <div className={`rounded-xl px-3 py-2.5 mb-3 border ${
          pdf.planStatus.status === 'behind'
            ? 'bg-amber-50 border-amber-200'
            : pdf.planStatus.status === 'completed'
            ? 'bg-sky-50 border-sky-200'
            : 'bg-brand-50 border-brand-100'
        }`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Today's Goal</span>
              <PlanBadge planStatus={pdf.planStatus} size="sm" />
            </div>
            <button onClick={() => setPlanModalOpen(true)} className="text-[10px] text-ink-faint hover:text-ink-soft transition shrink-0">Edit</button>
          </div>
          {pdf.planStatus.status !== 'completed' && (
            <p className="text-[11px] text-ink-soft mt-1 leading-snug">
              <span className="font-semibold text-ink">{pdf.planStatus.pagesPerDay}</span> pg/day ·{' '}
              {pdf.planStatus.daysRemaining}d left
              {pdf.planStatus.status === 'behind' && (
                <span className="text-amber-700"> · Aim for p.{pdf.planStatus.expectedPage}</span>
              )}
            </p>
          )}
        </div>
      ) : (
        <button
          onClick={() => setPlanModalOpen(true)}
          className={`w-full text-left px-3 py-2 rounded-xl border border-dashed mb-3 text-xs transition ${darkMode ? 'border-white/15 text-white/40 hover:border-brand-500 hover:text-white/60' : 'border-ink/10 text-ink-faint hover:border-brand-400 hover:text-ink-soft'}`}
        >
          ◎ Set a reading goal for this PDF
        </button>
      )}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider opacity-50">Study tools</p>
        <div className={`flex rounded-lg overflow-hidden border text-[10px] font-medium ${darkMode ? 'border-white/15' : 'border-ink/10'}`}>
          <button onClick={() => setAiScope('page')} className={`px-2 py-1 ${aiScope === 'page' ? 'bg-brand-600 text-white' : 'opacity-60'}`}>Page</button>
          <button onClick={() => setAiScope('document')} className={`px-2 py-1 ${aiScope === 'document' ? 'bg-brand-600 text-white' : 'opacity-60'}`}>Whole doc</button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <button onClick={runSummary} disabled={aiLoading} className={`py-2 px-1 rounded-xl text-[11px] font-medium border transition-all disabled:opacity-50 ${darkMode ? 'bg-white/5 border-white/10 hover:border-brand-500' : 'bg-paper-dim border-ink/[0.06] hover:border-brand-400 hover:bg-brand-50'}`}>Summary</button>
        <button onClick={runMcq} disabled={aiLoading} className={`py-2 px-1 rounded-xl text-[11px] font-medium border transition-all disabled:opacity-50 ${darkMode ? 'bg-white/5 border-white/10 hover:border-brand-500' : 'bg-paper-dim border-ink/[0.06] hover:border-brand-400 hover:bg-brand-50'}`}>MCQs</button>
        <button onClick={runFlashcards} disabled={aiLoading} className={`py-2 px-1 rounded-xl text-[11px] font-medium border transition-all disabled:opacity-50 ${darkMode ? 'bg-white/5 border-white/10 hover:border-brand-500' : 'bg-paper-dim border-ink/[0.06] hover:border-brand-400 hover:bg-brand-50'}`}>Flashcards</button>
      </div>
    </div>

    <div className="flex-1 overflow-y-auto p-3 space-y-3 scroll-thin">
      {aiMessages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center gap-3 py-8 text-center opacity-60">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white text-xl">✦</div>
          <div>
            <p className="font-medium text-sm">Ask anything about this PDF</p>
            <p className="text-xs mt-1 leading-relaxed max-w-[200px]">Select text to highlight and explain it, or use the study tools above.</p>
          </div>
        </div>
      )}

      {aiMessages.map((msg, i) => (
        <div key={i}>
          {msg.role === 'user' && (
            <div className="flex justify-end">
              <div className="max-w-[85%] bg-brand-600 text-white rounded-2xl rounded-br-sm px-3 py-2 text-xs">{msg.content}</div>
            </div>
          )}
          {msg.role === 'ai' && msg.type === 'mcq' && (
            <div className={`rounded-2xl p-3 text-xs ${darkMode ? 'bg-white/5' : 'bg-paper-dim'}`}><MCQView data={msg.data} /></div>
          )}
          {msg.role === 'ai' && msg.type === 'flashcard' && (
            <div className={`rounded-2xl p-3 text-xs ${darkMode ? 'bg-white/5' : 'bg-paper-dim'}`}><FlashcardView data={msg.data} /></div>
          )}
          {msg.role === 'ai' && !msg.type && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-xl bg-brand-600 flex items-center justify-center shrink-0 mt-0.5 text-white text-[10px]">✦</div>
              <div className={`flex-1 rounded-2xl rounded-tl-sm px-3 py-2 text-xs ai-markdown ${darkMode ? 'bg-white/5' : 'bg-paper-dim'}`}>
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          )}
          {msg.role === 'error' && (
            <div className="text-xs text-rose-500 bg-rose-50 rounded-xl px-3 py-2 border border-rose-100">{msg.content}</div>
          )}
        </div>
      ))}
      {aiLoading && <TypingDots />}
      <div ref={aiBottomRef} />
    </div>

    <div className={`border-t p-3 shrink-0 ${darkMode ? 'border-white/10' : 'border-ink/[0.06]'}`}>
      <div className={`flex items-end gap-2 rounded-xl px-3 py-2 border transition ${darkMode ? 'bg-white/5 border-white/10' : 'bg-paper-dim border-ink/10 focus-within:border-brand-500'}`}>
        <textarea
          value={aiInput}
          onChange={(e) => setAiInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage() } }}
          placeholder="Ask about this PDF…"
          rows={1}
          className="flex-1 resize-none bg-transparent outline-none text-xs leading-relaxed placeholder-ink-faint"
          style={{ minHeight: 20, maxHeight: 72 }}
        />
        <button onClick={sendChatMessage} disabled={aiLoading || !aiInput.trim()} className="w-7 h-7 rounded-lg bg-brand-600 text-white disabled:opacity-40 transition shrink-0 text-xs">→</button>
      </div>
    </div>
  </div>
)

export default AiPanelContent
