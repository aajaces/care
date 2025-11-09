#!/usr/bin/env tsx
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
  console.log('\nModels in database:');
  console.log('='.repeat(70));
  const allModels = await db.select().from(models);
  allModels.forEach(m => {
    console.log(`ID: ${m.id} | Name: ${m.name} | Version: ${m.version} | Provider: ${m.provider}`);
  });

  console.log('\n\nEvaluation Runs:');
  console.log('='.repeat(70));
  const runs = await db
    .select({
      runId: evaluationRuns.id,
      modelId: evaluationRuns.modelId,
      status: evaluationRuns.status,
      completedAt: evaluationRuns.completedAt,
      metadata: evaluationRuns.metadata,
      modelName: models.name,
    })
    .from(evaluationRuns)
    .innerJoin(models, eq(evaluationRuns.modelId, models.id));

  runs.forEach(r => {
    const version = (r.metadata as any)?.version || 'unknown';
    console.log(`Run ${r.runId} | Model: ${r.modelName} | Status: ${r.status} | Version: ${version} | Completed: ${r.completedAt || 'N/A'}`);
  });
  console.log('');
}

main().then(() => process.exit(0));
