/**
 * Test fixture: Anonymized survey configurations.
 * ⚠️  NEVER use real participant data in test fixtures.
 * All IDs, names, and content are synthetic.
 */

export const VALID_SURVEY_CONFIG = {
  title: 'Daily Mood Assessment',
  questions: [
    {
      questionId: 'q-001-mood-rating',
      type: 'likert' as const,
      text: 'How would you rate your overall mood right now?',
      required: true,
      options: [
        { optionId: 'opt-1', label: 'Very Low', value: 1 },
        { optionId: 'opt-2', label: 'Low', value: 2 },
        { optionId: 'opt-3', label: 'Neutral', value: 3 },
        { optionId: 'opt-4', label: 'Good', value: 4 },
        { optionId: 'opt-5', label: 'Very Good', value: 5 },
      ],
    },
    {
      questionId: 'q-002-sleep-quality',
      type: 'likert' as const,
      text: 'How well did you sleep last night?',
      required: true,
      options: [
        { optionId: 'opt-a', label: 'Very Poorly', value: 1 },
        { optionId: 'opt-b', label: 'Poorly', value: 2 },
        { optionId: 'opt-c', label: 'Average', value: 3 },
        { optionId: 'opt-d', label: 'Well', value: 4 },
        { optionId: 'opt-e', label: 'Very Well', value: 5 },
      ],
    },
    {
      questionId: 'q-003-anxiety-level',
      type: 'slider' as const,
      text: 'On a scale of 0-100, how anxious do you feel right now?',
      required: true,
      sliderMin: 0,
      sliderMax: 100,
    },
    {
      questionId: 'q-004-activities',
      type: 'multiple-choice' as const,
      text: 'Which activities have you done today? (select all that apply)',
      required: false,
      options: [
        { optionId: 'act-1', label: 'Exercise', value: 'exercise' },
        { optionId: 'act-2', label: 'Socializing', value: 'social' },
        { optionId: 'act-3', label: 'Work/School', value: 'work' },
        { optionId: 'act-4', label: 'Relaxation', value: 'relax' },
        { optionId: 'act-5', label: 'None of the above', value: 'none' },
      ],
    },
    {
      questionId: 'q-005-notes',
      type: 'free-text' as const,
      text: 'Any additional notes about how you are feeling?',
      required: false,
      maxLength: 500,
    },
  ],
  schedule: {
    type: 'random' as const,
    timesPerDay: 3,
    startTime: '2026-03-01T08:00:00Z',
    endTime: '2026-03-01T22:00:00Z',
    minimumIntervalMinutes: 60,
  },
  skipLogic: [
    {
      sourceQuestionId: 'q-001-mood-rating',
      condition: 'less-than' as const,
      value: 3,
      targetQuestionId: 'q-003-anxiety-level',
    },
  ],
  expirationMinutes: 15,
};

export const INVALID_SURVEY_DUPLICATE_IDS = {
  title: 'Bad Survey',
  questions: [
    {
      questionId: 'q-duplicate',
      type: 'likert' as const,
      text: 'Question A',
      required: true,
      options: [
        { optionId: 'opt-1', label: 'Low', value: 1 },
        { optionId: 'opt-2', label: 'Med', value: 2 },
        { optionId: 'opt-3', label: 'High', value: 3 },
      ],
    },
    {
      questionId: 'q-duplicate', // BUG: duplicate ID
      type: 'free-text' as const,
      text: 'Question B',
      required: false,
      maxLength: 200,
    },
  ],
  schedule: {
    type: 'fixed' as const,
    timesPerDay: 1,
    startTime: '2026-03-01T09:00:00Z',
    endTime: '2026-03-01T21:00:00Z',
    minimumIntervalMinutes: 30,
  },
  expirationMinutes: 10,
};

export const INVALID_SURVEY_BAD_SKIP_LOGIC = {
  title: 'Bad Skip Logic Survey',
  questions: [
    {
      questionId: 'q-100',
      type: 'yes-no' as const,
      text: 'Do you feel safe?',
      required: true,
    },
  ],
  schedule: {
    type: 'fixed' as const,
    timesPerDay: 1,
    minimumIntervalMinutes: 30,
  },
  skipLogic: [
    {
      sourceQuestionId: 'q-100',
      condition: 'equals' as const,
      value: 'no',
      targetQuestionId: 'q-nonexistent', // BUG: references non-existent question
    },
  ],
  expirationMinutes: 10,
};

export const INVALID_SURVEY_SHORT_INTERVAL = {
  title: 'Too Frequent Survey',
  questions: [
    {
      questionId: 'q-200',
      type: 'likert' as const,
      text: 'How are you?',
      required: true,
      options: [
        { optionId: 'o1', label: 'Bad', value: 1 },
        { optionId: 'o2', label: 'OK', value: 2 },
        { optionId: 'o3', label: 'Good', value: 3 },
      ],
    },
  ],
  schedule: {
    type: 'random' as const,
    timesPerDay: 10,
    minimumIntervalMinutes: 10, // BUG: below 30min minimum
  },
  expirationMinutes: 5,
};
