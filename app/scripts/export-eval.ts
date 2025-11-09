#!/usr/bin/env tsx
/**
 * CADRE Evaluation Export Script
 *
 * Exports evaluation results from the database to YAML files.
 * Creates one file per model: data/results/{model-slug}-{version}.yaml
 *
 * Usage:
 *   pnpm export --version alpha                  # Export all alpha evaluations
 *   pnpm export --version alpha --model gpt-4-turbo  # Export specific model
 */

import { resolve, dirname } from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';
import { stringify } from 'yaml';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../src/lib/server/db/index';
import {
	evaluationRuns,
	responses,
	responseRuns,
	models,
	modelScores,
	pillarScores
} from '../src/lib/server/db/schema';
import { QuestionLoader } from '../src/lib/server/eval/loader';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

interface QuestionResult {
	id: string;
	pillar_id: number;
	truth_hierarchy: number;
	weight: string;
	variant: string;
	response: string;
	score: string;
	max_score: string;
	judge_reasoning: string;
	evaluated_at: string;
}

interface ModelEvaluation {
	model: string;
	model_version: string;
	provider: string;
	evaluated_at: string;
	evaluator: string;
	total_score: string;
	weighted_score: string;
	consistency_score: string;
	pillar_scores: {
		pillar_1: string;
		pillar_2: string;
		pillar_3: string;
		pillar_4: string;
	};
	questions: QuestionResult[];
}

async function main() {
	const args = process.argv.slice(2);

	// Parse arguments
	let version = 'alpha';
	let modelFilter: string | undefined;

	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--version' && args[i + 1]) {
			version = args[i + 1];
			i++;
		} else if (args[i] === '--model' && args[i + 1]) {
			modelFilter = args[i + 1];
			i++;
		} else if (args[i] === '--help' || args[i] === '-h') {
			printHelp();
			return 0;
		}
	}

	console.log('\n' + '='.repeat(70));
	console.log('CADRE - Evaluation Export');
	console.log('='.repeat(70) + '\n');
	console.log(`Version: ${version}`);
	if (modelFilter) {
		console.log(`Model filter: ${modelFilter}`);
	}
	console.log('');

	try {
		// Load questions from YAML (source of truth for question metadata)
		const questionsPath = resolve(__dirname, `../src/lib/data/questions-${version}.yaml`);
		console.log(`Loading questions from: ${questionsPath}`);
		const allQuestions = QuestionLoader.load(questionsPath);
		console.log(`✓ Loaded ${allQuestions.length} questions\n`);

		// Create question lookup map
		const questionMap = new Map(allQuestions.map(q => [q.id, q]));

		// Query completed evaluation runs
		const completedRuns = await db
			.select({
				runId: evaluationRuns.id,
				modelId: evaluationRuns.modelId,
				completedAt: evaluationRuns.completedAt,
				metadata: evaluationRuns.metadata,
				modelName: models.name,
				modelVersion: models.version,
				modelProvider: models.provider
			})
			.from(evaluationRuns)
			.innerJoin(models, eq(evaluationRuns.modelId, models.id))
			.where(eq(evaluationRuns.status, 'completed'))
			.orderBy(desc(evaluationRuns.completedAt));

		// Filter by version and model
		const filteredRuns = completedRuns.filter((run) => {
			const runVersion = (run.metadata as any)?.version || 'alpha';
			if (runVersion !== version) return false;
			if (modelFilter && run.modelName !== modelFilter) return false;
			return true;
		});

		if (filteredRuns.length === 0) {
			console.log(`No completed evaluations found for version "${version}"`);
			if (modelFilter) {
				console.log(`with model "${modelFilter}"`);
			}
			return 0;
		}

		console.log(`Found ${filteredRuns.length} evaluation(s) to export:\n`);

		// Process each evaluation run
		for (const run of filteredRuns) {
			console.log(`Processing: ${run.modelName} (${run.modelVersion})`);

			// Get model scores
			const [modelScore] = await db
				.select()
				.from(modelScores)
				.where(eq(modelScores.evaluationRunId, run.runId))
				.limit(1);

			if (!modelScore) {
				console.log(`  ⚠️  No model scores found, skipping...`);
				continue;
			}

			// Get pillar scores
			const pillarScoresList = await db
				.select()
				.from(pillarScores)
				.where(eq(pillarScores.evaluationRunId, run.runId))
				.orderBy(pillarScores.pillarId);

			// Get all responses for this run
			const responsesList = await db
				.select({
					responseId: responses.id,
					questionId: responses.questionId,
					questionVariant: responses.questionVariant
				})
				.from(responses)
				.where(eq(responses.evaluationRunId, run.runId))
				.orderBy(responses.questionId, responses.questionVariant);

			// Get Run 1 (deterministic) scores for each response
			const questionResults: QuestionResult[] = [];

			for (const resp of responsesList) {
				// Get Run 1 score
				const [run1] = await db
					.select()
					.from(responseRuns)
					.where(
						and(
							eq(responseRuns.responseId, resp.responseId),
							eq(responseRuns.runNumber, 1)
						)
					)
					.limit(1);

				if (!run1) {
					console.warn(`  ⚠️  No Run 1 data for response ${resp.responseId}, skipping...`);
					continue;
				}

				// Look up question metadata from YAML
				const question = questionMap.get(resp.questionId);
				if (!question) {
					console.warn(`  ⚠️  Question ${resp.questionId} not found in YAML, skipping...`);
					continue;
				}

				questionResults.push({
					id: resp.questionId,
					pillar_id: question.pillar_id,
					truth_hierarchy: question.truth_hierarchy,
					weight: question.weight.toString(),
					variant: resp.questionVariant,
					response: run1.responseText || '',
					score: run1.score?.toString() || '0',
					max_score: run1.maxScore?.toString() || '100',
					judge_reasoning: run1.judgeReasoning || '',
					evaluated_at: run1.createdAt?.toISOString() || ''
				});
			}

			// Build pillar scores object
			const pillarScoresObj = {
				pillar_1: pillarScoresList.find(p => p.pillarId === 1)?.avgScore?.toString() || '0',
				pillar_2: pillarScoresList.find(p => p.pillarId === 2)?.avgScore?.toString() || '0',
				pillar_3: pillarScoresList.find(p => p.pillarId === 3)?.avgScore?.toString() || '0',
				pillar_4: pillarScoresList.find(p => p.pillarId === 4)?.avgScore?.toString() || '0'
			};

			// Build evaluation object
			const evaluation: ModelEvaluation = {
				model: run.modelName,
				model_version: run.modelVersion,
				provider: run.modelProvider,
				evaluated_at: run.completedAt?.toISOString() || '',
				evaluator: 'claude-opus-4', // Judge model used
				total_score: modelScore.overallScore?.toString() || '0',
				weighted_score: modelScore.weightedScore?.toString() || '0',
				consistency_score: modelScore.consistencyScore?.toString() || '0',
				pillar_scores: pillarScoresObj,
				questions: questionResults
			};

			// Create filename slug
			const modelSlug = run.modelName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
			const filename = `${modelSlug}-${version}.yaml`;
			const outputPath = resolve(__dirname, '../src/lib/data/results', filename);

			// Convert to YAML
			const yamlContent = stringify(evaluation, {
				indent: 2,
				lineWidth: 0,
				defaultStringType: 'QUOTE_DOUBLE'
			});

			// Add header comment
			const header = `# CADRE ${version} - ${run.modelName} Evaluation Results
# Model: ${run.modelName} (${run.modelVersion})
# Provider: ${run.modelProvider}
# Evaluated: ${run.completedAt?.toISOString()}
# Total Questions: ${questionResults.length}
#
# This file contains the complete evaluation results including:
# - Overall and pillar-specific scores
# - Individual question responses (explicit and implicit variants)
# - Judge reasoning for each response
#
# Generated by: pnpm export --version ${version}

`;

			const fullContent = header + yamlContent;

			// Write to file
			writeFileSync(outputPath, fullContent, 'utf-8');

			console.log(`  ✅ Exported to: data/results/${filename}`);
			console.log(`     Questions: ${questionResults.length}`);
			console.log(`     Overall Score: ${evaluation.total_score}%`);
			console.log(`     Weighted Score: ${evaluation.weighted_score}%`);
			console.log('');
		}

		console.log('='.repeat(70));
		console.log(`✅ Export complete! ${filteredRuns.length} file(s) created.`);
		console.log('='.repeat(70) + '\n');

		// Suggest next steps
		console.log('Next steps:');
		console.log('  1. Review the exported files in data/results/');
		console.log('  2. Commit to git to publish on the leaderboard:');
		console.log('     git add data/results/');
		console.log(`     git commit -m "Add evaluation results for ${version}"`);
		console.log('     git push');
		console.log('');

		return 0;
	} catch (error) {
		console.error('❌ Error during export:', error);
		return 1;
	}
}

function printHelp() {
	console.log(`
CADRE Evaluation Export Script

Exports completed evaluations from the database to YAML files.

USAGE:
  pnpm export [OPTIONS]

OPTIONS:
  --version <version>    Benchmark version to export (default: alpha)
  --model <model-name>   Export only this specific model
  --help, -h             Show this help message

EXAMPLES:
  # Export all alpha evaluations
  pnpm export --version alpha

  # Export only GPT-4 Turbo results
  pnpm export --version alpha --model gpt-4-turbo

  # Export beta version results
  pnpm export --version beta

OUTPUT:
  Files are written to: data/results/{model-slug}-{version}.yaml
  Example: data/results/gpt-4-turbo-alpha.yaml

NOTES:
  - Only exports completed evaluation runs
  - Uses Run 1 (deterministic, temp=0) scores for reproducibility
  - Includes both explicit and implicit question variants
  - One file per model to enable independent PRs
`);
}

// Run the script
main().then((exitCode) => {
	process.exit(exitCode || 0);
});
