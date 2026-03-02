import { SurveyConfig, SurveyQuestion, SkipLogicRule } from './surveyService';
import { Logger } from '../utils/logger';

const logger = new Logger('SurveyValidator');

/** Validation result */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  questionId?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
}

/**
 * Validates EMA survey configurations for correctness and consistency.
 * Ensures skip logic is valid, questions are well-formed, and timing is correct.
 */
export class SurveyValidator {

  /** Validate a complete survey configuration */
  validate(config: SurveyConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate questions
    this.validateQuestions(config.questions, errors, warnings);

    // Validate skip logic
    if (config.skipLogic) {
      this.validateSkipLogic(config.skipLogic, config.questions, errors);
    }

    // Validate schedule
    this.validateSchedule(config.schedule, errors, warnings);

    // Validate expiration
    if (!config.expirationMinutes || config.expirationMinutes <= 0) {
      errors.push({ field: 'expirationMinutes', message: 'Expiration must be positive' });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /** Validate individual questions */
  private validateQuestions(
    questions: SurveyQuestion[],
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!questions || questions.length === 0) {
      errors.push({ field: 'questions', message: 'Survey must have at least one question' });
      return;
    }

    const questionIds = new Set<string>();

    for (const q of questions) {
      // Check for unique questionId
      if (questionIds.has(q.questionId)) {
        errors.push({
          field: 'questionId',
          message: `Duplicate questionId: ${q.questionId}`,
          questionId: q.questionId,
        });
      }
      questionIds.add(q.questionId);

      // Check question text
      if (!q.text || q.text.trim().length === 0) {
        errors.push({
          field: 'text',
          message: 'Question text cannot be empty',
          questionId: q.questionId,
        });
      }

      if (q.text && q.text.length > 500) {
        errors.push({
          field: 'text',
          message: 'Question text exceeds 500 character limit',
          questionId: q.questionId,
        });
      }

      // Validate Likert scales
      if (q.type === 'likert' && q.options) {
        if (q.options.length % 2 === 0) {
          warnings.push({
            field: 'options',
            message: `Likert scale for ${q.questionId} has even number of options (${q.options.length}). Odd numbers (3, 5, 7) are recommended.`,
          });
        }
      }

      // Validate free-text maxLength
      if (q.type === 'free-text' && !q.maxLength) {
        errors.push({
          field: 'maxLength',
          message: 'Free-text questions must define maxLength',
          questionId: q.questionId,
        });
      }

      // Check for unique option IDs within a question
      if (q.options) {
        const optionIds = new Set<string>();
        for (const opt of q.options) {
          if (optionIds.has(opt.optionId)) {
            errors.push({
              field: 'optionId',
              message: `Duplicate optionId '${opt.optionId}' in question ${q.questionId}`,
              questionId: q.questionId,
            });
          }
          optionIds.add(opt.optionId);
        }
      }
    }
  }

  /** Validate skip logic rules */
  private validateSkipLogic(
    rules: SkipLogicRule[],
    questions: SurveyQuestion[],
    errors: ValidationError[]
  ): void {
    const validIds = new Set(questions.map(q => q.questionId));

    for (const rule of rules) {
      if (!validIds.has(rule.sourceQuestionId)) {
        errors.push({
          field: 'skipLogic.sourceQuestionId',
          message: `Skip logic references non-existent source question: ${rule.sourceQuestionId}`,
        });
      }

      if (!validIds.has(rule.targetQuestionId)) {
        errors.push({
          field: 'skipLogic.targetQuestionId',
          message: `Skip logic references non-existent target question: ${rule.targetQuestionId}`,
        });
      }

      // Check for self-referencing rules (potential infinite loop)
      if (rule.sourceQuestionId === rule.targetQuestionId) {
        errors.push({
          field: 'skipLogic',
          message: `Skip logic rule creates self-reference on question: ${rule.sourceQuestionId}`,
        });
      }
    }
  }

  /** Validate survey schedule */
  private validateSchedule(
    schedule: SurveyConfig['schedule'],
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!schedule) {
      errors.push({ field: 'schedule', message: 'Survey schedule is required' });
      return;
    }

    if (schedule.minimumIntervalMinutes < 30) {
      errors.push({
        field: 'schedule.minimumIntervalMinutes',
        message: 'Minimum interval between surveys must be at least 30 minutes',
      });
    }

    if (schedule.startTime && schedule.endTime) {
      const start = new Date(schedule.startTime);
      const end = new Date(schedule.endTime);
      if (end <= start) {
        errors.push({
          field: 'schedule',
          message: 'Survey endTime must be after startTime',
        });
      }
    }
  }
}
