#!/usr/bin/env tsx
/**
 * CADRE Evaluation Framework - CLI Entry Point
 *
 * Usage:
 *   pnpm eval --model gpt-4 --runs 3
 *   pnpm eval --model claude-sonnet-4.5 --runs 5
 *   pnpm eval --model grok --runs 3 --questions custom.yaml
 */

// IMPORTANT: Load environment variables BEFORE any other imports
import { resolve, dirname } from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables BEFORE importing modules that need them
config({ path: resolve(__dirname, '../.env') });

// Now import modules that depend on environment variables
import { QuestionLoader } from '../src/lib/server/eval/loader';
import { EvalRunner } from '../src/lib/server/eval/runner';
import { MODEL_CONFIGS, type ModelName } from '../src/lib/server/eval/openrouter';
import { MAGISTERIUM_MODEL_CONFIGS, type MagisteriumModelName } from '../src/lib/server/eval/magisterium';

async function main() {
	const args = process.argv.slice(2);

	// Parse arguments
	let modelName: string | undefined;
	let runsPerQuestion: number | undefined;
	let benchmarkVersion = 'alpha';
	let questionsPath = resolve(__dirname, '../src/lib/data/questions-alpha.yaml');
	let timeoutMs = 300000; // Default 300s (5 minutes)
	let resumeEvalRunId: string | undefined;

	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--model' && args[i + 1]) {
			modelName = args[i + 1];
			i++;
		} else if (args[i] === '--runs' && args[i + 1]) {
			runsPerQuestion = parseInt(args[i + 1], 10);
			i++;
		} else if (args[i] === '--version' && args[i + 1]) {
			benchmarkVersion = args[i + 1];
			i++;
		} else if (args[i] === '--questions' && args[i + 1]) {
			questionsPath = resolve(args[i + 1]);
			i++;
		} else if (args[i] === '--timeout' && args[i + 1]) {
			timeoutMs = parseInt(args[i + 1], 10) * 1000; // Convert seconds to ms
			i++;
		} else if (args[i] === '--resume' && args[i + 1]) {
			resumeEvalRunId = args[i + 1];
			i++;
		} else if (args[i] === '--help' || args[i] === '-h') {
			printHelp();
			return 0;
		}
	}

	// When resuming, model and runs are optional (loaded from database)
	if (!resumeEvalRunId) {
		if (!modelName) {
			console.error('❌ Error: --model argument is required (unless using --resume)\n');
			printHelp();
			return 1;
		}

		if (!runsPerQuestion) {
			console.error('❌ Error: --runs argument is required (unless using --resume)\n');
			printHelp();
			return 1;
		}
	}

	if (runsPerQuestion && (isNaN(runsPerQuestion) || runsPerQuestion < 1 || runsPerQuestion > 10)) {
		console.error('❌ Error: --runs must be a number between 1 and 10\n');
		return 1;
	}

	// Validate model exists in either config (skip if resuming)
	const allModelConfigs = { ...MODEL_CONFIGS, ...MAGISTERIUM_MODEL_CONFIGS };
	if (modelName && !(modelName in allModelConfigs)) {
		console.error(`❌ Error: Unknown model: ${modelName}`);
		console.error(`Valid models: ${Object.keys(allModelConfigs).join(', ')}\n`);
		return 1;
	}

	console.log('\n' + '='.repeat(70));
	console.log('CADRE - Catholic Alignment, Doctrine, and Reasoning Evaluation');
	console.log('='.repeat(70) + '\n');

	try {
		// Get API keys
		const openrouterApiKey = process.env.OPENROUTER_API_KEY;
		const magisteriumApiKey = process.env.MAGISTERIUM_API_KEY;

		// Load questions
		console.log(`Loading questions from: ${questionsPath}`);
		const questions = QuestionLoader.load(questionsPath);

		// Validate rubric weights
		for (const q of questions) {
			QuestionLoader.validateRubricWeights(q);
		}

		let modelConfig;
		if (resumeEvalRunId) {
			// When resuming, we need to get model info from the database
			// For now, we'll require model name to be specified
			if (!modelName) {
				throw new Error('When using --resume, you must still specify --model to ensure consistency');
			}
			modelConfig = allModelConfigs[modelName as ModelName | MagisteriumModelName];
			if (!runsPerQuestion) {
				// Default to 3 if not specified
				runsPerQuestion = 3;
				console.log(`  Using default runs per question: ${runsPerQuestion}`);
			}
		} else {
			// Get model config for new evaluation
			modelConfig = allModelConfigs[modelName as ModelName | MagisteriumModelName];
		}

		// Validate that the appropriate API key is available
		if (modelConfig.magisterium_model && !magisteriumApiKey) {
			throw new Error('MAGISTERIUM_API_KEY not found in environment');
		}
		if (modelConfig.openrouter_model && !openrouterApiKey) {
			throw new Error('OPENROUTER_API_KEY not found in environment');
		}

		if (resumeEvalRunId) {
			console.log(`\n📋 Resuming evaluation run: ${resumeEvalRunId}`);
		} else {
			console.log(`\nInitializing model: ${modelName}`);
			console.log(`  Provider: ${modelConfig.provider}`);
			console.log(`  Version: ${modelConfig.version}`);
			console.log(`  Via: ${modelConfig.magisterium_model ? 'Magisterium' : 'OpenRouter'}`);
		}

		console.log('\nInitializing judge: Claude Opus 4.1 (via OpenRouter)');
		console.log(`Runs per question-variant: ${runsPerQuestion}`);
		console.log(`Benchmark version: ${benchmarkVersion}`);
		console.log(`API timeout: ${timeoutMs / 1000}s`);
		console.log('Connecting to database...');

		// Create runner with appropriate API keys
		const runner = new EvalRunner(
			openrouterApiKey || '',
			modelConfig,
			runsPerQuestion!,
			benchmarkVersion,
			undefined, // progressCallback
			magisteriumApiKey,
			timeoutMs
		);

		// Run evaluation (with optional resume)
		const results = await runner.runEvaluation(questions, resumeEvalRunId);

		console.log('✓ Results saved to database');
		console.log(`✓ View leaderboard at: http://localhost:5173/\n`);

		return 0;
	} catch (error) {
		console.error(`\n❌ Error: ${error}\n`);
		return 1;
	}
}

function printHelp() {
	console.log(`
CADRE Evaluation CLI

Usage:
  pnpm eval --model <model-name> --runs <number> [options]

Required Arguments:
  --model <name>          Model to evaluate (required)
                          Available: ${Object.keys({ ...MODEL_CONFIGS, ...MAGISTERIUM_MODEL_CONFIGS }).join(', ')}

  --runs <number>         Number of times to test each question-variant (required)
                          Range: 1-10
                          Recommended: 3-5 for consistency testing

Options:
  --version <string>      Benchmark version for organizing results
                          Default: alpha

  --questions <path>      Path to questions YAML file
                          Default: ../src/lib/data/questions-alpha.yaml

  --timeout <seconds>     API request timeout in seconds
                          Default: 300 (5 minutes)
                          Recommended: 300-600 for slow models

  --resume <eval-run-id>  Resume an incomplete evaluation run
                          Must specify --model to ensure consistency
                          Skips already-completed question variants

  --help, -h             Show this help message

Examples:
  pnpm eval --model gpt-4 --runs 3
  pnpm eval --model claude-sonnet-4.5 --runs 5 --version alpha
  pnpm eval --model grok --runs 3 --questions custom_questions.yaml
  pnpm eval --model magisterium-1 --runs 3 --timeout 600
  pnpm eval --resume <uuid> --model magisterium-1

Notes:
  - Each question has two variants (explicit + implicit)
  - Total API calls = questions × 2 × runs × 2 (model + judge)
  - Example: 33 questions × 2 variants × 3 runs = 198 model calls + 198 judge calls
  - Multiple runs enable consistency metrics and confidence intervals

Environment Variables:
  OPENROUTER_API_KEY     Required for OpenRouter models. Get one at https://openrouter.ai/keys
  MAGISTERIUM_API_KEY    Required for Magisterium models. Get one at https://magisterium.ai
  DATABASE_URL           PostgreSQL connection string (from .env)
`);
}

// Run the CLI
main().then((exitCode) => {
	process.exit(exitCode);
}).catch((error) => {
	console.error('Unhandled error:', error);
	process.exit(1);
});
