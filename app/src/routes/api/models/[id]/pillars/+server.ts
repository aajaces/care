import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { pillars, pillarScores } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params }) => {
	const { id } = params;

	try {
		// Get pillar scores for this model
		const scores = await db
			.select({
				pillarId: pillars.id,
				pillarName: pillars.name,
				pillarDescription: pillars.description,
				pillarOrder: pillars.orderNum,
				avgScore: pillarScores.avgScore,
				questionCount: pillarScores.questionCount
			})
			.from(pillarScores)
			.leftJoin(pillars, eq(pillarScores.pillarId, pillars.id))
			.where(eq(pillarScores.modelId, id))
			.orderBy(pillars.orderNum);

		return json(scores);
	} catch (error) {
		console.error('Error fetching pillar scores:', error);
		return json({ error: 'Failed to fetch pillar scores' }, { status: 500 });
	}
};
