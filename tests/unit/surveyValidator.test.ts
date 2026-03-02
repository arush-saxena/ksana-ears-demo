import { SurveyValidator } from '../../src/surveys/surveyValidator';
import {
  VALID_SURVEY_CONFIG,
  INVALID_SURVEY_DUPLICATE_IDS,
  INVALID_SURVEY_BAD_SKIP_LOGIC,
  INVALID_SURVEY_SHORT_INTERVAL,
} from '../fixtures/surveyFixtures';

describe('SurveyValidator', () => {
  let validator: SurveyValidator;

  beforeEach(() => {
    validator = new SurveyValidator();
  });

  describe('validate()', () => {
    it('should accept a valid survey configuration', () => {
      const result = validator.validate(VALID_SURVEY_CONFIG as any);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject surveys with duplicate question IDs', () => {
      const result = validator.validate(INVALID_SURVEY_DUPLICATE_IDS as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'questionId',
          message: expect.stringContaining('Duplicate'),
        })
      );
    });

    it('should reject surveys with skip logic referencing non-existent questions', () => {
      const result = validator.validate(INVALID_SURVEY_BAD_SKIP_LOGIC as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'skipLogic.targetQuestionId',
          message: expect.stringContaining('non-existent'),
        })
      );
    });

    it('should reject surveys with intervals below 30 minutes', () => {
      const result = validator.validate(INVALID_SURVEY_SHORT_INTERVAL as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'schedule.minimumIntervalMinutes',
          message: expect.stringContaining('30 minutes'),
        })
      );
    });

    it('should reject surveys with no questions', () => {
      const result = validator.validate({
        questions: [],
        schedule: { type: 'fixed', minimumIntervalMinutes: 60 },
        expirationMinutes: 10,
      } as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'questions',
          message: expect.stringContaining('at least one question'),
        })
      );
    });

    it('should warn about even-numbered Likert scales', () => {
      const surveyWithEvenLikert = {
        ...VALID_SURVEY_CONFIG,
        questions: [
          {
            questionId: 'q-even-likert',
            type: 'likert' as const,
            text: 'Rate this?',
            required: true,
            options: [
              { optionId: 'o1', label: 'Low', value: 1 },
              { optionId: 'o2', label: 'Med-Low', value: 2 },
              { optionId: 'o3', label: 'Med-High', value: 3 },
              { optionId: 'o4', label: 'High', value: 4 },
            ],
          },
        ],
      };

      const result = validator.validate(surveyWithEvenLikert as any);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('even number'),
        })
      );
    });

    it('should require maxLength for free-text questions', () => {
      const surveyWithFreeTextNoMax = {
        ...VALID_SURVEY_CONFIG,
        questions: [
          {
            questionId: 'q-free-no-max',
            type: 'free-text' as const,
            text: 'Describe your feelings',
            required: false,
            // Missing maxLength
          },
        ],
      };

      const result = validator.validate(surveyWithFreeTextNoMax as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'maxLength',
          message: expect.stringContaining('maxLength'),
        })
      );
    });

    it('should reject skip logic with self-referencing rules', () => {
      const surveyWithSelfRef = {
        ...VALID_SURVEY_CONFIG,
        skipLogic: [
          {
            sourceQuestionId: 'q-001-mood-rating',
            condition: 'equals' as const,
            value: 1,
            targetQuestionId: 'q-001-mood-rating', // Self-reference
          },
        ],
      };

      const result = validator.validate(surveyWithSelfRef as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('self-reference'),
        })
      );
    });
  });
});
