function EndScreen({ didWin, storyData, suspects, onRestart }) {
  const killer = suspects.find((suspect) => suspect.isKiller)

  return (
    <section className="end-screen">
      <p className="eyebrow">{didWin ? 'Case closed' : 'Case lost'}</p>
      <h1>{didWin ? 'You caught the killer.' : 'The killer slipped away.'}</h1>
      <p>
        {killer.name}, the {killer.role.toLowerCase()}, was responsible for the
        murder of {storyData.victim.name}.
      </p>
      <div className="confession-panel">
        <h2>Confession</h2>
        <p>{storyData.solutionExplanation}</p>
      </div>
      <button className="primary-action" type="button" onClick={onRestart}>
        Start New Case
      </button>
    </section>
  )
}

export default EndScreen
