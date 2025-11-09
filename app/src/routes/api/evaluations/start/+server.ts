/**
 * API endpoint to start a new evaluation
 * POST /api/evaluations/start
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { QuestionLoader } from '$lib/server/eval/loader';
import { EvalRunner } from '$lib/server/eval/runner';
import { MODEL_CONFIGS, type ModelName } from '$lib/server/eval/openrouter';
import { MAGISTERIUM_MODEL_CONFIGS, type MagisteriumModelName } from '$lib/server/eval/magisterium';
import { env } from '$env/dynamic/private';

interface StartEvaluationRequest {
	model: ModelName | MagisteriumModelName;
	questionsPath?: string;
	runsPerQuestion?: number;
	benchmarkVersion?: string;
}

// Store running evaluations (in production, use Redis or a task queue)
const runningEvaluations = new Map<string, Promise<any>>();

export const POST: RequestHandler = async ({ request }) => {
	try {
		const data: StartEvaluationRequest = await request.json();

		// Validate model and determine which config to use
		const allModelConfigs = { ...MODEL_CONFIGS, ...MAGISTERIUM_MODEL_CONFIGS };
		if (!(data.model in allModelConfigs)) {
			return json(
				{
					error: 'Invalid model',
					validModels: Object.keys(allModelConfigs)
				},
				{ status: 400 }
			);
		}

		// Get API keys from environment
		const openrouterApiKey = env.OPENROUTER_API_KEY;
		const magisteriumApiKey = env.MAGISTERIUM_API_KEY;

		// Get model config
		const modelConfig = allModelConfigs[data.model];

		// Validate that the appropriate API key is available
		if ('magisterium_model' in modelConfig && modelConfig.magisterium_model && !magisteriumApiKey) {
			return json(
				{
					error: 'MAGISTERIUM_API_KEY not configured'
				},
				{ status: 500 }
			);
		}
		if ('openrouter_model' in modelConfig && modelConfig.openrouter_model && !openrouterApiKey) {
			return json(
				{
					error: 'OPENROUTER_API_KEY not configured'
				},
				{ status: 500 }
			);
		}

		// Load questions
		const questionsPath =
			data.questionsPath || env.QUESTIONS_PATH || '../data/questions-alpha.yaml';
		const questions = QuestionLoader.load(questionsPath);

		// Get evaluation parameters
		const runsPerQuestion = data.runsPerQuestion || 3;
		const benchmarkVersion = data.benchmarkVersion || 'alpha';

		// Create runner with appropriate API keys
		const runner = new EvalRunner(
			openrouterApiKey || '',
			modelConfig,
			runsPerQuestion,
			benchmarkVersion,
			undefined, // progressCallback
			magisteriumApiKey
		);

		// Start evaluation in background (don't await)
		const evaluationPromise = runner.runEvaluation(questions);

		// Note: In production, you'd want to use a proper task queue like BullMQ
		// For now, we'll just track the promise

		return json(
			{
				success: true,
				message: 'Evaluation started',
				model: modelConfig.name,
				totalQuestions: questions.length
			},
			{ status: 202 } // 202 Accepted
		);
	} catch (error) {
		console.error('Error starting evaluation:', error);
		return json(
			{
				error: 'Failed to start evaluation',
				details: String(error)
			},
			{ status: 500 }
		);
	}
};
