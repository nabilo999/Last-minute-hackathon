import { createMockInterviewAnswer, mockMystery } from '../data/mockMystery.js'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const DEFAULT_MODEL = 'gemini-3.7-flash'

const STORY_GENERATOR_PROMPT = `You are a murder mystery story engine for a short web game.
Return JSON only with this exact shape:
{
  "setting": { "title": string, "description": string },
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
Pick 4 distinct asset keys from the provided list. Mark exactly 1 suspect as the killer.
Give the killer a subtle logical contradiction in their timeline or motive.
Give the other 3 suspects shady but innocent secrets so everyone seems suspicious.`

function shouldUseMocks() {
  return import.meta.env.VITE_USE_MOCKS !== 'false' || !import.meta.env.VITE_GEMINI_API_KEY
}

function getModel() {
  return import.meta.env.VITE_GEMINI_MODEL || DEFAULT_MODEL
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

async function callGeminiApi({ systemInstruction, prompt, responseMimeType }) {
  const model = getModel()
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
    throw new Error(`Gemini request failed with ${response.status}`)
  }

  return response.json()
}

export async function generateStory(assetKeys) {
  if (shouldUseMocks()) {
    return structuredClone(mockMystery)
  }

  const payload = await callGeminiApi({
    systemInstruction: STORY_GENERATOR_PROMPT,
    prompt: `Available visual asset keys: ${JSON.stringify(assetKeys)}`,
    responseMimeType: 'application/json',
  })

  const story = parseJsonResponse(payload)

  return {
    ...story,
    suspects: story.suspects.map((suspect) => ({
      ...suspect,
      isEliminated: false,
    })),
  }
}

export async function askSuspect({ storyData, suspect, question, history }) {
  if (shouldUseMocks()) {
    return createMockInterviewAnswer(suspect, question)
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
