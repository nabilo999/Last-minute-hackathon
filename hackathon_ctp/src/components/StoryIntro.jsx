function StoryIntro({ storyData, onBegin, statusMessage }) {
  return (
    <section className="intro-layout">
      <div className="intro-copy">
        <p className="eyebrow">Case file ready</p>
        <h1>{storyData.setting.title}</h1>
        <p>{storyData.setting.description}</p>
      </div>

      <div className="victim-panel">
        <p className="eyebrow">Victim</p>
        <h2>{storyData.victim.name}</h2>
        <p>{storyData.victim.details}</p>
        <p className="evidence-note">{storyData.victim.lastSeen}</p>
      </div>

      {statusMessage && <p className="status-message">{statusMessage}</p>}

      <button className="primary-action" type="button" onClick={onBegin}>
        Begin Investigation
      </button>
    </section>
  )
}

export default StoryIntro
