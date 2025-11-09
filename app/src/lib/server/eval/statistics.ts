/**
 * Statistical analysis functions for evaluation results
 * Includes bootstrap confidence intervals, consistency metrics, and aggregations
 */

export interface ConsistencyMetrics {
	mean: number;
	stdDev: number;
	coefficientOfVariation: number;
	min: number;
	max: number;
	variance: number;
}

export interface ConfidenceInterval {
	lower: number;
	upper: number;
	mean: number;
}

/**
 * Calculate descriptive statistics for a set of scores
 */
export function calculateConsistencyMetrics(scores: number[]): ConsistencyMetrics {
	if (scores.length === 0) {
		return { mean: 0, stdDev: 0, coefficientOfVariation: 0, min: 0, max: 0, variance: 0 };
	}

	const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;

	if (scores.length === 1) {
		return {
			mean,
			stdDev: 0,
			coefficientOfVariation: 0,
			min: scores[0],
			max: scores[0],
			variance: 0
		};
	}

	const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / (scores.length - 1);
	const stdDev = Math.sqrt(variance);
	const coefficientOfVariation = mean !== 0 ? (stdDev / mean) : 0;

	return {
		mean,
		stdDev,
		coefficientOfVariation,
		min: Math.min(...scores),
		max: Math.max(...scores),
		variance
	};
}

/**
 * Calculate bootstrap confidence interval
 * More robust than normal approximation, especially for small samples
 *
 * @param scores Original sample scores
 * @param confidenceLevel Confidence level (default 0.95 for 95% CI)
 * @param iterations Number of bootstrap iterations (default 10000)
 */
export function calculateBootstrapCI(
	scores: number[],
	confidenceLevel: number = 0.95,
	iterations: number = 10000
): ConfidenceInterval {
	if (scores.length === 0) {
		return { lower: 0, upper: 0, mean: 0 };
	}

	if (scores.length === 1) {
		return { lower: scores[0], upper: scores[0], mean: scores[0] };
	}

	const bootstrapMeans: number[] = [];

	// Generate bootstrap samples
	for (let i = 0; i < iterations; i++) {
		const resample = resampleWithReplacement(scores);
		const resampleMean = resample.reduce((sum, val) => sum + val, 0) / resample.length;
		bootstrapMeans.push(resampleMean);
	}

	// Sort bootstrap means
	bootstrapMeans.sort((a, b) => a - b);

	// Calculate percentiles for CI
	const alpha = 1 - confidenceLevel;
	const lowerIndex = Math.floor(bootstrapMeans.length * (alpha / 2));
	const upperIndex = Math.floor(bootstrapMeans.length * (1 - alpha / 2));

	const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;

	return {
		lower: bootstrapMeans[lowerIndex],
		upper: bootstrapMeans[upperIndex],
		mean
	};
}

/**
 * Resample array with replacement (for bootstrap)
 */
function resampleWithReplacement<T>(array: T[]): T[] {
	const resample: T[] = [];
	for (let i = 0; i < array.length; i++) {
		const randomIndex = Math.floor(Math.random() * array.length);
		resample.push(array[randomIndex]);
	}
	return resample;
}

/**
 * Calculate consistency score from coefficient of variation
 * Returns a score from 0-100 where higher = more consistent
 *
 * CV < 0.1 (10%) = highly consistent → ~90-100 score
 * CV 0.3 (30%) = moderate → ~70 score
 * CV > 0.5 (50%) = inconsistent → <50 score
 */
export function calculateConsistencyScore(coefficientOfVariation: number): number {
	// Transform CV to 0-100 scale (inverted)
	// Using exponential decay: score = 100 * e^(-3*CV)
	const score = 100 * Math.exp(-3 * coefficientOfVariation);
	return Math.max(0, Math.min(100, score));
}

/**
 * Calculate average consistency score across multiple responses
 */
export function calculateAverageConsistencyScore(
	responses: Array<{ coefficientOfVariation: number }>
): number {
	if (responses.length === 0) return 0;

	const consistencyScores = responses.map((r) => calculateConsistencyScore(r.coefficientOfVariation));
	return consistencyScores.reduce((sum, score) => sum + score, 0) / consistencyScores.length;
}

/**
 * Convert percentage scores to normalized 0-1 scale for statistical operations
 */
export function normalizeScores(scores: number[], maxScore: number = 100): number[] {
	return scores.map((score) => score / maxScore);
}

/**
 * Convert normalized 0-1 scores back to percentage scale
 */
export function denormalizeScores(normalizedScores: number[], maxScore: number = 100): number[] {
	return normalizedScores.map((score) => score * maxScore);
}

/**
 * Statistical significance test between two models (Welch's t-test)
 * Returns p-value (< 0.05 typically indicates significant difference)
 */
export function welchTTest(
	scores1: number[],
	scores2: number[]
): { tStatistic: number; pValue: number; significant: boolean } {
	if (scores1.length === 0 || scores2.length === 0) {
		return { tStatistic: 0, pValue: 1, significant: false };
	}

	const metrics1 = calculateConsistencyMetrics(scores1);
	const metrics2 = calculateConsistencyMetrics(scores2);

	// Welch's t-statistic
	const numerator = metrics1.mean - metrics2.mean;
	const denominator = Math.sqrt(
		metrics1.variance / scores1.length + metrics2.variance / scores2.length
	);

	const tStatistic = numerator / denominator;

	// Degrees of freedom (Welch-Satterthwaite equation)
	const s1Sq = metrics1.variance / scores1.length;
	const s2Sq = metrics2.variance / scores2.length;
	const df =
		Math.pow(s1Sq + s2Sq, 2) /
		(Math.pow(s1Sq, 2) / (scores1.length - 1) + Math.pow(s2Sq, 2) / (scores2.length - 1));

	// Approximate p-value using two-tailed test
	// For simplicity, using rough approximation (would use t-distribution in production)
	const pValue = 2 * (1 - approximateCDF(Math.abs(tStatistic), df));

	return {
		tStatistic,
		pValue,
		significant: pValue < 0.05
	};
}

/**
 * Approximate cumulative distribution function for t-distribution
 * Simple approximation for moderate sample sizes
 */
function approximateCDF(t: number, df: number): number {
	// For large df (>30), t-distribution ≈ normal distribution
	if (df > 30) {
		return normalCDF(t);
	}

	// For smaller df, use rough approximation
	const z = t / Math.sqrt(1 + t * t / df);
	return normalCDF(z);
}

/**
 * Standard normal CDF approximation
 */
function normalCDF(z: number): number {
	// Abramowitz and Stegun approximation
	const t = 1 / (1 + 0.2316419 * Math.abs(z));
	const d = 0.3989423 * Math.exp((-z * z) / 2);
	const p =
		d *
		t *
		(0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

	return z > 0 ? 1 - p : p;
}
