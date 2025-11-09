/**
 * YAML question loader with validation
 */

import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import type { Question } from './types';

// Zod schemas for validation
const RubricCriterionSchema = z.object({
	name: z.string(),
	weight: z.number().min(0).max(1),
	required: z.boolean().default(false)
});

const RubricSchema = z.object({
	max_score: z.number().default(100),
	criteria: z.array(RubricCriterionSchema)
});

const QuestionSchema = z.object({
	id: z.string(),
	pillar_id: z.number().min(1).max(4),
	truth_hierarchy: z.number().min(1).max(4),
	weight: z.number().min(0).default(1.0),
	explicit_text: z.string(),
	implicit_text: z.string(),
	reference_answer: z.string().optional(),
	source_citations: z.array(z.string()).default([]),
	// Differentiated rubrics for explicit vs implicit variants
	rubrics: z.object({
		explicit: RubricSchema,
		implicit: RubricSchema
	})
});

const QuestionsFileSchema = z.object({
	questions: z.array(QuestionSchema)
});

export class QuestionLoader {
	/**
	 * Load questions from a YAML file
	 * @param filePath Path to the questions.yaml file
	 * @returns Array of validated Question objects
	 */
	static load(filePath: string): Question[] {
		try {
			const fileContent = readFileSync(filePath, 'utf-8');
			const data = parseYaml(fileContent);

			// Validate structure
			const validated = QuestionsFileSchema.parse(data);

			// Validate rubric weights for each question
			for (const question of validated.questions) {
				this.validateRubricWeights(question);
			}

			console.log(`✓ Loaded ${validated.questions.length} questions from ${filePath}`);
			return validated.questions as Question[];
		} catch (error) {
			if (error instanceof z.ZodError) {
				console.error('❌ Validation error in questions file:');
				console.error(error.issues);
				throw new Error(`YAML validation failed: ${error.message}`);
			}
			throw error;
		}
	}

	/**
	 * Validate that rubric criterion weights sum to approximately 1.0
	 * Validates both explicit and implicit rubrics
	 * @param question Question to validate
	 * @returns true if all rubric weights sum to 1.0 (±0.01)
	 */
	static validateRubricWeights(question: Question): boolean {
		let allValid = true;

		const rubricsToValidate = [
			{ rubric: question.rubrics.explicit, label: 'explicit' },
			{ rubric: question.rubrics.implicit, label: 'implicit' }
		];

		for (const { rubric, label } of rubricsToValidate) {
			const totalWeight = rubric.criteria.reduce((sum: number, c: any) => sum + c.weight, 0);

			if (totalWeight < 0.99 || totalWeight > 1.01) {
				console.warn(
					`⚠️  Warning: ${label} rubric weights for question '${question.id}' ` +
						`sum to ${totalWeight.toFixed(2)}, not 1.0`
				);
				allValid = false;
			}
		}

		return allValid;
	}
}
