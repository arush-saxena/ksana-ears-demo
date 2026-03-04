import { Router, Request, Response, NextFunction } from 'express';
import { SurveyService } from '../../surveys/surveyService';
import { SurveyValidator } from '../../surveys/surveyValidator';
import { Logger } from '../../utils/logger';
import { APIError } from '../errors';

const router = Router();
const logger = new Logger('SurveyRoutes');
const surveyService = new SurveyService();
const validator = new SurveyValidator();

/**
 * GET /api/v1/surveys/:studyId
 * Retrieve all active survey configurations for a study.
 */
router.get('/:studyId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studyId } = req.params;
    const surveys = await surveyService.getActiveByStudy(studyId);

    logger.info(`Retrieved ${surveys.length} surveys for study`, { studyId });
    res.json({ data: surveys });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/surveys/:studyId
 * Create a new survey configuration for a study.
 * Validates survey schema before persisting.
 */
router.post('/:studyId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studyId } = req.params;
    const surveyConfig = req.body;

    // Validate survey configuration
    const validation = validator.validate(surveyConfig);
    if (!validation.isValid) {
      throw new APIError(400, 'Invalid survey configuration', validation.errors);
    }

    const survey = await surveyService.create(studyId, surveyConfig);
    logger.info('Survey created', { studyId, surveyId: survey.id });
    res.status(201).json({ data: survey });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/surveys/:surveyId/responses
 * Submit a participant's survey response.
 * ⚠️  This endpoint handles PHI — responses are encrypted before storage.
 */
router.post('/:surveyId/responses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { surveyId } = req.params;
    const { participantId, answers, startTimestamp, endTimestamp } = req.body;

    // Log survey response submission (PHI fields auto-redacted by Logger)
    logger.info('Survey response submitted', { surveyId });

    const response = await surveyService.submitResponse({
      surveyId,
      participantId,
      answers,
      startTimestamp,
      endTimestamp,
    });

    res.status(201).json({ data: { responseId: response.id } });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/surveys/:surveyId/completion-rates
 * Get de-identified completion rate statistics for a survey.
 */
router.get('/:surveyId/completion-rates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { surveyId } = req.params;
    const rates = await surveyService.getCompletionRates(surveyId);

    res.json({ data: rates });
  } catch (error) {
    next(error);
  }
});

export const surveyRoutes = router;
