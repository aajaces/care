import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { models, modelScores } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';

export const GET: RequestHandler = async () => {
	try {
		// Get models with their latest scores, ordered by weighted score
		const leaderboard = await db
			.select({
				id: models.id,
				name: models.name,
				version: models.version,
				provider: models.provider,
				type: models.type,
				overallScore: modelScores.overallScore,
				overallScoreCiLower: modelScores.overallScoreCiLower,
				overallScoreCiUpper: modelScores.overallScoreCiUpper,
				weightedScore: modelScores.weightedScore,
				weightedScoreCiLower: modelScores.weightedScoreCiLower,
				weightedScoreCiUpper: modelScores.weightedScoreCiUpper,
				consistencyScore: modelScores.consistencyScore,
				totalQuestions: modelScores.totalQuestions,
				testedAt: models.testedAt
			})
			.from(models)
			.leftJoin(modelScores, eq(models.id, modelScores.modelId))
			.orderBy(desc(modelScores.weightedScore));

		return json(leaderboard);
	} catch (error) {
		console.error('Error fetching leaderboard:', error);
		return json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
	}
};
