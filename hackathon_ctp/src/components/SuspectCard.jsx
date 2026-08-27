import { CHARACTER_ASSETS } from '../data/assets.js'

function SuspectCard({ suspect, onAsk, onVote, canAsk }) {
  const asset = CHARACTER_ASSETS[suspect.assetKey] ?? CHARACTER_ASSETS.unknown

  return (
    <article className={`suspect-card ${suspect.isEliminated ? 'is-eliminated' : ''}`}>
      <div className={`asset-box asset-${suspect.assetKey}`}>
        <span>{asset.label}</span>
      </div>
      <div className="suspect-details">
        <p className="eyebrow">{suspect.role}</p>
        <h2>{suspect.name}</h2>
        <p>{suspect.initialStatement}</p>
      </div>
      <div className="suspect-actions">
        <button
          type="button"
          className="secondary-action"
          disabled={!canAsk || suspect.isEliminated}
          onClick={() => onAsk(suspect.id)}
        >
          Ask
        </button>
        <button
          type="button"
          className="danger-action"
          disabled={suspect.isEliminated}
          onClick={() => onVote(suspect.id)}
        >
          Accuse
        </button>
      </div>
      {suspect.isEliminated && <p className="cleared-label">Cleared</p>}
    </article>
  )
}

export default SuspectCard
