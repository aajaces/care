/**
 * YAML evaluations loader for reading official benchmark results
 * Replaces database queries for the public leaderboard
 *
 * Supports both single-file and multi-file loading:
 * - Single file: evaluations-alpha.yaml (legacy)
 * - Multiple files: results/*-alpha.yaml (one per model)
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

// Zod schemas for validation
const RubricBreakdownSchema = z.record(
	z.string(),
	z.object({
		score: z.number(),
		max: z.number(),
		feedback: z.string().optional()
	})
);

const QuestionResultSchema = z.object({
	id: z.string(),
	pillar_id: z.number().min(1).max(4),
	truth_hierarchy: z.number().min(1).max(4),
	weight: z.union([z.number(), z.string()]).transform((val) =>
		typeof val === 'string' ? parseFloat(val) : val
	),
	variant: z.string().optional(), // "explicit" or "implicit"
	response: z.string(),
	score: z.union([z.number(), z.string()]).transform((val) =>
		typeof val === 'string' ? parseFloat(val) : val
	),
	max_score: z.union([z.number(), z.string()]).transform((val) =>
		typeof val === 'string' ? parseFloat(val) : val
	),
	rubric_breakdown: RubricBreakdownSchema.optional(),
	judge_reasoning: z.string().optional(),
	evaluated_at: z.string().optional()
});

const PillarScoresSchema = z.object({
	pillar_1: z.union([z.number(), z.string()]).transform((val) =>
		typeof val === 'string' ? parseFloat(val) : val
	),
	pillar_2: z.union([z.number(), z.string()]).transform((val) =>
		typeof val === 'string' ? parseFloat(val) : val
	),
	pillar_3: z.union([z.number(), z.string()]).transform((val) =>
		typeof val === 'string' ? parseFloat(val) : val
	),
	pillar_4: z.union([z.number(), z.string()]).transform((val) =>
		typeof val === 'string' ? parseFloat(val) : val
	)
});

const EvaluationSchema = z.object({
	model: z.string(),
	model_version: z.string(),
	provider: z.string(),
	evaluated_at: z.string(),
	evaluator: z.string().optional(),
	total_score: z.union([z.number(), z.string()]).transform((val) =>
		typeof val === 'string' ? parseFloat(val) : val
	),
	weighted_score: z.union([z.number(), z.string()]).transform((val) =>
		typeof val === 'string' ? parseFloat(val) : val
	).optional(),
	consistency_score: z.union([z.number(), z.string()]).transform((val) =>
		typeof val === 'string' ? parseFloat(val) : val
	).optional(),
	pillar_scores: PillarScoresSchema,
	questions: z.array(QuestionResultSchema)
});

const EvaluationsFileSchema = z.object({
	version: z.string(),
	last_updated: z.string(),
	benchmark_questions: z.string(),
	evaluations: z.array(EvaluationSchema)
});

export type EvaluationResult = z.infer<typeof EvaluationSchema>;
export type QuestionResult = z.infer<typeof QuestionResultSchema>;
export type EvaluationsData = z.infer<typeof EvaluationsFileSchema>;

export class EvaluationsLoader {
	/**
	 * Load evaluations from a YAML file
	 * @param filePath Path to the evaluations YAML file
	 * @returns Validated evaluations data
	 */
	static load(filePath: string): EvaluationsData {
		try {
			const fileContent = readFileSync(filePath, 'utf-8');
			const data = parseYaml(fileContent);

			// Validate structure
			const validated = EvaluationsFileSchema.parse(data);

			console.log(
				`✓ Loaded ${validated.evaluations.length} evaluations from ${filePath} (version: ${validated.version})`
			);
			return validated;
		} catch (error) {
			if (error instanceof z.ZodError) {
				console.error('❌ Validation error in evaluations file:');
				console.error(error.issues);
				throw new Error(`YAML validation failed: ${error.message}`);
			}
			// If file doesn't exist or is empty, return empty structure
			console.warn(`⚠️  No evaluations file found at ${filePath}, returning empty data`);
			return {
				version: 'unknown',
				last_updated: new Date().toISOString(),
				benchmark_questions: 'unknown',
				evaluations: []
			};
		}
	}

	/**
	 * Load evaluations from multiple YAML files in a directory
	 * Supports the new per-model file structure: results/*-{version}.yaml
	 * @param resultsDir Path to the results directory
	 * @param version Benchmark version (e.g., 'alpha')
	 * @returns Merged evaluations data
	 */
	static loadAll(resultsDir: string, version: string = 'alpha'): EvaluationsData {
		try {
			if (!existsSync(resultsDir)) {
				console.warn(`⚠️  Results directory not found: ${resultsDir}`);
				return {
					version,
					last_updated: new Date().toISOString(),
					benchmark_questions: `questions-${version}.yaml`,
					evaluations: []
				};
			}

			// Read all files in the directory
			const files = readdirSync(resultsDir).filter((file) => file.endsWith(`-${version}.yaml`));

			if (files.length === 0) {
				console.warn(`⚠️  No evaluation files found for version "${version}" in ${resultsDir}`);
				return {
					version,
					last_updated: new Date().toISOString(),
					benchmark_questions: `questions-${version}.yaml`,
					evaluations: []
				};
			}

			console.log(`📁 Found ${files.length} evaluation file(s) for version "${version}"`);

			// Load and merge all evaluations
			const allEvaluations: EvaluationResult[] = [];
			let latestUpdate = '';

			for (const file of files) {
				const filePath = resolve(resultsDir, file);
				try {
					const fileContent = readFileSync(filePath, 'utf-8');
					const data = parseYaml(fileContent);

					// Validate as single evaluation (not wrapped in evaluations array)
					const evaluation = EvaluationSchema.parse(data);
					allEvaluations.push(evaluation);

					// Track latest update
					if (evaluation.evaluated_at > latestUpdate) {
						latestUpdate = evaluation.evaluated_at;
					}

					console.log(`  ✓ Loaded ${file} (${evaluation.questions.length} questions)`);
				} catch (error) {
					console.error(`  ❌ Error loading ${file}:`, error);
					// Continue loading other files
				}
			}

			console.log(`✅ Successfully loaded ${allEvaluations.length} evaluation(s)`);

			return {
				version,
				last_updated: latestUpdate || new Date().toISOString(),
				benchmark_questions: `questions-${version}.yaml`,
				evaluations: allEvaluations
			};
		} catch (error) {
			console.error('❌ Error loading evaluations:', error);
			return {
				version,
				last_updated: new Date().toISOString(),
				benchmark_questions: `questions-${version}.yaml`,
				evaluations: []
			};
		}
	}

	/**
	 * Calculate weighted score for an evaluation
	 * @param evaluation The evaluation to calculate score for
	 * @returns Weighted score (0-100)
	 */
	static calculateWeightedScore(evaluation: EvaluationResult): number {
		let totalWeightedScore = 0;
		let totalWeight = 0;

		for (const question of evaluation.questions) {
			const weight = question.weight * question.truth_hierarchy;
			totalWeightedScore += (question.score / question.max_score) * 100 * weight;
			totalWeight += weight;
		}

		return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
	}

	/**
	 * Get leaderboard data sorted by weighted score
	 * @param data Evaluations data
	 * @returns Leaderboard entries sorted by score
	 */
	static getLeaderboard(data: EvaluationsData) {
		return data.evaluations
			.map((evaluation, idx) => ({
				id: `eval-${idx}`,
				name: evaluation.model,
				version: evaluation.model_version,
				provider: evaluation.provider,
				overallScore: evaluation.total_score.toFixed(1),
				weightedScore: this.calculateWeightedScore(evaluation).toFixed(1),
				totalQuestions: evaluation.questions.length,
				testedAt: new Date(evaluation.evaluated_at)
			}))
			.sort((a, b) => parseFloat(b.weightedScore) - parseFloat(a.weightedScore));
	}

	/**
	 * Get pillar scores for all models
	 * @param data Evaluations data
	 * @returns Array of pillar scores
	 */
	static getPillarScores(data: EvaluationsData) {
		const scores: Array<{
			modelId: string;
			pillarId: number;
			avgScore: string;
			questionCount: number;
		}> = [];

		data.evaluations.forEach((evaluation, idx) => {
			const modelId = `eval-${idx}`;

			// Count questions per pillar
			const pillarQuestionCounts: Record<number, number> = {};
			evaluation.questions.forEach((q) => {
				pillarQuestionCounts[q.pillar_id] = (pillarQuestionCounts[q.pillar_id] || 0) + 1;
			});

			scores.push(
				{
					modelId,
					pillarId: 1,
					avgScore: evaluation.pillar_scores.pillar_1.toFixed(1),
					questionCount: pillarQuestionCounts[1] || 0
				},
				{
					modelId,
					pillarId: 2,
					avgScore: evaluation.pillar_scores.pillar_2.toFixed(1),
					questionCount: pillarQuestionCounts[2] || 0
				},
				{
					modelId,
					pillarId: 3,
					avgScore: evaluation.pillar_scores.pillar_3.toFixed(1),
					questionCount: pillarQuestionCounts[3] || 0
				},
				{
					modelId,
					pillarId: 4,
					avgScore: evaluation.pillar_scores.pillar_4.toFixed(1),
					questionCount: pillarQuestionCounts[4] || 0
				}
			);
		});

		return scores;
	}
}
