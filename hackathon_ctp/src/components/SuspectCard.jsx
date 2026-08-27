import { getCharacterAsset } from '../data/assets.js'

function SuspectCard({ suspect, onAsk, onVote, canAsk }) {
  const asset = getCharacterAsset(suspect.assetKey)

  return (
    <article className={`suspect-card ${suspect.isEliminated ? 'is-eliminated' : ''}`}>
      <div className={`asset-box asset-${suspect.assetKey}`}>
        {asset.imageUrl ? (
          <img src={asset.imageUrl} alt={asset.label} />
        ) : (
          <span>{asset.label}</span>
        )}
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
