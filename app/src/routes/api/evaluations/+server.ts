import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import {
	models,
	evaluationRuns,
	responses,
	pillarScores,
	modelScores,
	questions
} from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

interface EvaluationSubmission {
	model: {
		name: string;
		version: string;
		provider: string;
		type?: 'raw_model' | 'application';
	};
	responses: Array<{
		questionId: string;
		questionVariant: 'explicit' | 'implicit';
		responseText: string;
		rubricId?: string;
		score?: number;
		maxScore?: number;
		judgeReasoning?: string;
	}>;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const data: EvaluationSubmission = await request.json();

		// 1. Create or find model
		const [existingModel] = await db
			.select()
			.from(models)
			.where(eq(models.name, data.model.name))
			.limit(1);

		let modelId: string;

		if (existingModel) {
			modelId = existingModel.id;
		} else {
			const [newModel] = await db
				.insert(models)
				.values({
					name: data.model.name,
					version: data.model.version,
					provider: data.model.provider,
					type: data.model.type || 'raw_model'
				})
				.returning();
			modelId = newModel.id;
		}

		// 2. Create evaluation run
		const [evalRun] = await db
			.insert(evaluationRuns)
			.values({
				modelId,
				status: 'running'
			})
			.returning();

		// 3. Insert all responses
		const responseRecords = await db
			.insert(responses)
			.values(
				data.responses.map((r) => ({
					evaluationRunId: evalRun.id,
					questionId: r.questionId,
					modelId,
					questionVariant: r.questionVariant,
					responseText: r.responseText,
					rubricId: r.rubricId,
					score: r.score?.toString(),
					maxScore: r.maxScore?.toString(),
					judgeReasoning: r.judgeReasoning
				}))
			)
			.returning();

		// 4. Calculate pillar scores
		// Get all questions to determine pillars
		const questionIds = data.responses.map((r) => r.questionId);
		const questionData = await db.select().from(questions);

		const pillarScoreMap = new Map<number, { total: number; count: number }>();

		data.responses.forEach((response, idx) => {
			const question = questionData.find((q) => q.id === response.questionId);
			if (question && response.score) {
				const pillarId = question.pillarId;
				const current = pillarScoreMap.get(pillarId) || { total: 0, count: 0 };
				pillarScoreMap.set(pillarId, {
					total: current.total + response.score,
					count: current.count + 1
				});
			}
		});

		// Insert pillar scores
		const pillarScoreRecords = [];
		for (const [pillarId, { total, count }] of pillarScoreMap.entries()) {
			const avgScore = total / count;
			const [pillarScore] = await db
				.insert(pillarScores)
				.values({
					evaluationRunId: evalRun.id,
					modelId,
					pillarId,
					avgScore: avgScore.toFixed(2),
					questionCount: count
				})
				.returning();
			pillarScoreRecords.push(pillarScore);
		}

		// 5. Calculate overall model score
		const totalScore = data.responses.reduce((sum, r) => sum + (r.score || 0), 0);
		const totalMaxScore = data.responses.reduce((sum, r) => sum + (r.maxScore || 100), 0);
		const overallScore = (totalScore / totalMaxScore) * 100;

		// For now, weighted score equals overall score (can enhance later with hierarchy weights)
		const [modelScore] = await db
			.insert(modelScores)
			.values({
				modelId,
				evaluationRunId: evalRun.id,
				overallScore: overallScore.toFixed(2),
				weightedScore: overallScore.toFixed(2),
				totalQuestions: data.responses.length
			})
			.returning();

		// 6. Mark evaluation run as completed
		await db
			.update(evaluationRuns)
			.set({
				status: 'completed',
				completedAt: new Date()
			})
			.where(eq(evaluationRuns.id, evalRun.id));

		return json(
			{
				success: true,
				evaluationRunId: evalRun.id,
				modelId,
				overallScore: modelScore.overallScore,
				pillarScores: pillarScoreRecords
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Error submitting evaluation:', error);
		return json({ error: 'Failed to submit evaluation', details: String(error) }, { status: 500 });
	}
};
