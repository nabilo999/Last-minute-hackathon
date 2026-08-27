import { useEffect, useMemo, useState } from 'react'

function StoryIntro({ storyData, onBegin }) {
  const storyText = useMemo(
    () =>
      [
        storyData.setting.description,
        storyData.victim.details,
        storyData.victim.lastSeen,
      ].join(' '),
    [storyData],
  )
  const [visibleLength, setVisibleLength] = useState(0)
  const isComplete = visibleLength >= storyText.length

  useEffect(() => {
    if (isComplete) return undefined

    const timeoutId = window.setTimeout(() => {
      setVisibleLength((current) => Math.min(current + 2, storyText.length))
    }, 22)

    return () => window.clearTimeout(timeoutId)
  }, [isComplete, storyText.length, visibleLength])

  return (
    <section className="intro-layout">
      <p className="story-reveal">{storyText.slice(0, visibleLength)}</p>

      {isComplete && (
        <button className="primary-action" type="button" onClick={onBegin}>
          Start Investigation
        </button>
      )}
    </section>
  )
}

export default StoryIntro
