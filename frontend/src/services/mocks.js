// Mock fixtures for StudySpark AI frontend development per 05-API-Spec

import { getDemoPlanDates } from './demoData';

const MOCK_PLAN_DATES = getDemoPlanDates();

export const mockHealth = {
  status: "ok",
  ai_configured: false,
  model: "gemma-4-26b-a4b-it",
  version: "1.0.0"
};

export const mockExplainData = {
  title: "Ohm's Law",
  explanation: "Ohm's law tells us how voltage, current and resistance are connected in a simple circuit.\n\nThink of voltage as the push that moves electric charge, current as the flow of that charge, and resistance as how hard it is for the charge to move. If you push harder, more flows. If the path is narrower, less flows.",
  example: "A 6 V battery connected to a 3 ohm bulb gives a current of 2 amperes, because 6 divided by 3 is 2.",
  key_points: [
    "The formula is V = I x R",
    "Voltage is measured in volts, current in amperes, resistance in ohms",
    "For a fixed resistance, more voltage means more current",
    "It applies to ohmic materials such as most metal wires at constant temperature"
  ],
  quick_recap: "Voltage equals current times resistance."
};

export const mockSummaryData = {
  summary: "Plants use sunlight, water and carbon dioxide to make glucose in their chloroplasts, releasing oxygen as a by-product.",
  key_points: [
    "Happens mainly in chloroplasts",
    "Chlorophyll absorbs sunlight",
    "Inputs: water, carbon dioxide, light",
    "Outputs: glucose and oxygen"
  ],
  key_terms: [
    { term: "Chlorophyll", meaning: "The green pigment that captures light energy" },
    { term: "Chloroplast", meaning: "The cell part where photosynthesis takes place" }
  ]
};

export const mockQuizData = {
  topic: "Photosynthesis",
  questions: [
    {
      id: "q1",
      question: "Which pigment absorbs sunlight during photosynthesis?",
      options: ["Chlorophyll", "Haemoglobin", "Melanin", "Keratin"],
      correct_index: 0,
      explanation: "Chlorophyll is the green pigment in chloroplasts that captures light energy."
    },
    {
      id: "q2",
      question: "Which gas is released as a by-product of photosynthesis?",
      options: ["Carbon dioxide", "Nitrogen", "Oxygen", "Hydrogen"],
      correct_index: 2,
      explanation: "Water is split during the light reactions and oxygen is released."
    },
    {
      id: "q3",
      question: "Where in a plant cell does photosynthesis mainly take place?",
      options: ["Mitochondria", "Nucleus", "Ribosome", "Chloroplast"],
      correct_index: 3,
      explanation: "Chloroplasts contain chlorophyll and the machinery for photosynthesis."
    },
    {
      id: "q4",
      question: "Which raw materials do plants need for photosynthesis?",
      options: ["Oxygen and glucose", "Water and carbon dioxide", "Nitrogen and water", "Glucose and oxygen"],
      correct_index: 1,
      explanation: "Plants take in water through roots and carbon dioxide through leaves."
    },
    {
      id: "q5",
      question: "What food does the plant make during photosynthesis?",
      options: ["Glucose", "Lactose", "Protein", "Cholesterol"],
      correct_index: 0,
      explanation: "The plant builds glucose, which it uses for energy or stores as starch."
    }
  ]
};

export const mockPlanData = {
  summary: "Physics gets priority because its deadline is first; Maths fills the remaining time and revision happens near each deadline.",
  horizon_days: 3,
  truncated: false,
  days: [
    {
      day: 1,
      date: MOCK_PLAN_DATES[0],
      sessions: [
        { id: "d1-s1", subject: "Physics", topic: "Electricity basics", minutes: 90, activity: "learn" },
        { id: "d1-s2", subject: "Maths", topic: "Chapter overview", minutes: 60, activity: "learn" },
        { id: "d1-s3", subject: "Physics", topic: "Practice numericals", minutes: 30, activity: "practice" }
      ]
    },
    {
      day: 2,
      date: MOCK_PLAN_DATES[1],
      sessions: [
        { id: "d2-s1", subject: "Physics", topic: "Magnetism", minutes: 90, activity: "learn" },
        { id: "d2-s2", subject: "Maths", topic: "Problem practice", minutes: 90, activity: "practice" }
      ]
    },
    {
      day: 3,
      date: MOCK_PLAN_DATES[2],
      sessions: [
        { id: "d3-s1", subject: "Physics", topic: "Full revision", minutes: 90, activity: "revise" },
        { id: "d3-s2", subject: "Physics", topic: "Mini test", minutes: 60, activity: "test" },
        { id: "d3-s3", subject: "Maths", topic: "Revision", minutes: 30, activity: "revise" }
      ]
    }
  ],
  tips: [
    "Start with the hardest topic while your energy is high.",
    "Take a 5-minute break after every 45 minutes.",
    "Test yourself at the end of each day for 10 minutes."
  ]
};

export const mockErrors = {
  RATE_LIMITED: {
    ok: false,
    error: {
      code: "RATE_LIMITED",
      message: "The study engine is busy right now. Please wait a moment and try again.",
      retryable: true
    }
  },
  MODEL_UNAVAILABLE: {
    ok: false,
    error: {
      code: "MODEL_UNAVAILABLE",
      message: "Gemma model is currently unavailable. Please verify API key or try later.",
      retryable: true
    }
  },
  VALIDATION_ERROR: {
    ok: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Please enter between 3 and 500 characters.",
      retryable: false,
      details: { field: "topic" }
    }
  }
};
