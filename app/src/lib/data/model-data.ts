/**
 * Unified model data module
 * Combines evaluation scores and cost data for charting and visualization
 *
 * This module contains browser-safe utilities for working with model data.
 * Data loading happens server-side in +page.server.ts
 */

import type { ScoresSummary, ModelSummary } from '$lib/server/eval/scores-loader';
import type { CostsSummary, ModelCost } from '$lib/server/eval/costs-loader';

// Provider color mapping for consistent visualization
const PROVIDER_COLORS: Record<string, string> = {
	openai: '#10a37f',
	anthropic: '#d97757',
	xai: '#1da1f2',
	nousresearch: '#9333ea',
	deepseek: '#3b82f6'
};

export interface ModelDataPoint {
	id: string;
	name: string;
	version: string;
	provider: string;
	cost: number; // Average cost per 1M tokens (USD)
	performance: number; // CADRE benchmark score (0-100)
	modelFamily?: string; // For grouping lines (e.g., "gpt-4", "claude-sonnet")
	pillarScores: {
		creed: number;
		sacraments: number;
		moralLife: number;
		prayer: number;
	};
	inputCost: number; // Cost per 1M input tokens
	outputCost: number; // Cost per 1M output tokens
}

/**
 * Get color for a provider
 */
export function getProviderColor(provider: string): string {
	return PROVIDER_COLORS[provider] || '#6b7280'; // Default gray for unknown providers
}

/**
 * Extract model family from model ID
 * Used for grouping related models with lines on the chart
 */
function getModelFamily(modelId: string): string {
	// Remove version suffixes like -alpha, -turbo, -fast, etc.
	const baseId = modelId.replace(/-alpha$|-turbo$|-fast$|-free$/, '');

	// Extract family patterns
	if (baseId.startsWith('gpt-4')) return 'gpt-4';
	if (baseId.startsWith('claude-3-haiku')) return 'claude-haiku';
	if (baseId.startsWith('claude-3.5-haiku')) return 'claude-haiku';
	if (baseId.startsWith('claude-haiku')) return 'claude-haiku';
	if (baseId.startsWith('claude-3-sonnet')) return 'claude-sonnet';
	if (baseId.startsWith('claude-sonnet')) return 'claude-sonnet';
	if (baseId.startsWith('grok-4')) return 'grok-4';
	if (baseId.startsWith('grok-3')) return 'grok-3';
	if (baseId.startsWith('grok')) return 'grok';
	if (baseId.startsWith('hermes-4')) return 'hermes-4';
	if (baseId.startsWith('deepseek')) return 'deepseek';

	return baseId;
}

/**
 * Helper function to get cost data for a specific model
 * Handles model ID suffix matching (e.g., "gpt-4-alpha" matches "gpt-4")
 */
function getModelCost(costs: CostsSummary, modelId: string): ModelCost | null {
	// Try exact match first
	let cost = costs.model_costs.find((c) => c.model_id === modelId);

	// If not found and modelId has suffix (e.g., "-alpha"), try without suffix
	if (!cost && modelId.includes('-')) {
		const baseId = modelId.split('-').slice(0, -1).join('-');
		cost = costs.model_costs.find((c) => c.model_id === baseId);
	}

	return cost || null;
}

/**
 * Calculate average cost per 1M tokens
 */
function getAverageCost(cost: ModelCost): number {
	return (cost.cost_per_1m_input_tokens + cost.cost_per_1m_output_tokens) / 2;
}

/**
 * Transform pre-loaded scores and costs data into ModelDataPoint array
 * This is a pure function with no file I/O - safe to call from server-side code
 *
 * @param scoresData Pre-loaded scores summary from ScoresLoader
 * @param costsData Pre-loaded costs summary from CostsLoader
 * @returns Array of model data points with merged scores and costs
 */
export function transformModelData(
	scoresData: ScoresSummary,
	costsData: CostsSummary
): ModelDataPoint[] {
	const modelDataPoints: ModelDataPoint[] = [];

	// Iterate through models with scores and try to find matching costs
	for (const modelSummary of scoresData.leaderboard) {
		// Get cost data for this model
		const costData = getModelCost(costsData, modelSummary.model_id);

		if (!costData) {
			console.warn(`⚠️  No cost data found for model: ${modelSummary.model_id}`);
			continue; // Skip models without cost data
		}

		// Calculate average cost
		const avgCost = getAverageCost(costData);

		// Map pillar scores from IDs to names
		const pillarScores = {
			creed: modelSummary.pillar_scores['1'].score,
			sacraments: modelSummary.pillar_scores['2'].score,
			moralLife: modelSummary.pillar_scores['3'].score,
			prayer: modelSummary.pillar_scores['4'].score
		};

		modelDataPoints.push({
			id: modelSummary.model_id,
			name: modelSummary.name,
			version: modelSummary.version,
			provider: modelSummary.provider,
			cost: avgCost,
			performance: modelSummary.overall_score,
			modelFamily: getModelFamily(modelSummary.model_id),
			pillarScores,
			inputCost: costData.cost_per_1m_input_tokens,
			outputCost: costData.cost_per_1m_output_tokens
		});
	}

	return modelDataPoints;
}
