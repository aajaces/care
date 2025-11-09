#!/usr/bin/env tsx
/**
 * Fix evaluation run versions
 * Sets the version metadata to 'alpha' for runs that have 'unknown' version
 */

import { resolve, dirname } from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { eq } from 'drizzle-orm';
import { db } from '../src/lib/server/db/index';
import { evaluationRuns, models } from '../src/lib/server/db/schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env') });

async function main() {
	const args = process.argv.slice(2);
	const version = args[0] || 'alpha';

	console.log(`\nUpdating evaluation runs to version: ${version}`);
	console.log('='.repeat(70));

	// Get all evaluation runs
	const runs = await db
		.select({
			runId: evaluationRuns.id,
			modelId: evaluationRuns.modelId,
			metadata: evaluationRuns.metadata,
			modelName: models.name
		})
		.from(evaluationRuns)
		.innerJoin(models, eq(evaluationRuns.modelId, models.id));

	let updated = 0;
	for (const run of runs) {
		const currentVersion = (run.metadata as any)?.version;

		if (!currentVersion || currentVersion === 'unknown') {
			const newMetadata = {
				...(run.metadata as any || {}),
				version
			};

			await db
				.update(evaluationRuns)
				.set({ metadata: newMetadata })
				.where(eq(evaluationRuns.id, run.runId));

			console.log(`✓ Updated run ${run.runId} (${run.modelName}): unknown -> ${version}`);
			updated++;
		} else {
			console.log(`- Skipped run ${run.runId} (${run.modelName}): already has version ${currentVersion}`);
		}
	}

	console.log('='.repeat(70));
	console.log(`✅ Updated ${updated} evaluation run(s)\n`);
}

main().then(() => process.exit(0)).catch(err => {
	console.error('Error:', err);
	process.exit(1);
});
