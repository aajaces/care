/**
 * Loader for model cost data from costs.yaml
 * Provides pricing information for models in cost per 1M tokens
 */

import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

// Zod schemas for validation
const ModelCostSchema = z.object({
	model_id: z.string(),
	cost_per_1m_input_tokens: z.union([z.number(), z.string()]).transform((val) =>
		typeof val === 'string' ? parseFloat(val) : val
	),
	cost_per_1m_output_tokens: z.union([z.number(), z.string()]).transform((val) =>
		typeof val === 'string' ? parseFloat(val) : val
	)
});

const CostsSummarySchema = z.object({
	version: z.string(),
	model_costs: z.array(ModelCostSchema)
});

export type ModelCost = z.infer<typeof ModelCostSchema>;
export type CostsSummary = z.infer<typeof CostsSummarySchema>;

export class CostsLoader {
	/**
	 * Load costs data from a YAML file
	 * @param filePath Path to the costs YAML file
	 * @returns Validated costs data
	 */
	static load(filePath: string): CostsSummary | null {
		try {
			const fileContent = readFileSync(filePath, 'utf-8');
			const data = parseYaml(fileContent);

			// Validate structure
			const validated = CostsSummarySchema.parse(data);

			console.log(
				`✓ Loaded costs data: ${validated.model_costs.length} models (version: ${validated.version})`
			);
			return validated;
		} catch (error) {
			if (error instanceof z.ZodError) {
				console.error('❌ Validation error in costs file:');
				console.error(error.issues);
				return null;
			}
			// If file doesn't exist or can't be parsed
			console.warn(`⚠️  Could not load costs data from ${filePath}`);
			return null;
		}
	}

	/**
	 * Get cost data for a specific model
	 * @param costs Costs summary data
	 * @param modelId Model ID to look up
	 * @returns Model cost data or null if not found
	 */
	static getModelCost(costs: CostsSummary, modelId: string): ModelCost | null {
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
	 * @param cost Model cost data
	 * @returns Average of input and output costs
	 */
	static getAverageCost(cost: ModelCost): number {
		return (cost.cost_per_1m_input_tokens + cost.cost_per_1m_output_tokens) / 2;
	}

	/**
	 * Convert costs to a map for easy lookup
	 * @param costs Costs summary data
	 * @returns Map of model_id to ModelCost
	 */
	static toMap(costs: CostsSummary): Map<string, ModelCost> {
		const map = new Map<string, ModelCost>();
		costs.model_costs.forEach((cost) => {
			map.set(cost.model_id, cost);
		});
		return map;
	}
}
