/**
 * Main evaluation runner that orchestrates the full evaluation process
 * Replaces care_eval/runner.py
 */

import { db } from '../db';
import {
	models,
	evaluationRuns,
	responses,
	responseRuns,
	pillarScores,
	modelScores,
	questions as questionsTable
} from '../db/schema';
import { eq } from 'drizzle-orm';
import { OpenRouterClient } from './openrouter';
import { MagisteriumClient } from './magisterium';
import { LLMJudge } from './judge';
import {
	calculateConsistencyMetrics,
	calculateBootstrapCI,
	calculateAverageConsistencyScore
} from './statistics';
import type {
	Question,
	EvaluationProgress,
	EvaluationResult,
	ModelConfig,
	ResponseRun
} from './types';
import { getRubricForVariant } from './types';

interface ProgressCallback {
	(progress: EvaluationProgress): void | Promise<void>;
}

export class EvalRunner {
	private testModel: OpenRouterClient | MagisteriumClient;
	private judge: LLMJudge;
	private modelConfig: ModelConfig;
	private progressCallback?: ProgressCallback;
	private runsPerQuestion: number;
	private benchmarkVersion: string;
	private timeoutMs: number;

	constructor(
		openrouterApiKey: string,
		modelConfig: ModelConfig,
		runsPerQuestion: number,
		benchmarkVersion: string = 'alpha',
		progressCallback?: ProgressCallback,
		magisteriumApiKey?: string,
		timeoutMs: number = 300000 // Default 300s (5 minutes)
	) {
		this.timeoutMs = timeoutMs;

		// Determine which client to use based on model config
		if (modelConfig.magisterium_model) {
			if (!magisteriumApiKey) {
				throw new Error('Magisterium API key is required for Magisterium models');
			}
			this.testModel = new MagisteriumClient(magisteriumApiKey, modelConfig.magisterium_model, timeoutMs);
		} else if (modelConfig.openrouter_model) {
			this.testModel = new OpenRouterClient(openrouterApiKey, modelConfig.openrouter_model, timeoutMs);
		} else {
			throw new Error('Model config must specify either openrouter_model or magisterium_model');
		}

		this.judge = new LLMJudge(openrouterApiKey, timeoutMs);
		this.benchmarkVersion = benchmarkVersion;
		this.modelConfig = modelConfig;
		this.runsPerQuestion = runsPerQuestion;
		this.progressCallback = progressCallback;
	}

	/**
	 * Load partial evaluation state from database for resume
	 * @param evalRunId Evaluation run ID to resume
	 * @returns Partial evaluation state or null if not found/complete
	 */
	private async loadPartialEvaluation(evalRunId: string) {
		const [evalRun] = await db
			.select()
			.from(evaluationRuns)
			.where(eq(evaluationRuns.id, evalRunId))
			.limit(1);

		if (!evalRun) {
			throw new Error(`Evaluation run ${evalRunId} not found`);
		}

		if (evalRun.status === 'completed') {
			throw new Error(`Evaluation run ${evalRunId} is already completed`);
		}

		// Load all completed responses
		const completedResponses = await db
			.select()
			.from(responses)
			.where(eq(responses.evaluationRunId, evalRunId));

		// Load all response runs
		const allResponseRuns: Map<string, ResponseRun[]> = new Map();
		for (const response of completedResponses) {
			const runs = await db
				.select()
				.from(responseRuns)
				.where(eq(responseRuns.responseId, response.id));

			allResponseRuns.set(response.id, runs as ResponseRun[]);
		}

		console.log(`\n📋 Resuming evaluation run: ${evalRunId}`);
		console.log(`  Status: ${evalRun.status}`);
		console.log(`  Completed variants: ${evalRun.responsesCompleted}/${evalRun.totalQuestions * 2}`);
		console.log(`  Current question: ${evalRun.currentQuestion}/${evalRun.totalQuestions}`);
		console.log(`  Last variant: ${evalRun.currentVariant || 'N/A'}`);
		console.log(`  Average score so far: ${evalRun.averageScore || 'N/A'}%`);

		return {
			evalRun,
			completedResponses,
			allResponseRuns
		};
	}

	/**
	 * Run full evaluation on all questions with multi-run consistency testing
	 * @param questions List of questions to evaluate
	 * @param resumeEvalRunId Optional evaluation run ID to resume from
	 * @returns Evaluation results summary with confidence intervals
	 */
	async runEvaluation(questions: Question[], resumeEvalRunId?: string): Promise<EvaluationResult> {
		console.log('='.repeat(70));
		console.log(`${resumeEvalRunId ? 'Resuming' : 'Starting'} evaluation: ${this.modelConfig.name} (${this.modelConfig.version})`);
		console.log(`Total questions: ${questions.length}`);
		console.log(`Runs per question-variant: ${this.runsPerQuestion}`);
		console.log(`Total evaluations: ${questions.length * 2 * this.runsPerQuestion}`);
		console.log('='.repeat(70));

		try {
			let modelId: string;
			let evalRunId: string;
			let completedVariants = 0;
			let startTime = Date.now();

			// Track which question-variant pairs are already completed
			const completedPairs = new Set<string>();

			// Handle resume vs new evaluation
			if (resumeEvalRunId) {
				// Load partial evaluation state
				const partialState = await this.loadPartialEvaluation(resumeEvalRunId);
				modelId = partialState.evalRun.modelId;
				evalRunId = resumeEvalRunId;
				completedVariants = partialState.evalRun.responsesCompleted || 0;

				// Mark completed question-variant pairs
				for (const response of partialState.completedResponses) {
					const key = `${response.questionId}:${response.questionVariant}`;
					completedPairs.add(key);
				}

				// Reset start time to account for previous work
				if (partialState.evalRun.startedAt) {
					startTime = partialState.evalRun.startedAt.getTime();
				}

				console.log(`✓ Loaded ${completedPairs.size} completed variants\n`);
			} else {
				// 1. Get or create model record
				const [existingModel] = await db
					.select()
					.from(models)
					.where(eq(models.name, this.modelConfig.name))
					.limit(1);

				if (existingModel) {
					modelId = existingModel.id;
				} else {
					const [newModel] = await db
						.insert(models)
						.values({
							name: this.modelConfig.name,
							version: this.modelConfig.version,
							provider: this.modelConfig.provider
						})
						.returning();
					modelId = newModel.id;
				}

				// 2. Create evaluation run
				const [evalRun] = await db
					.insert(evaluationRuns)
					.values({
						modelId,
						status: 'running',
						totalQuestions: questions.length,
						currentQuestion: 0,
						responsesCompleted: 0
					})
					.returning();

				evalRunId = evalRun.id;
				console.log(`✓ Created evaluation run: ${evalRunId}\n`);
			}

			// 3. Store all response statistics for score calculation
			// If resuming, load existing stats from completed responses
			const allResponseStats: Array<{
				mean_score: number;
				max_score: number;
				pillar_id: number;
				cv: number;
			}> = [];

			// Load existing stats if resuming
			if (resumeEvalRunId) {
				const existingResponses = await db
					.select()
					.from(responses)
					.where(eq(responses.evaluationRunId, evalRunId));

				for (const response of existingResponses) {
					allResponseStats.push({
						mean_score: parseFloat(response.meanScore),
						max_score: parseFloat((await db
							.select()
							.from(responseRuns)
							.where(eq(responseRuns.responseId, response.id))
							.limit(1))[0].maxScore),
						pillar_id: questions.find(q => q.id === response.questionId)!.pillar_id,
						cv: parseFloat(response.coefficientOfVariation)
					});
				}
			}

			const totalVariants = questions.length * 2; // explicit + implicit

			// 4. Process each question
			for (let idx = 0; idx < questions.length; idx++) {
				const question = questions[idx];
				console.log(`\nQuestion ${idx + 1}/${questions.length}: ${question.id}`);
				console.log(`  Pillar: ${question.pillar_id}, Hierarchy: ${question.truth_hierarchy}`);

				// Evaluate both variants
				for (const variant of ['explicit', 'implicit'] as const) {
					// Check if this variant is already completed
					const variantKey = `${question.id}:${variant}`;
					if (completedPairs.has(variantKey)) {
						console.log(`  → Skipping ${variant} variant (already completed)`);
						continue;
					}
					const questionText =
						variant === 'explicit' ? question.explicit_text : question.implicit_text;

					// Get variant-specific rubric (supports both legacy and differentiated formats)
					const rubric = getRubricForVariant(question, variant);

					console.log(`  → Testing ${variant} variant (${this.runsPerQuestion} runs)...`);
					console.log(`    Using rubric with ${rubric.criteria.length} criteria`);

					// Store runs for this question-variant
					const runs: Array<{
						responseText: string;
						score: number;
						maxScore: number;
						judgeReasoning: string;
					}> = [];

					// Run multiple times for consistency testing - ALL RUNS IN PARALLEL
					// Run 1: deterministic (temp=0, seed=0) for reproducibility
					// Runs 2+: random (temp=0.7) for consistency measurement
					console.log(`    Running ${this.runsPerQuestion} evaluations in parallel...`);

					const runPromises = Array.from({ length: this.runsPerQuestion }, async (_, idx) => {
						const runNum = idx + 1;
						const isDeterministicRun = runNum === 1;
						const temperature = isDeterministicRun ? 0.0 : 0.7;
						const seed = isDeterministicRun ? 0 : undefined;

						// Get model response with temperature and seed control
						const responseText = await this.testModel.generate(
							questionText,
							2000, // maxTokens
							temperature,
							undefined, // systemMessage
							seed
						);

						// Judge the response with variant-specific rubric
						const judgment = await this.judge.grade(
							questionText,
							responseText,
							rubric,
							question.reference_answer
						);

						const score = judgment.score;
						const maxScore = judgment.max_score;
						const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

						console.log(
							`    Run ${runNum}/${this.runsPerQuestion}${isDeterministicRun ? ' (deterministic: temp=0.0, seed=0)' : ''}: ${score.toFixed(1)}/${maxScore} (${percentage.toFixed(1)}%)`
						);

						return {
							responseText,
							score,
							maxScore,
							judgeReasoning: judgment.reasoning
						};
					});

					// Execute all runs in parallel
					const runResults = await Promise.all(runPromises);
					runs.push(...runResults);

					// Calculate statistics across runs
					const scores = runs.map((r) => r.score);
					const stats = calculateConsistencyMetrics(scores);

					// Run 1 is the deterministic baseline (temp=0, seed=0)
					const deterministicScore = runs[0].score;
					const deterministicMaxScore = runs[0].maxScore;
					const deterministicPercentage =
						deterministicMaxScore > 0 ? (deterministicScore / deterministicMaxScore) * 100 : 0;

					console.log(
						`    ⭐ Deterministic Score (Run 1): ${deterministicScore.toFixed(1)}/${deterministicMaxScore} (${deterministicPercentage.toFixed(1)}%)`
					);
					console.log(
						`    Statistics (all runs): mean=${stats.mean.toFixed(1)}, std=${stats.stdDev.toFixed(2)}, CV=${stats.coefficientOfVariation.toFixed(3)}`
					);

					// Store aggregated response
					// NOTE: runs[0] is the deterministic run (temp=0, seed=0) for reproducibility
					const [response] = await db
						.insert(responses)
						.values({
							evaluationRunId: evalRunId,
							questionId: question.id,
							modelId,
							questionVariant: variant,
							responseText: runs[0].responseText, // Deterministic response
							runCount: this.runsPerQuestion,
							meanScore: stats.mean.toFixed(2), // Mean across all runs
							stdDev: stats.stdDev.toFixed(2),
							minScore: stats.min.toFixed(2),
							maxScore: stats.max.toFixed(2),
							coefficientOfVariation: stats.coefficientOfVariation.toFixed(4),
							judgeReasoning: runs[0].judgeReasoning // Deterministic reasoning
						})
						.returning();

					// Store individual runs
					for (let i = 0; i < runs.length; i++) {
						await db.insert(responseRuns).values({
							responseId: response.id,
							runNumber: i + 1,
							responseText: runs[i].responseText,
							score: runs[i].score.toFixed(2),
							maxScore: runs[i].maxScore.toFixed(2),
							judgeReasoning: runs[i].judgeReasoning
						});
					}

					// Track for aggregate calculation
					allResponseStats.push({
						mean_score: stats.mean,
						max_score: runs[0].maxScore, // All runs have same maxScore
						pillar_id: question.pillar_id,
						cv: stats.coefficientOfVariation
					});

					completedVariants++;

					// Calculate progress
					const elapsedSeconds = (Date.now() - startTime) / 1000;
					const avgSecondsPerVariant = elapsedSeconds / completedVariants;
					const remainingVariants = totalVariants - completedVariants;
					const estimatedTimeRemaining = Math.round(
						avgSecondsPerVariant * remainingVariants
					);

					const currentScore =
						allResponseStats.reduce((sum, r) => sum + r.mean_score, 0) /
						allResponseStats.reduce((sum, r) => sum + r.max_score, 0);

					const averageScorePercent = currentScore * 100;

					// Update progress in database
					await db
						.update(evaluationRuns)
						.set({
							currentQuestion: idx + 1,
							currentQuestionId: question.id,
							currentVariant: variant,
							responsesCompleted: completedVariants,
							averageScore: averageScorePercent.toFixed(2),
							estimatedTimeRemaining
						})
						.where(eq(evaluationRuns.id, evalRunId));

					// Report progress to callback
					if (this.progressCallback) {
						await this.progressCallback({
							evaluationRunId: evalRunId,
							modelId,
							status: 'running',
							currentQuestion: idx + 1,
							totalQuestions: questions.length,
							currentQuestionId: question.id,
							currentVariant: variant,
							totalRuns: this.runsPerQuestion,
							responsesCompleted: completedVariants,
							averageScore: averageScorePercent,
							startedAt: new Date(startTime),
							estimatedTimeRemaining
						});
					}
				}
			}

			// 5. Calculate and store aggregate scores with confidence intervals
			console.log('\nCalculating aggregate scores and confidence intervals...');

			// Calculate pillar scores with CIs
			const pillarScoreMap = new Map<
				number,
				{ scores: number[]; normalizedScores: number[] }
			>();

			for (const response of allResponseStats) {
				const pillarId = response.pillar_id;
				const normalizedScore = (response.mean_score / response.max_score) * 100;

				const current = pillarScoreMap.get(pillarId) || {
					scores: [],
					normalizedScores: []
				};
				current.scores.push(response.mean_score);
				current.normalizedScores.push(normalizedScore);
				pillarScoreMap.set(pillarId, current);
			}

			// Insert pillar scores with confidence intervals
			for (const [pillarId, { normalizedScores }] of pillarScoreMap.entries()) {
				const ci = calculateBootstrapCI(normalizedScores, 0.95);
				const variance = calculateConsistencyMetrics(normalizedScores).variance;

				await db.insert(pillarScores).values({
					evaluationRunId: evalRunId,
					modelId,
					pillarId,
					avgScore: ci.mean.toFixed(2),
					avgScoreCiLower: ci.lower.toFixed(2),
					avgScoreCiUpper: ci.upper.toFixed(2),
					sampleVariance: variance.toFixed(2),
					questionCount: normalizedScores.length
				});

				console.log(
					`  Pillar ${pillarId}: ${ci.mean.toFixed(1)}% (95% CI: ${ci.lower.toFixed(1)}-${ci.upper.toFixed(1)}%)`
				);
			}

			// Calculate overall scores with confidence intervals
			const normalizedScores = allResponseStats.map(
				(r) => (r.mean_score / r.max_score) * 100
			);
			const overallCI = calculateBootstrapCI(normalizedScores, 0.95);
			const overallScore = overallCI.mean;

			// Calculate consistency score (average across all responses)
			const consistencyScore = calculateAverageConsistencyScore(
				allResponseStats.map((r) => ({ coefficientOfVariation: r.cv }))
			);

			// Calculate score variance
			const scoreVariance = calculateConsistencyMetrics(normalizedScores).variance;

			// For now, weighted score equals overall score
			// TODO: Implement hierarchy-based weighting
			const weightedScore = overallScore;
			const weightedCI = overallCI; // Same CI for now

			await db.insert(modelScores).values({
				modelId,
				evaluationRunId: evalRunId,
				overallScore: overallScore.toFixed(2),
				overallScoreCiLower: overallCI.lower.toFixed(2),
				overallScoreCiUpper: overallCI.upper.toFixed(2),
				weightedScore: weightedScore.toFixed(2),
				weightedScoreCiLower: weightedCI.lower.toFixed(2),
				weightedScoreCiUpper: weightedCI.upper.toFixed(2),
				scoreVariance: scoreVariance.toFixed(2),
				consistencyScore: consistencyScore.toFixed(2),
				totalQuestions: allResponseStats.length
			});

			console.log(`\nOverall Score: ${overallScore.toFixed(2)}%`);
			console.log(
				`  95% CI: [${overallCI.lower.toFixed(2)}%, ${overallCI.upper.toFixed(2)}%]`
			);
			console.log(`Consistency Score: ${consistencyScore.toFixed(1)}/100`);

			// 6. Mark evaluation run as completed
			await db
				.update(evaluationRuns)
				.set({
					status: 'completed',
					completedAt: new Date()
				})
				.where(eq(evaluationRuns.id, evalRunId));

			console.log('\n' + '='.repeat(70));
			console.log('✓ EVALUATION COMPLETE');
			console.log('='.repeat(70));
			console.log(`Overall Score: ${overallScore.toFixed(2)}%`);
			console.log(
				`  95% Confidence Interval: [${overallCI.lower.toFixed(2)}%, ${overallCI.upper.toFixed(2)}%]`
			);
			console.log(`Consistency Score: ${consistencyScore.toFixed(1)}/100`);
			console.log(`Weighted Score: ${weightedScore.toFixed(2)}%`);
			console.log(`Total Question-Variants: ${allResponseStats.length}`);
			console.log(`Runs per Question-Variant: ${this.runsPerQuestion}`);
			console.log(`Evaluation Run ID: ${evalRunId}`);
			console.log('='.repeat(70));

			// Final progress callback
			if (this.progressCallback) {
				await this.progressCallback({
					evaluationRunId: evalRunId,
					modelId,
					status: 'completed',
					currentQuestion: questions.length,
					totalQuestions: questions.length,
					totalRuns: this.runsPerQuestion,
					responsesCompleted: allResponseStats.length,
					averageScore: overallScore,
					startedAt: new Date(startTime),
					estimatedTimeRemaining: 0
				});
			}

			return {
				eval_run_id: evalRunId,
				model_id: modelId,
				overall_score: overallScore,
				overall_score_ci: {
					lower: overallCI.lower,
					upper: overallCI.upper
				},
				weighted_score: weightedScore,
				weighted_score_ci: {
					lower: weightedCI.lower,
					upper: weightedCI.upper
				},
				consistency_score: consistencyScore,
				total_responses: allResponseStats.length
			};
		} catch (error) {
			console.error(`\n❌ Evaluation failed: ${error}`);
			throw error;
		}
	}
}
