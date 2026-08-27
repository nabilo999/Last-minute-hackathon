import SuspectCard from './SuspectCard.jsx'

function SuspectGrid({ suspects, onAsk, onVote, canAsk }) {
  return (
    <section className="suspect-grid" aria-label="Suspects">
      {suspects.map((suspect) => (
        <SuspectCard
          key={suspect.id}
          suspect={suspect}
          onAsk={onAsk}
          onVote={onVote}
          canAsk={canAsk}
        />
      ))}
    </section>
  )
}

export default SuspectGrid
