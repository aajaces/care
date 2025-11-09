import type { PageServerLoad } from './$types';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import type { Question } from '$lib/server/eval/types';

// Import data files using Vite's raw import (ensures they're bundled in build)
import questionsRaw from '$lib/data/questions-alpha.yaml?raw';
import claude3HaikuRaw from '$lib/data/results/claude-3-haiku-alpha.yaml?raw';
import gpt4Raw from '$lib/data/results/gpt-4-alpha.yaml?raw';
import hermes4Raw from '$lib/data/results/hermes-4-405b-alpha.yaml?raw';
import magisterium1Raw from '$lib/data/results/magisterium-1-alpha.yaml?raw';

// Schema for validation (simplified from EvaluationsLoader)
const EvaluationSchema = z.object({
	model: z.string(),
	model_version: z.string(),
	provider: z.string(),
	evaluated_at: z.string(),
	total_score: z.union([z.number(), z.string()]).transform((val) =>
		typeof val === 'string' ? parseFloat(val) : val
	),
	weighted_score: z.union([z.number(), z.string()]).transform((val) =>
		typeof val === 'string' ? parseFloat(val) : val
	).optional(),
	pillar_scores: z.object({
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
	}),
	questions: z.array(z.object({
		id: z.string(),
		pillar_id: z.number(),
		truth_hierarchy: z.number(),
		weight: z.union([z.number(), z.string()]).transform((val) =>
			typeof val === 'string' ? parseFloat(val) : val
		),
		variant: z.string().optional(),
		response: z.string(),
		score: z.union([z.number(), z.string()]).transform((val) =>
			typeof val === 'string' ? parseFloat(val) : val
		),
		max_score: z.union([z.number(), z.string()]).transform((val) =>
			typeof val === 'string' ? parseFloat(val) : val
		),
		rubric_breakdown: z.record(z.string(), z.object({
			score: z.number(),
			max: z.number(),
			feedback: z.string().optional()
		})).optional(),
		judge_reasoning: z.string().optional(),
		evaluated_at: z.string().optional()
	}))
});

export const load: PageServerLoad = async () => {
	// Parse questions
	const questionsData = parseYaml(questionsRaw);
	const questions = questionsData.questions as Question[];

	// Parse all evaluation files
	const evaluations = [
		EvaluationSchema.parse(parseYaml(claude3HaikuRaw)),
		EvaluationSchema.parse(parseYaml(gpt4Raw)),
		EvaluationSchema.parse(parseYaml(hermes4Raw)),
		EvaluationSchema.parse(parseYaml(magisterium1Raw))
	];

	const evaluationsData = {
		version: 'alpha',
		last_updated: new Date().toISOString(),
		benchmark_questions: 'questions-alpha.yaml',
		evaluations
	};

	// Transform data for the explorer
	const results = evaluationsData.evaluations.flatMap((evaluation) =>
		evaluation.questions.map((q) => {
			// Find matching question for full text
			const fullQuestion = questions.find((fq) => fq.id === q.id);

			return {
				questionId: q.id,
				questionText: fullQuestion?.explicit_text || '',
				implicitText: fullQuestion?.implicit_text || '',
				referenceAnswer: fullQuestion?.reference_answer || '',
				modelName: evaluation.model,
				modelVersion: evaluation.model_version,
				provider: evaluation.provider,
				pillarId: q.pillar_id,
				truthHierarchy: q.truth_hierarchy,
				weight: q.weight,
				response: q.response,
				score: q.score,
				maxScore: q.max_score,
				rubricBreakdown: q.rubric_breakdown,
				judgeReasoning: q.judge_reasoning,
				evaluatedAt: q.evaluated_at || evaluation.evaluated_at
			};
		})
	);

	// Get unique values for filters
	const models = Array.from(
		new Set(evaluationsData.evaluations.map((e) => `${e.model} ${e.model_version}`))
	);
	const pillars = [
		{ id: 1, name: 'The Profession of Faith' },
		{ id: 2, name: 'The Celebration of the Christian Mystery' },
		{ id: 3, name: 'Life in Christ' },
		{ id: 4, name: 'Christian Prayer' }
	];

	return {
		results,
		models,
		pillars,
		version: evaluationsData.version
	};
};
