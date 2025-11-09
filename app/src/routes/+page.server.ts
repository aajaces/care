import type { PageServerLoad } from './$types';
import { pillars } from '$lib/server/db/schema';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { transformModelData } from '$lib/data/model-data';

// Import data files using Vite's raw import (ensures they're bundled in build)
import scoresRaw from '$lib/data/scores-alpha.yaml?raw';
import costsRaw from '$lib/data/costs.yaml?raw';

// Schema for scores summary
const ModelSummarySchema = z.object({
	rank: z.number(),
	model_id: z.string(),
	model_name: z.string(),
	version: z.string(),
	provider: z.string(),
	overall_score: z.union([z.number(), z.string()]).transform((val) =>
		typeof val === 'string' ? parseFloat(val) : val
	),
	weighted_score: z.union([z.number(), z.string()]).transform((val) =>
		typeof val === 'string' ? parseFloat(val) : val
	),
	consistency_score: z.union([z.number(), z.string()]).transform((val) =>
		typeof val === 'string' ? parseFloat(val) : val
	).optional(),
	total_responses: z.number(),
	evaluated_at: z.string(),
	pillar_scores: z.array(z.object({
		pillar_id: z.number(),
		score: z.union([z.number(), z.string()]).transform((val) =>
			typeof val === 'string' ? parseFloat(val) : val
		),
		question_count: z.number()
	}))
});

const ScoresSummarySchema = z.object({
	version: z.string(),
	last_updated: z.string(),
	generated_at: z.string().optional(),
	source_files_count: z.number().optional(),
	leaderboard: z.array(z.object({
		rank: z.number(),
		model_id: z.string(),
		name: z.string(),
		version: z.string(),
		provider: z.string(),
		tested_at: z.string(),
		overall_score: z.union([z.number(), z.string()]).transform((val) =>
			typeof val === 'string' ? parseFloat(val) : val
		),
		weighted_score: z.union([z.number(), z.string()]).transform((val) =>
			typeof val === 'string' ? parseFloat(val) : val
		),
		consistency_score: z.union([z.number(), z.string()]).transform((val) =>
			typeof val === 'string' ? parseFloat(val) : val
		).optional(),
		total_responses: z.number(),
		pillar_scores: z.record(z.string(), z.object({
			score: z.union([z.number(), z.string()]).transform((val) =>
				typeof val === 'string' ? parseFloat(val) : val
			),
			question_count: z.number()
		})),
		result_file: z.string().optional()
	}))
});

const CostsSchema = z.object({
	version: z.string(),
	model_costs: z.array(z.object({
		model_id: z.string(),
		cost_per_1m_input_tokens: z.union([z.number(), z.string()]).transform((val) =>
			typeof val === 'string' ? parseFloat(val) : val
		),
		cost_per_1m_output_tokens: z.union([z.number(), z.string()]).transform((val) =>
			typeof val === 'string' ? parseFloat(val) : val
		)
	}))
});

export const load: PageServerLoad = async () => {
	// Parse scores summary (fast path)
	const scoresSummary = ScoresSummarySchema.parse(parseYaml(scoresRaw));

	// Convert to leaderboard format
	const leaderboard = scoresSummary.leaderboard.map((model) => ({
		id: model.model_id,
		name: model.name,
		version: model.version,
		provider: model.provider,
		overallScore: model.overall_score.toFixed(1),
		weightedScore: model.weighted_score.toFixed(1),
		totalQuestions: model.total_responses,
		testedAt: new Date(model.tested_at)
	}));

	// Convert to pillar scores format
	const allPillarScores = scoresSummary.leaderboard.flatMap((model) =>
		Object.entries(model.pillar_scores).map(([pillar_id, ps]) => ({
			modelId: model.model_id,
			pillarId: parseInt(pillar_id),
			avgScore: ps.score.toFixed(1),
			questionCount: ps.question_count
		}))
	);

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
	const costsData = CostsSchema.parse(parseYaml(costsRaw));
	const modelData = transformModelData(scoresSummary, costsData);
	console.log(`✓ Loaded ${modelData.length} model data points for chart`);

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
