import { useState } from 'react'

function QuestionModal({
  suspect,
  history,
  remainingQuestions,
  isAnswering,
  onClose,
  onSubmit,
}) {
  const [question, setQuestion] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const trimmed = question.trim()
    if (!trimmed || isAnswering || remainingQuestions <= 0) return

    onSubmit(trimmed)
    setQuestion('')
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="question-modal" role="dialog" aria-modal="true">
        <header className="modal-header">
          <div>
            <p className="eyebrow">Interview</p>
            <h2>{suspect.name}</h2>
          </div>
          <button
            type="button"
            className="icon-action"
            aria-label="Close interview"
            onClick={onClose}
            disabled={isAnswering}
          >
            x
          </button>
        </header>

        <div className="chat-history">
          {history.length === 0 ? (
            <p className="empty-chat">Ask about timelines, motives, or what they saw.</p>
          ) : (
            history.map((message, index) => (
              <p className={`chat-line ${message.speaker}`} key={`${message.speaker}-${index}`}>
                <span>{message.speaker === 'player' ? 'You' : suspect.name}</span>
                {message.text}
              </p>
            ))
          )}
          {isAnswering && <p className="chat-line suspect">Thinking...</p>}
        </div>

        <form className="question-form" onSubmit={handleSubmit}>
          <label htmlFor="question-input">
            {remainingQuestions} questions remaining
          </label>
          <div className="question-row">
            <input
              id="question-input"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Where were you when the lights went out?"
              disabled={isAnswering || remainingQuestions <= 0}
            />
            <button
              className="primary-action"
              type="submit"
              disabled={isAnswering || remainingQuestions <= 0 || !question.trim()}
            >
              Ask
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default QuestionModal
