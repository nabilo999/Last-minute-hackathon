const firstNames = [
  'Antoine',
  'Beatrice',
  'Clara',
  'Dorian',
  'Evelyn',
  'Felix',
  'Iris',
  'Miles',
  'Priya',
  'Vivian',
]

const lastNames = [
  'Vale',
  'Graves',
  'Morrow',
  'Blackwell',
  'Voss',
  'Sterling',
  'Hale',
  'Ashcroft',
]

const placeDetails = {
  mansion: {
    title: 'Midnight at Marlowe Manor',
    scene:
      'A storm pins every guest inside an old hilltop estate during a private dinner.',
    clueObject: 'silver conservatory key',
    clueLocation: 'conservatory',
    clueDetail: 'crushed basil from the broken planter',
  },
}

const characterRoles = {
  butler: 'Butler',
  chef: 'Head Chef',
  doctor: 'Family Doctor',
  gardener: 'Estate Gardener',
  gardner: 'Estate Gardener',
  socialite: 'Socialite',
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)]
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5)
}

function roleForAsset(asset) {
  return characterRoles[asset.key] ?? asset.label
}

function nameForAsset(asset, index) {
  return `${firstNames[(index + Math.floor(Math.random() * firstNames.length)) % firstNames.length]} ${pickRandom(lastNames)}`
}

function getPlaceStory(placeAsset) {
  const fallback = {
    title: `The ${placeAsset.label} Murder`,
    scene: `A private gathering at the ${placeAsset.label.toLowerCase()} turns deadly before midnight.`,
    clueObject: 'missing brass token',
    clueLocation: placeAsset.label.toLowerCase(),
    clueDetail: 'fresh mud on the floor',
  }

  return placeDetails[placeAsset.key] ?? fallback
}

export function createLocalMystery(assetPool) {
  if (assetPool.places.length < 1) {
    throw new Error('Add at least one image to src/assets/places.')
  }

  if (assetPool.characters.length < 4) {
    throw new Error('Add at least four character images to src/assets/characters.')
  }

  const placeAsset = pickRandom(assetPool.places)
  const selectedCharacters = shuffle(assetPool.characters).slice(0, 4)
  const killerIndex = Math.floor(Math.random() * selectedCharacters.length)
  const placeStory = getPlaceStory(placeAsset)
  const victimName = `${pickRandom(firstNames)} ${pickRandom(lastNames)}`

  const suspects = selectedCharacters.map((asset, index) => {
    const isKiller = index === killerIndex
    const role = roleForAsset(asset)
    const name = nameForAsset(asset, index)

    return {
      id: `suspect_${index + 1}`,
      name,
      role,
      assetKey: asset.key,
      initialStatement: isKiller
        ? `I never went near the ${placeStory.clueLocation}; I stayed with the other guests the whole time.`
        : `I was handling my ${role.toLowerCase()} duties when the alarm was raised.`,
      secretMotive: isKiller
        ? `They feared ${victimName} would expose a debt tied to the ${placeStory.clueObject}.`
        : `They were hiding a private embarrassment connected to their work as the ${role.toLowerCase()}.`,
      isKiller,
      isEliminated: false,
    }
  })

  const killer = suspects[killerIndex]

  return {
    setting: {
      title: placeStory.title,
      description: `${placeStory.scene} When the lights fail for seven minutes, ${victimName} is found dead and everyone has something to hide.`,
      assetKey: placeAsset.key,
    },
    victim: {
      name: victimName,
      details:
        'The victim was preparing to reveal a secret that would ruin one person in the room.',
      lastSeen: `Last seen carrying the ${placeStory.clueObject} toward the ${placeStory.clueLocation}.`,
    },
    secretMurdererId: killer.id,
    hiddenSolutionLogic: `${killer.name} says they avoided the ${placeStory.clueLocation}, but can describe ${placeStory.clueDetail}.`,
    solutionExplanation: `${killer.name} was caught by one impossible detail: they claimed they never entered the ${placeStory.clueLocation}, yet knew about ${placeStory.clueDetail}. Only the killer could have noticed that during the attack.`,
    suspects,
  }
}

export function createMockInterviewAnswer(suspect, question, storyData) {
  const lowerQuestion = question.toLowerCase()
  const clueLocation = storyData?.hiddenSolutionLogic?.match(/avoided the ([^,]+)/)?.[1]
  const solutionDetail = storyData?.hiddenSolutionLogic?.split('but can describe ')[1]

  if (
    suspect.isKiller &&
    (lowerQuestion.includes(clueLocation ?? 'conservatory') ||
      /clue|detail|smell|mud|key|token|plant|floor/.test(lowerQuestion))
  ) {
    return `I never went there. I only heard later about ${solutionDetail ?? 'that odd detail'}. People talk when they panic.`
  }

  if (suspect.isKiller && /where|time|blackout|lights|when/.test(lowerQuestion)) {
    return 'I stayed with the others during the blackout. It was chaos, so no one can expect a perfect timeline.'
  }

  if (/motive|secret|argument|hide|debt|embarrass/.test(lowerQuestion)) {
    return `Fine. I was worried because ${suspect.secretMotive.toLowerCase()} But that does not make me a murderer.`
  }

  if (/victim|will|reveal|secret/.test(lowerQuestion)) {
    return 'They had a talent for making people feel exposed. I was upset, yes, but they were alive the last time I saw them.'
  }

  return suspect.isKiller
    ? 'I already told you what happened. You should spend your questions on someone with a real reason to panic.'
    : 'I was frightened and embarrassed, but I did not hurt anyone. My secret is ugly, not deadly.'
}
