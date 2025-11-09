#!/usr/bin/env tsx
/**
 * CADRE Scores Summary Generator
 *
 * Generates a lightweight scores-alpha.yaml file from all result files.
 * This provides fast leaderboard loading without parsing full evaluation details.
 *
 * Usage:
 *   pnpm scores-summary --version alpha
 */

import { resolve, dirname } from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { writeFileSync, existsSync } from 'fs';
import { stringify } from 'yaml';
import { EvaluationsLoader } from '../src/lib/server/eval/evaluations-loader';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

interface PillarScore {
	score: number;
	question_count: number;
}

interface ModelSummary {
	rank: number;
	model_id: string;
	name: string;
	version: string;
	provider: string;
	tested_at: string;
	overall_score: number;
	weighted_score: number;
	consistency_score: number | null;
	pillar_scores: {
		'1': PillarScore;
		'2': PillarScore;
		'3': PillarScore;
		'4': PillarScore;
	};
	total_responses: number;
	result_file: string;
}

interface ScoresSummary {
	version: string;
	last_updated: string;
	generated_at: string;
	source_files_count: number;
	leaderboard: ModelSummary[];
}

async function main() {
	const args = process.argv.slice(2);

	// Parse arguments
	let version = 'alpha';

	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--version' && args[i + 1]) {
			version = args[i + 1];
			i++;
		} else if (args[i] === '--help' || args[i] === '-h') {
			printHelp();
			return 0;
		}
	}

	console.log('\n' + '='.repeat(70));
	console.log('CADRE - Scores Summary Generator');
	console.log('='.repeat(70) + '\n');
	console.log(`Version: ${version}\n`);

	try {
		// Paths
		const resultsDir = resolve(__dirname, '../src/lib/data/results');
		const outputPath = resolve(__dirname, `../src/lib/data/scores-${version}.yaml`);

		if (!existsSync(resultsDir)) {
			console.error(`❌ Results directory not found: ${resultsDir}`);
			return 1;
		}

		// Load all evaluations
		console.log('📁 Loading evaluation results...');
		const evaluationsData = EvaluationsLoader.loadAll(resultsDir, version);

		if (evaluationsData.evaluations.length === 0) {
			console.error(`❌ No evaluations found for version "${version}"`);
			return 1;
		}

		console.log(`   Found ${evaluationsData.evaluations.length} evaluation(s)\n`);

		// Build model summaries
		const modelSummaries: ModelSummary[] = evaluationsData.evaluations.map((evaluation) => {
			// Count questions per pillar
			const pillarCounts: Record<number, number> = {};
			evaluation.questions.forEach((q) => {
				pillarCounts[q.pillar_id] = (pillarCounts[q.pillar_id] || 0) + 1;
			});

			// Generate model ID slug
			const modelSlug = evaluation.model.toLowerCase().replace(/[^a-z0-9]+/g, '-');

			// Use weighted_score from evaluation if available, otherwise calculate it
			const weightedScore = evaluation.weighted_score !== undefined
				? evaluation.weighted_score
				: EvaluationsLoader.calculateWeightedScore(evaluation);

			return {
				rank: 0, // Will be assigned after sorting
				model_id: `${modelSlug}-${version}`,
				name: evaluation.model,
				version: evaluation.model_version,
				provider: evaluation.provider,
				tested_at: evaluation.evaluated_at,
				overall_score: evaluation.total_score,
				weighted_score: weightedScore,
				consistency_score: evaluation.consistency_score || null,
				pillar_scores: {
					'1': {
						score: evaluation.pillar_scores.pillar_1,
						question_count: pillarCounts[1] || 0
					},
					'2': {
						score: evaluation.pillar_scores.pillar_2,
						question_count: pillarCounts[2] || 0
					},
					'3': {
						score: evaluation.pillar_scores.pillar_3,
						question_count: pillarCounts[3] || 0
					},
					'4': {
						score: evaluation.pillar_scores.pillar_4,
						question_count: pillarCounts[4] || 0
					}
				},
				total_responses: evaluation.questions.length,
				result_file: `results/${modelSlug}-${version}.yaml`
			};
		});

		// Sort by weighted score (descending)
		modelSummaries.sort((a, b) => b.weighted_score - a.weighted_score);

		// Assign ranks
		modelSummaries.forEach((model, idx) => {
			model.rank = idx + 1;
		});

		// Build summary object
		const summary: ScoresSummary = {
			version,
			last_updated: evaluationsData.last_updated,
			generated_at: new Date().toISOString(),
			source_files_count: evaluationsData.evaluations.length,
			leaderboard: modelSummaries
		};

		// Convert to YAML
		const yamlContent = stringify(summary, {
			indent: 2,
			lineWidth: 0,
			defaultStringType: 'QUOTE_DOUBLE'
		});

		// Add header comment
		const header = `# CADRE Scores Summary - ${version}
#
# This file provides a lightweight summary of all evaluated models.
# It's optimized for fast leaderboard loading without parsing full evaluation details.
#
# AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
# Generated at: ${new Date().toISOString()}
# Source files: ${evaluationsData.evaluations.length} evaluation(s) from data/results/
#
# To regenerate this file:
#   cd app && pnpm scores-summary --version ${version}
#
# Full evaluation details available in: data/results/{model-slug}-${version}.yaml
#

`;

		const fullContent = header + yamlContent;

		// Write to file
		writeFileSync(outputPath, fullContent, 'utf-8');

		console.log('✅ Generated scores summary:\n');
		console.log(`   File: data/scores-${version}.yaml`);
		console.log(`   Models: ${modelSummaries.length}`);
		console.log(`   Size: ${(fullContent.length / 1024).toFixed(1)} KB`);
		console.log('');

		// Show top 3 models
		console.log('Top 3 models:');
		modelSummaries.slice(0, 3).forEach((model) => {
			console.log(
				`   ${model.rank}. ${model.name} - ${model.weighted_score.toFixed(1)}% (weighted)`
			);
		});
		console.log('');

		console.log('='.repeat(70));
		console.log('✅ Summary generation complete!');
		console.log('='.repeat(70) + '\n');

		console.log('Next steps:');
		console.log(`  1. Review: cat data/scores-${version}.yaml`);
		console.log('  2. Validate: pnpm validate-scores');
		console.log('  3. Commit: git add data/scores-*.yaml && git commit');
		console.log('');

		return 0;
	} catch (error) {
		console.error('❌ Error generating scores summary:', error);
		return 1;
	}
}

function printHelp() {
	console.log(`
CADRE Scores Summary Generator

Generates a lightweight scores summary file for fast leaderboard loading.

USAGE:
  pnpm scores-summary [OPTIONS]

OPTIONS:
  --version <version>    Benchmark version (default: alpha)
  --help, -h             Show this help message

EXAMPLES:
  # Generate alpha version summary
  pnpm scores-summary --version alpha

  # Generate beta version summary
  pnpm scores-summary --version beta

OUTPUT:
  Creates: data/scores-{version}.yaml

  This file contains:
  - Model rankings and scores
  - Per-pillar breakdowns
  - Metadata and timestamps
  - References to full result files

WORKFLOW:
  1. Run evaluations: pnpm eval --model <model> --runs 3
  2. Export to YAML: pnpm export --version alpha
  3. Generate summary: pnpm scores-summary --version alpha
  4. Validate: pnpm validate-scores
  5. Commit both: git add data/results/ data/scores-*.yaml
`);
}

// Run the script
main().then((exitCode) => {
	process.exit(exitCode || 0);
});
