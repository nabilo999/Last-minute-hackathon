import { createLocalMystery, createMockInterviewAnswer } from '../data/mockMystery.js'

const OPENAI_API_URL = 'https://api.openai.com/v1/responses'
const DEFAULT_MODEL = 'gpt-4.1-mini'
const STORY_TIMEOUT_MS = 20000
const INTERVIEW_TIMEOUT_MS = 12000

const STORY_GENERATOR_PROMPT = `You are a murder mystery story designer for a short, replay able web game.

Generate a believable, logically solvable murder mystery designed to be solved by interviewing exactly 4 suspects in about 3 minutes. The overall story context MUST be exactly 2-3 sentences.

Return JSON ONLY. No Markdown, code fences, commentary, or extra fields.

EXACT JSON SHAPE:
{
  "setting": {
    "title": "string",
    "description": "string",
    "assetKey": "string"
  },
  "victim": {
    "name": "string",
    "details": "string",
    "lastSeen": "string"
  },
  "secretMurdererId": "string",
  "hiddenSolutionLogic": "string",
  "solutionExplanation": "string",
  "suspects": [
    {
      "id": "string",
      "name": "string",
      "role": "string",
      "assetKey": "string",
      "initialStatement": "string",
      "secretMotive": "string",
      "isKiller": true,
      "isEliminated": false
    }
  ]
}

ASSETS:
- Select exactly 1 place from the provided places list.
- setting.assetKey MUST exactly match a provided place key.
- Select exactly 4 DIFFERENT characters from the provided characters list.
- Every suspect.assetKey MUST exactly match one of those 4 character keys.
- Never invent asset keys.

SETTING:
Create a contained location where the victim and all 4 suspects could realistically be present during the murder.

Good examples:

a small hotel
a dinner night
a school
a theater
a small office

VICTIM:
Give the victim a believable identity, relationships, and reason for conflict with multiple suspects. Include a clear approximate time they were last seen alive.

SUSPECTS:
Create exactly 4 distinct suspects with different personalities, relationships, motives, and reasons for being present.

KILLER:
Exactly ONE suspect has "isKiller": true. The other 3 MUST be false.
secretMurdererId MUST equal the killer's id.

The killer must have:
- a believable motive
- a realistic opportunity
- a plausible initial alibi
- a subtle contradiction in their story
- a reason to lie

The contradiction must be discoverable through interviews by connecting at least TWO pieces of information. It must not be an obvious confession.

INNOCENT SUSPECTS:
The other 3 suspects are genuinely innocent.

Each must have a suspicious secret that gives them a reason to lie, such as theft, blackmail, affair, debt, secret meeting, or hiding unrelated evidence.

Their secrets MUST NOT involve the murder. Each must be logically clearable.

INTERVIEWS:
Each initialStatement MUST be exactly 1 sentence.

Write it as a natural first response to a detective, not as a summary of the character.

The statement MUST:
- mention the suspect's specific relationship with the victim
- give a concrete reason they were at the location
- mention a specific time, place, person, or action from that evening
- provide a believable alibi or account of their movements
- include one concrete detail that can be challenged or investigated later

Avoid vague phrases like "we had a complicated relationship," "I was nowhere near the scene," or "I had nothing to do with it."

Do not directly reveal the suspect's secret, the killer, or the solution.
Make each suspect's statement sound different and conversational.



FAIR PLAY:
The killer must be identifiable through logical deduction from the generated information and interviews.

Do not rely on:
- guessing
- supernatural information
- unknown characters
- impossible timelines
- arbitrary coincidences
- information only the narrator knows
- a required confession

TIMELINE:
Keep the murder timeline simple and physically possible. The killer's opportunity and contradiction must fit the timeline.

hiddenSolutionLogic must explain:
- killer
- motive
- opportunity
- alibi
- contradiction
- why each other suspect is innocent

solutionExplanation should be a short player-facing explanation of how the killer was identified.

REPLAYABILITY:
Vary the setting, victim, killer, motive, murder circumstances, clues, timeline, and innocent secrets between generations. Avoid repeating the same formula.

Before returning, silently verify:
- exactly 4 suspects
- exactly 1 killer
- 3 innocent suspects
- unique suspect ids
- 4 unique character assetKeys
- all assetKeys came from the provided lists
- secretMurdererId matches the killer
- all isEliminated values are false
- timeline is consistent
- killer's contradiction is discoverable
- innocent suspects are actually innocent
- the case is solvable without guessing

Return ONLY the JSON.`

function shouldUseMocks() {
  return import.meta.env.VITE_USE_MOCKS === 'true'
}

function getModel() {
  return import.meta.env.VITE_OPENAI_MODEL || DEFAULT_MODEL
}

function readOutputText(payload) {
  if (payload.output_text) return payload.output_text

  return (
    payload.output
      ?.flatMap((item) => item.content ?? [])
      ?.map((content) => content.text ?? '')
      ?.join('') ?? ''
  )
}

function parseJsonText(rawText) {
  return rawText
    .trim()
    .replace(/^```json/i, '')
    .replace(/^```/, '')
    .replace(/```$/, '')
    .trim()
}

function validateAssetPool(assetPool) {
  if (assetPool.places.length < 1) {
    throw new Error('Add at least one image to src/assets/places.')
  }

  if (assetPool.characters.length < 4) {
    throw new Error('Add at least four character images to src/assets/characters.')
  }
}

function normalizeGeneratedStory(story, assetPool) {
  const placeKeys = new Set(assetPool.places.map((asset) => asset.key))
  const characterKeys = new Set(assetPool.characters.map((asset) => asset.key))
  const suspects = story.suspects ?? []
  const usedCharacterKeys = new Set(suspects.map((suspect) => suspect.assetKey))

  if (!placeKeys.has(story.setting?.assetKey)) {
    throw new Error('OpenAI returned a place asset that does not exist locally.')
  }

  if (suspects.length !== 4 || usedCharacterKeys.size !== 4) {
    throw new Error('OpenAI must return exactly four suspects with unique assets.')
  }

  if ([...usedCharacterKeys].some((key) => !characterKeys.has(key))) {
    throw new Error('OpenAI returned a character asset that does not exist locally.')
  }

  const killerCount = suspects.filter((suspect) => suspect.isKiller).length
  if (killerCount !== 1) {
    throw new Error('OpenAI must mark exactly one killer.')
  }

  const normalizedSuspects = suspects.map((suspect, index) => ({
    ...suspect,
    id: suspect.id || `suspect_${index + 1}`,
    isEliminated: false,
  }))
  const killer = normalizedSuspects.find((suspect) => suspect.isKiller)

  return {
    ...story,
    secretMurdererId: killer.id,
    suspects: normalizedSuspects,
  }
}

function formatOpenAIError(error) {
  return [
    `Provider: OpenAI`,
    `Endpoint: ${error.endpoint ?? 'unknown'}`,
    `Status: ${error.status ?? 'unknown'} ${error.statusText ?? ''}`.trim(),
    `Model: ${error.model ?? 'unknown'}`,
    `Message: ${error.message}`,
    error.rawDetails ? `Raw response: ${error.rawDetails}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function createTimeoutSignal(timeoutMs) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  return { signal: controller.signal, timeoutId }
}

async function callOpenAIApi({
  systemInstruction,
  prompt,
  responseMimeType,
  timeoutMs,
}) {
  const { signal, timeoutId } = createTimeoutSignal(timeoutMs)
  const endpoint = OPENAI_API_URL
  const model = getModel()
  const apiKey = import.meta.env.OPENAI_API_KEY

  let response

  if (!apiKey) {
    const error = new Error('OPENAI_API_KEY is empty.')
    error.status = 'CONFIG'
    error.statusText = 'Missing API key'
    error.model = model
    error.endpoint = endpoint
    throw error
  }

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'system',
            content: systemInstruction,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        text:
          responseMimeType === 'application/json'
            ? { format: { type: 'json_object' } }
            : undefined,
      }),
    })
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error(
        `OpenAI request timed out after ${timeoutMs}ms for ${model}`,
      )
      timeoutError.status = 408
      timeoutError.model = model
      timeoutError.endpoint = endpoint
      throw timeoutError
    }

    error.model = model
    error.endpoint = endpoint
    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }

  if (!response.ok) {
    let errorPayload = null
    let rawDetails = ''

    try {
      rawDetails = await response.clone().text()
      errorPayload = rawDetails ? JSON.parse(rawDetails) : null
    } catch {
      rawDetails = rawDetails || response.statusText
    }

    const apiMessage = errorPayload?.error?.message || rawDetails || response.statusText
    const error = new Error(`OpenAI request failed with ${response.status}: ${apiMessage}`)
    error.status = response.status
    error.statusText = response.statusText
    error.model = model
    error.endpoint = endpoint
    error.rawDetails = rawDetails
    throw error
  }

  return response.json()
}

export async function generateStory(assetPool) {
  validateAssetPool(assetPool)

  if (shouldUseMocks()) {
    const story = createLocalMystery(assetPool)

    return {
      ...story,
      apiDebug: {
        source: 'local-mock',
        reason: import.meta.env.OPENAI_API_KEY
          ? 'VITE_USE_MOCKS is not set to false.'
          : 'OPENAI_API_KEY is empty.',
        parsedStory: story,
      },
    }
  }

  let payload

  try {
    payload = await callOpenAIApi({
      systemInstruction: STORY_GENERATOR_PROMPT,
      prompt: `Available places:
${JSON.stringify(assetPool.places.map(({ key, label }) => ({ key, label })), null, 2)}

Available characters:
${JSON.stringify(assetPool.characters.map(({ key, label }) => ({ key, label })), null, 2)}

Pick the place first, then choose four fitting character assets from the list.`,
      responseMimeType: 'application/json',
      timeoutMs: STORY_TIMEOUT_MS,
    })
  } catch (error) {
    error.message = formatOpenAIError(error)
    throw error
  }

  const rawOutputText = readOutputText(payload)
  let parsedStory

  try {
    parsedStory = JSON.parse(parseJsonText(rawOutputText))
  } catch (error) {
    error.message = `OpenAI returned invalid story JSON: ${error.message}\nRaw output:\n${rawOutputText}`
    throw error
  }

  const story = normalizeGeneratedStory(parsedStory, assetPool)

  return {
    ...story,
    apiDebug: {
      source: 'openai',
      model: getModel(),
      rawOutputText,
      parsedStory: story,
      rawResponse: payload,
    },
  }
}

export async function askSuspect({ storyData, suspect, question, history }) {
  if (shouldUseMocks()) {
    return createMockInterviewAnswer(suspect, question, storyData)
  }

  const previousQuestions = history
    .map((message) => `${message.speaker}: ${message.text}`)
    .join('\n')

  let payload

  try {
    payload = await callOpenAIApi({
      systemInstruction: `You are ${suspect.name}, ${suspect.role} in a murder mystery.
Setting: ${storyData.setting.description}
Your story is: ${suspect.initialStatement}
Your secret is: ${suspect.secretMotive}
You are ${suspect.isKiller ? 'THE KILLER. Deflect cleverly if pressed on your flaw, but leak tiny contradictions.' : 'INNOCENT. You are nervous about your secret, but honest about the murder.'}
Answer in 1-3 sentences and stay in character.`,
      prompt: `Previous interview history:
${previousQuestions || 'No previous questions.'}

Player question: ${question}`,
      responseMimeType: 'text/plain',
      timeoutMs: INTERVIEW_TIMEOUT_MS,
    })
  } catch (error) {
    error.message = formatOpenAIError(error)
    throw error
  }

  const answer = readOutputText(payload).trim()

  if (!answer) {
    throw new Error('OpenAI returned an empty interview response.')
  }

  return answer
}
