import type { PageServerLoad } from './$types';
import { EvaluationsLoader } from '$lib/server/eval/evaluations-loader';
import { QuestionLoader } from '$lib/server/eval/loader';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Paths to data files
const RESULTS_DIR = resolve(process.cwd(), '../data/results');
const LEGACY_EVALUATIONS_PATH = resolve(process.cwd(), '../data/evaluations-alpha.yaml');
const QUESTIONS_PATH = resolve(process.cwd(), '../data/questions-alpha.yaml');

export const load: PageServerLoad = async () => {
	// Load evaluations (try new multi-file structure first)
	let evaluationsData;

	if (existsSync(RESULTS_DIR)) {
		evaluationsData = EvaluationsLoader.loadAll(RESULTS_DIR, 'alpha');
	} else if (existsSync(LEGACY_EVALUATIONS_PATH)) {
		evaluationsData = EvaluationsLoader.load(LEGACY_EVALUATIONS_PATH);
	} else {
		evaluationsData = {
			version: 'alpha',
			last_updated: new Date().toISOString(),
			benchmark_questions: 'questions-alpha.yaml',
			evaluations: []
		};
	}

	const questions = QuestionLoader.load(QUESTIONS_PATH);

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
