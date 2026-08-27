import { createLocalMystery, createMockInterviewAnswer } from '../data/mockMystery.js'

const OPENAI_API_URL = 'https://api.openai.com/v1/responses'
const DEFAULT_MODEL = 'gpt-4.1-mini'
const STORY_TIMEOUT_MS = 20000
const INTERVIEW_TIMEOUT_MS = 12000

const STORY_GENERATOR_PROMPT = `You are a murder mystery story engine for a short web game.
Return JSON only with this exact shape:
{
  "setting": { "title": string, "description": string, "assetKey": string },
  "victim": { "name": string, "details": string, "lastSeen": string },
  "secretMurdererId": string,
  "hiddenSolutionLogic": string,
  "solutionExplanation": string,
  "suspects": [
    {
      "id": string,
      "name": string,
      "role": string,
      "assetKey": string,
      "initialStatement": string,
      "secretMotive": string,
      "isKiller": boolean,
      "isEliminated": false
    }
  ]
}
First pick exactly 1 place from the provided places list and set setting.assetKey to that place key.
Then pick exactly 4 distinct characters from the provided characters list that plausibly fit that place.
Every suspect.assetKey must be one of the selected character keys. Do not invent new asset keys.
Mark exactly 1 suspect as the killer and set secretMurdererId to that suspect's id.
Give the killer a subtle logical contradiction in their timeline or motive.
Give the other 3 suspects shady but innocent secrets so everyone seems suspicious.
Make the case different each time: vary names, victim, motive, clue, and timeline.`

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
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY

  let response

  if (!apiKey) {
    const error = new Error('VITE_OPENAI_API_KEY is empty.')
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
        reason: import.meta.env.VITE_OPENAI_API_KEY
          ? 'VITE_USE_MOCKS is not set to false.'
          : 'VITE_OPENAI_API_KEY is empty.',
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
