import { useState } from 'react'
import { AVAILABLE_PLACE_ASSETS } from '../data/assets.js'

const DIFFICULTIES = [
  { key: 'easy', label: 'Easy', questions: 5 },
  { key: 'normal', label: 'Normal', questions: 2 },
  { key: 'hard', label: 'Hard', questions: 1 },
]

function GameSetupModal({ onClose, onStart }) {
  const [selectedPlaceKey, setSelectedPlaceKey] = useState(
    AVAILABLE_PLACE_ASSETS[0]?.key ?? '',
  )
  const [difficulty, setDifficulty] = useState(DIFFICULTIES[0].key)

  function handleSubmit(event) {
    event.preventDefault()
    const selectedDifficulty = DIFFICULTIES.find((item) => item.key === difficulty)

    onStart({
      placeKey: selectedPlaceKey,
      difficulty: selectedDifficulty,
    })
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="setup-modal" onSubmit={handleSubmit}>
        <header className="modal-header">
          <h2>Choose Your Case</h2>
          <button
            type="button"
            className="icon-action"
            aria-label="Close setup"
            onClick={onClose}
          >
            x
          </button>
        </header>

        <fieldset className="setup-fieldset">
          <legend>Place</legend>
          <select
            className="place-select"
            value={selectedPlaceKey}
            onChange={(event) => setSelectedPlaceKey(event.target.value)}
          >
            {AVAILABLE_PLACE_ASSETS.map((place) => (
              <option value={place.key} key={place.key}>
                {place.label}
              </option>
            ))}
          </select>
        </fieldset>

        <fieldset className="setup-fieldset">
          <legend>Difficulty</legend>
          <div className="difficulty-options">
            {DIFFICULTIES.map((item) => (
              <label className="difficulty-option" key={item.key}>
                <input
                  type="radio"
                  name="difficulty"
                  value={item.key}
                  checked={difficulty === item.key}
                  onChange={(event) => setDifficulty(event.target.value)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <button className="primary-action" type="submit" disabled={!selectedPlaceKey}>
          Start
        </button>
      </form>
    </div>
  )
}

export default GameSetupModal
