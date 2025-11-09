/**
 * API endpoint to get live progress of a running evaluation
 * GET /api/evaluations/[id]/progress
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { evaluationRuns, models } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const evaluationRunId = params.id;

		// Get evaluation run with progress data
		const [evalRun] = await db
			.select({
				id: evaluationRuns.id,
				modelId: evaluationRuns.modelId,
				status: evaluationRuns.status,
				currentQuestion: evaluationRuns.currentQuestion,
				totalQuestions: evaluationRuns.totalQuestions,
				currentQuestionId: evaluationRuns.currentQuestionId,
				currentVariant: evaluationRuns.currentVariant,
				responsesCompleted: evaluationRuns.responsesCompleted,
				averageScore: evaluationRuns.averageScore,
				estimatedTimeRemaining: evaluationRuns.estimatedTimeRemaining,
				startedAt: evaluationRuns.startedAt,
				completedAt: evaluationRuns.completedAt,
				modelName: models.name,
				modelVersion: models.version,
				modelProvider: models.provider
			})
			.from(evaluationRuns)
			.leftJoin(models, eq(evaluationRuns.modelId, models.id))
			.where(eq(evaluationRuns.id, evaluationRunId))
			.limit(1);

		if (!evalRun) {
			return json(
				{
					error: 'Evaluation run not found'
				},
				{ status: 404 }
			);
		}

		// Calculate progress percentage
		const totalResponses = (evalRun.totalQuestions || 0) * 2; // Each question has explicit + implicit
		const progressPercent =
			totalResponses > 0 ? ((evalRun.responsesCompleted || 0) / totalResponses) * 100 : 0;

		return json({
			evaluationRunId: evalRun.id,
			modelId: evalRun.modelId,
			modelName: evalRun.modelName,
			modelVersion: evalRun.modelVersion,
			modelProvider: evalRun.modelProvider,
			status: evalRun.status,
			currentQuestion: evalRun.currentQuestion || 0,
			totalQuestions: evalRun.totalQuestions || 0,
			currentQuestionId: evalRun.currentQuestionId,
			currentVariant: evalRun.currentVariant,
			responsesCompleted: evalRun.responsesCompleted || 0,
			totalResponses,
			progressPercent: Math.round(progressPercent),
			averageScore: evalRun.averageScore ? parseFloat(evalRun.averageScore) : null,
			estimatedTimeRemaining: evalRun.estimatedTimeRemaining,
			startedAt: evalRun.startedAt,
			completedAt: evalRun.completedAt
		});
	} catch (error) {
		console.error('Error fetching progress:', error);
		return json(
			{
				error: 'Failed to fetch progress',
				details: String(error)
			},
			{ status: 500 }
		);
	}
};
