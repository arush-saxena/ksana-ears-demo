import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../utils/database';
import { SecureStorageService } from '../utils/secureStorage';
import { TimeService } from '../utils/timeService';
import { Logger } from '../utils/logger';

const logger = new Logger('SurveyService');

/** Survey configuration interface */
export interface SurveyConfig {
  id?: string;
  studyId: string;
  title: string;
  questions: SurveyQuestion[];
  schedule: SurveySchedule;
  skipLogic?: SkipLogicRule[];
  expirationMinutes: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Individual survey question */
export interface SurveyQuestion {
  questionId: string;
  type: 'likert' | 'multiple-choice' | 'free-text' | 'slider' | 'yes-no';
  text: string;
  required: boolean;
  options?: QuestionOption[];
  maxLength?: number;
  sliderMin?: number;
  sliderMax?: number;
}

/** Question option for multiple-choice/likert */
export interface QuestionOption {
  optionId: string;
  label: string;
  value: number | string;
}

/** Survey scheduling configuration */
export interface SurveySchedule {
  type: 'fixed' | 'random' | 'event-triggered';
  timesPerDay?: number;
  startTime?: string;  // UTC ISO 8601
  endTime?: string;    // UTC ISO 8601
  triggerEvent?: string;
  minimumIntervalMinutes: number;
}

/** Skip logic rule */
export interface SkipLogicRule {
  sourceQuestionId: string;
  condition: 'equals' | 'greater-than' | 'less-than' | 'contains';
  value: string | number;
  targetQuestionId: string;
}

/** Survey response from a participant */
export interface SurveyResponse {
  id?: string;
  surveyId: string;
  participantId: string;
  answers: Record<string, string | number>;
  startTimestamp: string;
  endTimestamp: string;
  completionStatus: 'complete' | 'partial' | 'expired';
}

/**
 * Service for managing EMA survey configurations and responses.
 * All response data is PHI and must be encrypted.
 */
export class SurveyService {
  private db = DatabaseService;
  private storage = new SecureStorageService();

  /** Get all active surveys for a study */
  async getActiveByStudy(studyId: string): Promise<SurveyConfig[]> {
    const result = await this.db.query(
      'SELECT * FROM surveys WHERE study_id = $1 AND is_active = true ORDER BY created_at DESC',
      [studyId]
    );
    return result.rows;
  }

  /** Create a new survey configuration */
  async create(studyId: string, config: SurveyConfig): Promise<SurveyConfig> {
    const survey: SurveyConfig = {
      ...config,
      id: uuidv4(),
      studyId,
      createdAt: TimeService.utcNow(),
      updatedAt: TimeService.utcNow(),
    };

    await this.db.query(
      'INSERT INTO surveys (id, study_id, title, config, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [survey.id, studyId, survey.title, JSON.stringify(survey), survey.createdAt, survey.updatedAt]
    );

    logger.info('Survey configuration created', { surveyId: survey.id, studyId });
    return survey;
  }

  /**
   * Submit a survey response.
   * ⚠️  PHI: Response data is encrypted before storage.
   */
  async submitResponse(response: SurveyResponse): Promise<SurveyResponse> {
    const saved: SurveyResponse = {
      ...response,
      id: uuidv4(),
      completionStatus: this.determineCompletionStatus(response),
    };

    // Encrypt and store the response
    await this.storage.encryptAndStore(
      `responses/${saved.surveyId}/${saved.id}.json`,
      JSON.stringify(saved)
    );

    // Store metadata (non-PHI) in the database for querying
    await this.db.query(
      'INSERT INTO survey_responses (id, survey_id, completion_status, submitted_at) VALUES ($1, $2, $3, $4)',
      [saved.id, saved.surveyId, saved.completionStatus, TimeService.utcNow()]
    );

    return saved;
  }

  /** Get de-identified completion rates for a survey */
  async getCompletionRates(surveyId: string): Promise<Record<string, number>> {
    const result = await this.db.query(
      `SELECT completion_status, COUNT(*)::int as count 
       FROM survey_responses 
       WHERE survey_id = $1 
       GROUP BY completion_status`,
      [surveyId]
    );

    const rates: Record<string, number> = {};
    for (const row of result.rows) {
      rates[row.completion_status] = row.count;
    }
    return rates;
  }

  /** Determine if a survey response is complete or partial */
  private determineCompletionStatus(response: SurveyResponse): 'complete' | 'partial' | 'expired' {
    if (!response.endTimestamp) return 'partial';
    // TODO: Check against survey expiration window
    return 'complete';
  }
}
