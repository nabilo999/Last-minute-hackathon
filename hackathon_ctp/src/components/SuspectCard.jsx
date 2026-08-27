import { getCharacterAsset } from '../data/assets.js'

function SuspectCard({ suspect, onAsk, onVote, canAsk }) {
  const asset = getCharacterAsset(suspect.assetKey)

  return (
    <article className={`suspect-card ${suspect.isEliminated ? 'is-eliminated' : ''}`}>
      <p className="statement-bubble">{suspect.initialStatement}</p>
      <div className={`asset-box asset-${suspect.assetKey}`}>
        {asset.imageUrl ? (
          <img src={asset.imageUrl} alt={asset.label} />
        ) : (
          <span>{asset.label}</span>
        )}
      </div>
      <div className="suspect-details">
        <h2>{suspect.name}</h2>
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
          Vote
        </button>
      </div>
      {suspect.isEliminated && <p className="cleared-label">Cleared</p>}
    </article>
  )
}

export default SuspectCard
