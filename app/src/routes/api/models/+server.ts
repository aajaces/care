import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { models } from '$lib/server/db/schema';

export const GET: RequestHandler = async () => {
	try {
		const allModels = await db.select().from(models);
		return json(allModels);
	} catch (error) {
		console.error('Error fetching models:', error);
		return json({ error: 'Failed to fetch models' }, { status: 500 });
	}
};
