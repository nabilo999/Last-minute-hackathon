import { useMemo, useState } from 'react'
import EndScreen from './EndScreen.jsx'
import QuestionModal from './QuestionModal.jsx'
import StoryIntro from './StoryIntro.jsx'
import SuspectGrid from './SuspectGrid.jsx'
import { ASSET_POOL, getPlaceAsset } from '../data/assets.js'
import { createLocalMystery, createMockInterviewAnswer } from '../data/mockMystery.js'
import { askSuspect, generateStory } from '../services/aiClient.js'

const STARTING_QUESTIONS = 5

const createInitialState = () => ({
  phase: 'INTRO',
  storyData: null,
  suspects: [],
  remainingQuestions: STARTING_QUESTIONS,
  selectedSuspectForQuestion: null,
})

function GameContainer() {
  const [hasStarted, setHasStarted] = useState(false)
  const [gameState, setGameState] = useState(createInitialState)
  const [questionHistory, setQuestionHistory] = useState({})
  const [isAnswering, setIsAnswering] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const activeSuspects = useMemo(
    () => gameState.suspects.filter((suspect) => !suspect.isEliminated),
    [gameState.suspects],
  )

  const selectedSuspect = gameState.suspects.find(
    (suspect) => suspect.id === gameState.selectedSuspectForQuestion,
  )

  async function startGame() {
    setHasStarted(true)
    setStatusMessage('Generating a case file...')
    setGameState({ ...createInitialState(), phase: 'LOADING' })

    try {
      const story = await generateStory(ASSET_POOL)
      setGameState({
        phase: 'INTRO',
        storyData: story,
        suspects: story.suspects,
        remainingQuestions: STARTING_QUESTIONS,
        selectedSuspectForQuestion: null,
      })
      setStatusMessage('')
    } catch (error) {
      try {
        const fallbackStory = createLocalMystery(ASSET_POOL)
        setGameState({
          phase: 'INTRO',
          storyData: fallbackStory,
          suspects: fallbackStory.suspects,
          remainingQuestions: STARTING_QUESTIONS,
          selectedSuspectForQuestion: null,
        })
        setStatusMessage(
          `The live story generator failed, so a local random case loaded instead. ${error.message}`,
        )
      } catch (fallbackError) {
        setGameState((current) => ({ ...current, phase: 'INTRO' }))
        setStatusMessage(fallbackError.message)
      }
    }
  }

  function beginInvestigation() {
    setGameState((current) => ({ ...current, phase: 'PLAYING' }))
  }

  function openQuestionModal(suspectId) {
    if (gameState.remainingQuestions <= 0) {
      setStatusMessage('No questions remain. Time to make an accusation.')
      return
    }

    setGameState((current) => ({
      ...current,
      selectedSuspectForQuestion: suspectId,
    }))
  }

  function closeQuestionModal() {
    if (isAnswering) return

    setGameState((current) => ({
      ...current,
      selectedSuspectForQuestion: null,
    }))
  }

  async function submitQuestion(question) {
    if (!selectedSuspect || gameState.remainingQuestions <= 0 || isAnswering) {
      return
    }

    const suspectId = selectedSuspect.id
    const currentHistory = questionHistory[suspectId] ?? []
    const nextHistory = [
      ...currentHistory,
      { speaker: 'player', text: question },
    ]

    setQuestionHistory((current) => ({
      ...current,
      [suspectId]: nextHistory,
    }))
    setGameState((current) => ({
      ...current,
      remainingQuestions: Math.max(current.remainingQuestions - 1, 0),
    }))
    setIsAnswering(true)

    try {
      const answer = await askSuspect({
        storyData: gameState.storyData,
        suspect: selectedSuspect,
        question,
        history: currentHistory,
      })

      setQuestionHistory((current) => ({
        ...current,
        [suspectId]: [
          ...(current[suspectId] ?? nextHistory),
          { speaker: 'suspect', text: answer },
        ],
      }))
    } catch (error) {
      const fallback = createMockInterviewAnswer(
        selectedSuspect,
        question,
        gameState.storyData,
      )
      setQuestionHistory((current) => ({
        ...current,
        [suspectId]: [
          ...(current[suspectId] ?? nextHistory),
          {
            speaker: 'suspect',
            text: `${fallback} (Interview API fallback: ${error.message})`,
          },
        ],
      }))
    } finally {
      setIsAnswering(false)
    }
  }

  function voteSuspect(suspectId) {
    const accused = gameState.suspects.find((suspect) => suspect.id === suspectId)
    if (!accused) return

    if (accused.isKiller) {
      setGameState((current) => ({ ...current, phase: 'WIN' }))
      return
    }

    if (activeSuspects.length <= 2) {
      setGameState((current) => ({ ...current, phase: 'GAME_OVER' }))
      return
    }

    setStatusMessage(`${accused.name} was cleared, but the killer is still here.`)
    setGameState((current) => ({
      ...current,
      suspects: current.suspects.map((suspect) =>
        suspect.id === suspectId ? { ...suspect, isEliminated: true } : suspect,
      ),
    }))
  }

  function restartGame() {
    setHasStarted(false)
    setQuestionHistory({})
    setStatusMessage('')
    setGameState(createInitialState())
  }

  if (!hasStarted) {
    return (
      <main className="landing-screen">
        <div className="landing-content">
          <p className="eyebrow">AI murder mystery MVP</p>
          <h1>Cold Case Club</h1>
          <p className="landing-copy">
            Generate a locked-room mystery, question four suspects, and accuse
            the killer before your leads run dry.
          </p>
          <button className="primary-action" type="button" onClick={startGame}>
            Start Investigation
          </button>
        </div>
      </main>
    )
  }

  if (gameState.phase === 'LOADING') {
    return (
      <main className="loading-screen">
        <div className="spinner" aria-hidden="true" />
        <h1>Building the case file</h1>
        <p>{statusMessage}</p>
      </main>
    )
  }

  if (!gameState.storyData) {
    return (
      <main className="loading-screen">
        <h1>Asset setup needed</h1>
        <p>{statusMessage || 'Add at least one place and four character assets.'}</p>
        <button className="primary-action" type="button" onClick={restartGame}>
          Back to Start
        </button>
      </main>
    )
  }

  const activePlaceAsset = getPlaceAsset(gameState.storyData.setting.assetKey)

  return (
    <main className="game-shell">
      {gameState.phase === 'INTRO' && (
        <StoryIntro
          storyData={gameState.storyData}
          onBegin={beginInvestigation}
          statusMessage={statusMessage}
        />
      )}

      {gameState.phase === 'PLAYING' && (
        <>
          <section className="case-header">
            <div className="case-place-thumb">
              {activePlaceAsset.imageUrl ? (
                <img src={activePlaceAsset.imageUrl} alt={activePlaceAsset.label} />
              ) : (
                <span>{activePlaceAsset.label}</span>
              )}
            </div>
            <div>
              <p className="eyebrow">Investigation active</p>
              <h1>{gameState.storyData.setting.title}</h1>
              <p>{gameState.storyData.setting.description}</p>
            </div>
            <div className="question-counter">
              <span>{gameState.remainingQuestions}</span>
              questions left
            </div>
          </section>

          {statusMessage && <p className="status-message">{statusMessage}</p>}

          <SuspectGrid
            suspects={gameState.suspects}
            onAsk={openQuestionModal}
            onVote={voteSuspect}
            canAsk={gameState.remainingQuestions > 0}
          />
        </>
      )}

      {(gameState.phase === 'WIN' || gameState.phase === 'GAME_OVER') && (
        <EndScreen
          didWin={gameState.phase === 'WIN'}
          storyData={gameState.storyData}
          suspects={gameState.suspects}
          onRestart={restartGame}
        />
      )}

      {selectedSuspect && (
        <QuestionModal
          suspect={selectedSuspect}
          history={questionHistory[selectedSuspect.id] ?? []}
          remainingQuestions={gameState.remainingQuestions}
          isAnswering={isAnswering}
          onClose={closeQuestionModal}
          onSubmit={submitQuestion}
        />
      )}
    </main>
  )
}

export default GameContainer
