/**
 * Lightweight loader for scores summary files
 * Used for fast leaderboard rendering without parsing full evaluation details
 */

import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

// Zod schemas for validation
const PillarScoreSchema = z.object({
	score: z.union([z.number(), z.string()]).transform((val) =>
		typeof val === 'string' ? parseFloat(val) : val
	),
	question_count: z.number()
});

const ModelSummarySchema = z.object({
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
	consistency_score: z
		.union([z.number(), z.string(), z.null()])
		.transform((val) => (val === null ? null : typeof val === 'string' ? parseFloat(val) : val))
		.nullable(),
	pillar_scores: z.object({
		'1': PillarScoreSchema,
		'2': PillarScoreSchema,
		'3': PillarScoreSchema,
		'4': PillarScoreSchema
	}),
	total_responses: z.number(),
	result_file: z.string()
});

const ScoresSummarySchema = z.object({
	version: z.string(),
	last_updated: z.string(),
	generated_at: z.string(),
	source_files_count: z.number(),
	leaderboard: z.array(ModelSummarySchema)
});

export type ModelSummary = z.infer<typeof ModelSummarySchema>;
export type ScoresSummary = z.infer<typeof ScoresSummarySchema>;

export class ScoresLoader {
	/**
	 * Load scores summary from a YAML file
	 * @param filePath Path to the scores summary YAML file
	 * @returns Validated scores summary data
	 */
	static load(filePath: string): ScoresSummary | null {
		try {
			const fileContent = readFileSync(filePath, 'utf-8');
			const data = parseYaml(fileContent);

			// Validate structure
			const validated = ScoresSummarySchema.parse(data);

			console.log(
				`✓ Loaded scores summary: ${validated.leaderboard.length} models (version: ${validated.version})`
			);
			return validated;
		} catch (error) {
			if (error instanceof z.ZodError) {
				console.error('❌ Validation error in scores summary file:');
				console.error(error.issues);
				return null;
			}
			// If file doesn't exist or can't be parsed
			console.warn(`⚠️  Could not load scores summary from ${filePath}`);
			return null;
		}
	}

	/**
	 * Convert scores summary to leaderboard format
	 * Compatible with existing leaderboard interface
	 * @param summary Scores summary data
	 * @returns Leaderboard entries
	 */
	static toLeaderboard(summary: ScoresSummary) {
		return summary.leaderboard.map((model) => ({
			id: model.model_id,
			name: model.name,
			version: model.version,
			provider: model.provider,
			overallScore: model.overall_score.toFixed(1),
			weightedScore: model.weighted_score.toFixed(1),
			consistencyScore: model.consistency_score?.toFixed(1) || null,
			totalQuestions: Math.floor(model.total_responses / 2), // Divide by 2 (explicit + implicit)
			testedAt: new Date(model.tested_at)
		}));
	}

	/**
	 * Convert scores summary to pillar scores format
	 * Compatible with existing pillar scores interface
	 * @param summary Scores summary data
	 * @returns Array of pillar scores
	 */
	static toPillarScores(summary: ScoresSummary) {
		const scores: Array<{
			modelId: string;
			pillarId: number;
			avgScore: string;
			questionCount: number;
		}> = [];

		summary.leaderboard.forEach((model) => {
			scores.push(
				{
					modelId: model.model_id,
					pillarId: 1,
					avgScore: model.pillar_scores['1'].score.toFixed(1),
					questionCount: model.pillar_scores['1'].question_count
				},
				{
					modelId: model.model_id,
					pillarId: 2,
					avgScore: model.pillar_scores['2'].score.toFixed(1),
					questionCount: model.pillar_scores['2'].question_count
				},
				{
					modelId: model.model_id,
					pillarId: 3,
					avgScore: model.pillar_scores['3'].score.toFixed(1),
					questionCount: model.pillar_scores['3'].question_count
				},
				{
					modelId: model.model_id,
					pillarId: 4,
					avgScore: model.pillar_scores['4'].score.toFixed(1),
					questionCount: model.pillar_scores['4'].question_count
				}
			);
		});

		return scores;
	}
}
