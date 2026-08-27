export const mockMystery = {
  setting: {
    title: 'Midnight at Marlowe Manor',
    description:
      'A storm pins every guest inside an old hilltop estate during a charity dinner. When the lights fail for seven minutes, the host is found dead beside the locked conservatory doors.',
  },
  victim: {
    name: 'Eleanor Marlowe',
    details:
      'Heiress, donor, and keeper of every guest list in town. She had promised to announce a shocking change to her will before dessert.',
    lastSeen:
      'Last seen alive at 9:12 PM carrying a silver key toward the conservatory.',
  },
  secretMurdererId: 'suspect_4',
  hiddenSolutionLogic:
    'Vivian claims she never entered the conservatory, but she mentions the scent of crushed basil from inside the room before anyone else describes it.',
  solutionExplanation:
    'Vivian confessed after her timeline collapsed. She said she stayed in the ballroom, yet knew the conservatory smelled of crushed basil after the planter was knocked over during the attack. That detail was only available to someone who had been inside with Eleanor.',
  suspects: [
    {
      id: 'suspect_1',
      name: 'Chef Antoine',
      role: 'Head Chef',
      assetKey: 'chef',
      initialStatement: 'I was in the kitchen preparing the soup all evening.',
      secretMotive: "He broke Eleanor's antique serving plates during an argument.",
      isKiller: false,
      isEliminated: false,
    },
    {
      id: 'suspect_2',
      name: 'Miles Graves',
      role: 'Butler',
      assetKey: 'butler',
      initialStatement: 'I was polishing glassware in the pantry when the lights failed.',
      secretMotive: 'He was selling gossip about the family to a tabloid.',
      isKiller: false,
      isEliminated: false,
    },
    {
      id: 'suspect_3',
      name: 'Dr. Priya Voss',
      role: 'Family Doctor',
      assetKey: 'doctor',
      initialStatement: 'I was checking on an elderly guest near the library.',
      secretMotive: 'She concealed that Eleanor was changing doctors over missing pills.',
      isKiller: false,
      isEliminated: false,
    },
    {
      id: 'suspect_4',
      name: 'Vivian Vale',
      role: 'Socialite',
      assetKey: 'socialite',
      initialStatement:
        'I stayed in the ballroom the entire blackout and never went near the conservatory.',
      secretMotive:
        "She was being cut from Eleanor's will and killed to keep her debts hidden.",
      isKiller: true,
      isEliminated: false,
    },
  ],
}

export function createMockInterviewAnswer(suspect, question) {
  const lowerQuestion = question.toLowerCase()

  if (suspect.isKiller && /conservatory|smell|basil|plant|key/.test(lowerQuestion)) {
    return 'The conservatory? I never entered it. I only heard later about that awful basil smell from the broken planter. People were talking, I suppose.'
  }

  if (suspect.isKiller && /where|time|blackout|lights/.test(lowerQuestion)) {
    return 'I was in the ballroom when the lights went out. Many people were moving around, so I cannot be expected to account for every second.'
  }

  if (/motive|secret|argument|hide/.test(lowerQuestion)) {
    return `Fine. I was worried about ${suspect.secretMotive.toLowerCase()} But that does not make me a murderer.`
  }

  if (/victim|eleanor|will/.test(lowerQuestion)) {
    return 'Eleanor had a talent for making everyone feel exposed. I was upset with her, yes, but she was alive the last time I saw her.'
  }

  return suspect.isKiller
    ? 'I already told you what happened. You should spend your questions on someone with a real reason to panic.'
    : 'I was frightened and embarrassed, but I did not hurt Eleanor. My secret is ugly, not deadly.'
}
