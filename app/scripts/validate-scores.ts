#!/usr/bin/env tsx
/**
 * CADRE Scores Validation Script
 *
 * Validates that scores-alpha.yaml matches the source result files.
 * Detects out-of-sync issues before publishing.
 *
 * Usage:
 *   pnpm validate-scores --version alpha
 */

import { resolve, dirname } from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { ScoresLoader } from '../src/lib/server/eval/scores-loader';
import { EvaluationsLoader } from '../src/lib/server/eval/evaluations-loader';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

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
	console.log('CADRE - Scores Validation');
	console.log('='.repeat(70) + '\n');
	console.log(`Version: ${version}\n`);

	try {
		// Paths
		const scoresPath = resolve(__dirname, `../src/lib/data/scores-${version}.yaml`);
		const resultsDir = resolve(__dirname, '../src/lib/data/results');

		// Check files exist
		if (!existsSync(scoresPath)) {
			console.error(`❌ Scores file not found: ${scoresPath}`);
			console.error('   Run: pnpm scores-summary');
			return 1;
		}

		if (!existsSync(resultsDir)) {
			console.error(`❌ Results directory not found: ${resultsDir}`);
			return 1;
		}

		// Load scores summary
		console.log('📄 Loading scores summary...');
		const scoresSummary = ScoresLoader.load(scoresPath);
		if (!scoresSummary) {
			console.error('❌ Failed to load scores summary');
			return 1;
		}
		console.log(`   ✓ Loaded ${scoresSummary.leaderboard.length} models\n`);

		// Load source evaluations
		console.log('📁 Loading source result files...');
		const evaluationsData = EvaluationsLoader.loadAll(resultsDir, version);
		console.log(`   ✓ Loaded ${evaluationsData.evaluations.length} evaluations\n`);

		// Validation checks
		let errors = 0;
		let warnings = 0;

		console.log('🔍 Running validation checks...\n');

		// Check 1: Model count matches
		console.log('1. Checking model count...');
		if (scoresSummary.leaderboard.length !== evaluationsData.evaluations.length) {
			console.error(
				`   ❌ Model count mismatch: ${scoresSummary.leaderboard.length} in summary vs ${evaluationsData.evaluations.length} in source`
			);
			errors++;
		} else {
			console.log(`   ✓ Model count matches: ${scoresSummary.leaderboard.length}`);
		}

		// Check 2: Validate each model's scores
		console.log('\n2. Checking individual model scores...');

		for (const scoredModel of scoresSummary.leaderboard) {
			// Find corresponding evaluation
			const sourceEval = evaluationsData.evaluations.find(
				(e) => e.model === scoredModel.name && e.model_version === scoredModel.version
			);

			if (!sourceEval) {
				console.error(`   ❌ Model not found in source: ${scoredModel.name} ${scoredModel.version}`);
				errors++;
				continue;
			}

			// Validate overall score
			const scoreDiff = Math.abs(scoredModel.overall_score - sourceEval.total_score);
			if (scoreDiff > 0.1) {
				console.error(
					`   ❌ ${scoredModel.name}: Overall score mismatch (${scoredModel.overall_score.toFixed(1)} vs ${sourceEval.total_score.toFixed(1)})`
				);
				errors++;
			}

			// Validate weighted score
			const calculatedWeighted = EvaluationsLoader.calculateWeightedScore(sourceEval);
			const weightedDiff = Math.abs(scoredModel.weighted_score - calculatedWeighted);
			if (weightedDiff > 0.1) {
				console.error(
					`   ❌ ${scoredModel.name}: Weighted score mismatch (${scoredModel.weighted_score.toFixed(1)} vs ${calculatedWeighted.toFixed(1)})`
				);
				errors++;
			}

			// Validate pillar scores
			const pillarDiffs = [
				Math.abs(scoredModel.pillar_scores['1'].score - sourceEval.pillar_scores.pillar_1),
				Math.abs(scoredModel.pillar_scores['2'].score - sourceEval.pillar_scores.pillar_2),
				Math.abs(scoredModel.pillar_scores['3'].score - sourceEval.pillar_scores.pillar_3),
				Math.abs(scoredModel.pillar_scores['4'].score - sourceEval.pillar_scores.pillar_4)
			];

			pillarDiffs.forEach((diff, idx) => {
				if (diff > 0.1) {
					console.error(
						`   ❌ ${scoredModel.name}: Pillar ${idx + 1} score mismatch (diff: ${diff.toFixed(2)})`
					);
					errors++;
				}
			});

			// Validate response count
			if (scoredModel.total_responses !== sourceEval.questions.length) {
				console.warn(
					`   ⚠️  ${scoredModel.name}: Response count mismatch (${scoredModel.total_responses} vs ${sourceEval.questions.length})`
				);
				warnings++;
			}
		}

		if (errors === 0 && warnings === 0) {
			console.log(`   ✓ All ${scoresSummary.leaderboard.length} models validated successfully`);
		}

		// Check 3: Timestamp freshness
		console.log('\n3. Checking timestamp freshness...');
		const summaryDate = new Date(scoresSummary.generated_at);
		const sourceDate = new Date(evaluationsData.last_updated);
		const hoursDiff = (summaryDate.getTime() - sourceDate.getTime()) / (1000 * 60 * 60);

		if (hoursDiff < -1) {
			// Summary is older than source by more than 1 hour
			console.warn(
				`   ⚠️  Summary may be stale (generated ${Math.abs(hoursDiff).toFixed(1)}h before latest results)`
			);
			console.warn('      Consider regenerating: pnpm scores-summary');
			warnings++;
		} else {
			console.log('   ✓ Summary is up to date');
		}

		// Summary
		console.log('\n' + '='.repeat(70));
		if (errors === 0 && warnings === 0) {
			console.log('✅ VALIDATION PASSED - All checks successful!');
			console.log('='.repeat(70) + '\n');
			return 0;
		} else if (errors === 0) {
			console.log(`⚠️  VALIDATION PASSED WITH WARNINGS (${warnings} warning(s))`);
			console.log('='.repeat(70) + '\n');
			return 0;
		} else {
			console.log(`❌ VALIDATION FAILED - ${errors} error(s), ${warnings} warning(s)`);
			console.log('='.repeat(70) + '\n');
			console.log('Fix issues and regenerate:');
			console.log(`  pnpm scores-summary --version ${version}`);
			console.log('');
			return 1;
		}
	} catch (error) {
		console.error('❌ Validation error:', error);
		return 1;
	}
}

function printHelp() {
	console.log(`
CADRE Scores Validation Script

Validates that scores summary file matches source result files.
Detects out-of-sync issues before publishing.

USAGE:
  pnpm validate-scores [OPTIONS]

OPTIONS:
  --version <version>    Benchmark version (default: alpha)
  --help, -h             Show this help message

EXAMPLES:
  # Validate alpha version
  pnpm validate-scores --version alpha

  # Validate beta version
  pnpm validate-scores --version beta

VALIDATION CHECKS:
  1. Model count matches between summary and source
  2. Individual scores match (overall, weighted, pillar)
  3. Response counts are consistent
  4. Summary timestamp is recent

EXIT CODES:
  0 - Validation passed (warnings allowed)
  1 - Validation failed (errors found)
`);
}

// Run the script
main().then((exitCode) => {
	process.exit(exitCode || 0);
});
