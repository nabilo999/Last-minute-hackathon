import { createLocalMystery, createMockInterviewAnswer } from '../data/mockMystery.js'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const DEFAULT_MODEL = 'gemini-3.7-flash'
const FALLBACK_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
]
const FALLBACK_STATUS_CODES = new Set([403, 404])

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
  return import.meta.env.VITE_USE_MOCKS !== 'false' || !import.meta.env.VITE_GEMINI_API_KEY
}

function getModel() {
  return import.meta.env.VITE_GEMINI_MODEL || DEFAULT_MODEL
}

function getModelCandidates() {
  const preferredModel = getModel().replace(/^models\//, '')

  return [...new Set([preferredModel, ...FALLBACK_MODELS])]
}

function readOutputText(payload) {
  return (
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('') ?? ''
  )
}

function parseJsonResponse(payload) {
  const text = readOutputText(payload)
    .trim()
    .replace(/^```json/i, '')
    .replace(/^```/, '')
    .replace(/```$/, '')
    .trim()

  return JSON.parse(text)
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
    throw new Error('Gemini returned a place asset that does not exist locally.')
  }

  if (suspects.length !== 4 || usedCharacterKeys.size !== 4) {
    throw new Error('Gemini must return exactly four suspects with unique assets.')
  }

  if ([...usedCharacterKeys].some((key) => !characterKeys.has(key))) {
    throw new Error('Gemini returned a character asset that does not exist locally.')
  }

  const killerCount = suspects.filter((suspect) => suspect.isKiller).length
  if (killerCount !== 1) {
    throw new Error('Gemini must mark exactly one killer.')
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

function createGeminiErrorMessage({ error, attemptedModels }) {
  const triedModels = attemptedModels.join(', ')

  if (error.status === 403) {
    return `Gemini access denied with ${error.model}. Check that VITE_GEMINI_API_KEY is a Google AI Studio key and that the key's project has Gemini API access. Tried models: ${triedModels}`
  }

  if (error.status === 404) {
    return `Gemini model not found or unsupported for generateContent. Tried models: ${triedModels}`
  }

  return `${error.message}. Tried models: ${triedModels}`
}

async function callGeminiApiWithModel({
  model,
  systemInstruction,
  prompt,
  responseMimeType,
}) {
  const response = await fetch(`${GEMINI_API_URL}/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': import.meta.env.VITE_GEMINI_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType,
      },
    }),
  })

  if (!response.ok) {
    let details = ''

    try {
      const errorPayload = await response.json()
      details = errorPayload.error?.message ? `: ${errorPayload.error.message}` : ''
    } catch {
      details = ''
    }

    const error = new Error(`Gemini request failed with ${response.status}${details}`)
    error.status = response.status
    error.model = model
    throw error
  }

  return response.json()
}

async function callGeminiApi(options) {
  const modelCandidates = getModelCandidates()
  const attemptedModels = []
  let lastError = null

  for (const model of modelCandidates) {
    attemptedModels.push(model)

    try {
      return await callGeminiApiWithModel({ ...options, model })
    } catch (error) {
      lastError = error

      if (
        !FALLBACK_STATUS_CODES.has(error.status) ||
        model === modelCandidates.at(-1)
      ) {
        error.message = createGeminiErrorMessage({ error, attemptedModels })
        throw error
      }
    }
  }

  throw new Error(createGeminiErrorMessage({ error: lastError, attemptedModels }))
}

export async function generateStory(assetPool) {
  validateAssetPool(assetPool)

  if (shouldUseMocks()) {
    return createLocalMystery(assetPool)
  }

  const payload = await callGeminiApi({
    systemInstruction: STORY_GENERATOR_PROMPT,
    prompt: `Available places:
${JSON.stringify(assetPool.places.map(({ key, label }) => ({ key, label })), null, 2)}

Available characters:
${JSON.stringify(assetPool.characters.map(({ key, label }) => ({ key, label })), null, 2)}

Pick the place first, then choose four fitting character assets from the list.`,
    responseMimeType: 'application/json',
  })

  const story = parseJsonResponse(payload)

  return normalizeGeneratedStory(story, assetPool)
}

export async function askSuspect({ storyData, suspect, question, history }) {
  if (shouldUseMocks()) {
    return createMockInterviewAnswer(suspect, question, storyData)
  }

  const previousQuestions = history
    .map((message) => `${message.speaker}: ${message.text}`)
    .join('\n')

  const payload = await callGeminiApi({
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
  })

  return readOutputText(payload).trim()
}
