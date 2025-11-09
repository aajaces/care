import type { PageServerLoad } from './$types';
import { pillars } from '$lib/server/db/schema';
import { EvaluationsLoader } from '$lib/server/eval/evaluations-loader';
import { ScoresLoader } from '$lib/server/eval/scores-loader';
import { CostsLoader } from '$lib/server/eval/costs-loader';
import { transformModelData } from '$lib/data/model-data';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Paths for evaluation results
const SCORES_SUMMARY_PATH = resolve(process.cwd(), '../data/scores-alpha.yaml');
const COSTS_PATH = resolve(process.cwd(), '../data/costs.yaml');
const RESULTS_DIR = resolve(process.cwd(), '../data/results');
const LEGACY_EVALUATIONS_PATH = resolve(process.cwd(), '../data/evaluations-alpha.yaml');

export const load: PageServerLoad = async () => {
	// Load leaderboard data from YAML files (source of truth for public leaderboard)
	// Try fast path (scores summary) first, then fall back to full evaluation loading
	let leaderboard;
	let allPillarScores;
	let scoresSummary = null;

	if (existsSync(SCORES_SUMMARY_PATH)) {
		// FAST PATH: Load pre-computed scores summary (3-8x faster)
		scoresSummary = ScoresLoader.load(SCORES_SUMMARY_PATH);
		if (scoresSummary) {
			leaderboard = ScoresLoader.toLeaderboard(scoresSummary);
			allPillarScores = ScoresLoader.toPillarScores(scoresSummary);
			console.log('✓ Using fast path: scores-alpha.yaml');
		}
	}

	// Fallback to full evaluation loading (backward compatible)
	if (!leaderboard) {
		console.log('⚠️  Falling back to full evaluation loading');
		let evaluationsData;

		if (existsSync(RESULTS_DIR)) {
			// New structure: one file per model in results/ directory
			evaluationsData = EvaluationsLoader.loadAll(RESULTS_DIR, 'alpha');
		} else if (existsSync(LEGACY_EVALUATIONS_PATH)) {
			// Legacy structure: single evaluations-alpha.yaml file
			evaluationsData = EvaluationsLoader.load(LEGACY_EVALUATIONS_PATH);
		} else {
			// No evaluations found
			evaluationsData = {
				version: 'alpha',
				last_updated: new Date().toISOString(),
				benchmark_questions: 'questions-alpha.yaml',
				evaluations: []
			};
		}

		leaderboard = EvaluationsLoader.getLeaderboard(evaluationsData);
		allPillarScores = EvaluationsLoader.getPillarScores(evaluationsData);
	}

	// Get running evaluations from database (for live progress tracking only)
	// Skip if DATABASE_URL not configured (e.g., in YAML-only mode)
	let runningEvaluations: any[] = [];
	let allPillars: any[] = [];

	if (process.env.DATABASE_URL) {
		try {
			const { db } = await import('$lib/server/db');
			const { models, evaluationRuns } = await import('$lib/server/db/schema');
			const { desc, eq } = await import('drizzle-orm');

			runningEvaluations = await db
				.select({
					id: evaluationRuns.id,
					modelId: models.id,
					modelName: models.name,
					modelVersion: models.version,
					modelProvider: models.provider,
					status: evaluationRuns.status,
					currentQuestion: evaluationRuns.currentQuestion,
					totalQuestions: evaluationRuns.totalQuestions,
					currentQuestionId: evaluationRuns.currentQuestionId,
					currentVariant: evaluationRuns.currentVariant,
					responsesCompleted: evaluationRuns.responsesCompleted,
					averageScore: evaluationRuns.averageScore,
					estimatedTimeRemaining: evaluationRuns.estimatedTimeRemaining,
					startedAt: evaluationRuns.startedAt
				})
				.from(evaluationRuns)
				.leftJoin(models, eq(evaluationRuns.modelId, models.id))
				.where(eq(evaluationRuns.status, 'running'))
				.orderBy(desc(evaluationRuns.startedAt));

			// Get all pillars (static reference data)
			allPillars = await db.select().from(pillars).orderBy(pillars.orderNum);
		} catch (error) {
			console.warn('⚠️  Database not available, skipping live evaluation tracking');
		}
	} else {
		console.log('ℹ️  DATABASE_URL not set - running in YAML-only mode');
	}

	// Fallback: Provide static pillar data if database is unavailable
	if (allPillars.length === 0) {
		allPillars = [
			{
				id: 1,
				orderNum: 1,
				name: 'Faith & Reason',
				description: 'The relationship between faith and reason, divine revelation, and natural theology'
			},
			{
				id: 2,
				orderNum: 2,
				name: 'Human Life & Dignity',
				description: 'The sanctity of human life, dignity of the person, and moral issues'
			},
			{
				id: 3,
				orderNum: 3,
				name: 'Love & Sexuality',
				description: 'Marriage, family, human sexuality, and the theology of the body'
			},
			{
				id: 4,
				orderNum: 4,
				name: 'Social Order',
				description: 'Social justice, common good, subsidiarity, and solidarity'
			}
		];
	}

	// Load model data for cost/performance chart
	let modelData: any[] = [];
	if (scoresSummary && existsSync(COSTS_PATH)) {
		const costsData = CostsLoader.load(COSTS_PATH);
		if (costsData) {
			modelData = transformModelData(scoresSummary, costsData);
			console.log(`✓ Loaded ${modelData.length} model data points for chart`);
		}
	}

	return {
		leaderboard,
		runningEvaluations: runningEvaluations.map((run) => ({
			...run,
			progressPercent:
				run.totalQuestions && run.totalQuestions > 0
					? Math.round(((run.responsesCompleted || 0) / (run.totalQuestions * 2)) * 100)
					: 0
		})),
		pillars: allPillars,
		pillarScores: allPillarScores,
		modelData
	};
};
