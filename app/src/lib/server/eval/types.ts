/**
 * TypeScript types for the CADRE evaluation system
 * Mirrors the Python Pydantic models from care_eval
 */

export interface RubricCriterion {
	name: string;
	weight: number; // 0 to 1
	required: boolean;
}

export interface Rubric {
	max_score: number; // typically 100
	criteria: RubricCriterion[];
}

export interface Question {
	id: string;
	pillar_id: number; // 1-4
	truth_hierarchy: number; // 1-4
	weight: number;
	explicit_text: string;
	implicit_text: string;
	reference_answer?: string;
	source_citations?: string[];
	// Differentiated rubrics for explicit vs implicit variants
	rubrics: {
		explicit: Rubric;
		implicit: Rubric;
	};
}

export interface JudgmentResult {
	score: number;
	max_score: number;
	reasoning: string;
	criteria_scores: Array<{
		criterion: string;
		met: boolean;
		score: number;
		feedback: string;
	}>;
}

export interface ModelConfig {
	name: string;
	version: string;
	provider: string;
	openrouter_model?: string;
	magisterium_model?: string;
}

export interface EvaluationProgress {
	evaluationRunId: string;
	modelId: string;
	status: 'running' | 'completed' | 'failed';
	currentQuestion: number;
	totalQuestions: number;
	currentQuestionId?: string;
	currentVariant?: 'explicit' | 'implicit';
	currentRun?: number; // Current run number (for multi-run evaluations)
	totalRuns?: number; // Total runs per question
	responsesCompleted: number;
	averageScore?: number;
	startedAt: Date;
	estimatedTimeRemaining?: number; // seconds
}

export interface EvaluationResult {
	eval_run_id: string;
	model_id: string;
	overall_score: number;
	overall_score_ci?: { lower: number; upper: number };
	weighted_score: number;
	weighted_score_ci?: { lower: number; upper: number };
	consistency_score?: number; // 0-100 metric of response consistency
	total_responses: number;
}

export interface ResponseRun {
	id?: string;
	responseId: string;
	runNumber: number;
	responseText: string;
	score: number;
	maxScore: number;
	judgeReasoning: string;
}

export interface ResponseWithStats {
	id: string;
	questionId: string;
	questionVariant: 'explicit' | 'implicit';
	runCount: number;
	meanScore: number;
	stdDev: number;
	minScore: number;
	maxScore: number;
	coefficientOfVariation: number;
	runs: ResponseRun[];
}

/**
 * Helper function to get the appropriate rubric for a question variant.
 *
 * @param question - The question object
 * @param variant - The question variant ('explicit' or 'implicit')
 * @returns The appropriate rubric for the variant
 */
export function getRubricForVariant(
	question: Question,
	variant: 'explicit' | 'implicit'
): Rubric {
	return question.rubrics[variant];
}
