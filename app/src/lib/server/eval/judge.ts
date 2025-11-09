/**
 * LLM-as-judge using Claude Opus 4.1 via OpenRouter
 * Replaces care_eval/judge.py
 */

import { OpenRouterClient } from './openrouter';
import type { Rubric, JudgmentResult } from './types';

interface JudgeResponseSchema {
	criteria_evaluations: Array<{
		criterion: string;
		met: boolean;
		score: number;
		feedback: string;
	}>;
	overall_reasoning: string;
	final_score: number;
}

export class LLMJudge {
	private client: OpenRouterClient;

	constructor(apiKey: string, timeoutMs: number = 300000) {
		// Use Claude Opus 4.1 for judging
		this.client = new OpenRouterClient(apiKey, 'anthropic/claude-opus-4.1', timeoutMs);
	}

	/**
	 * Grade a model's response using the provided rubric
	 * @param question The question that was asked
	 * @param response The model's response to grade
	 * @param rubric Grading criteria with weights
	 * @param referenceAnswer Optional reference answer for comparison
	 * @returns Judgment result with score, reasoning, and criteria breakdown
	 */
	async grade(
		question: string,
		response: string,
		rubric: Rubric,
		referenceAnswer?: string
	): Promise<JudgmentResult> {
		const prompt = this.buildJudgePrompt(question, response, rubric, referenceAnswer);

		try {
			const judgmentText = await this.client.generate(
				prompt,
				2000,
				0.0, // zero temperature for deterministic grading
				'You are a precise grading assistant. You MUST respond with valid JSON only, following the exact schema provided. Do not include any text outside the JSON structure.'
			);

			return this.parseJudgment(judgmentText, rubric);
		} catch (error) {
			throw new Error(`Judge API call failed: ${error}`);
		}
	}

	/**
	 * Build the prompt for the judge model
	 */
	private buildJudgePrompt(
		question: string,
		response: string,
		rubric: Rubric,
		referenceAnswer?: string
	): string {
		const criteriaText = rubric.criteria
			.map(
				(c) => `- ${c.name} (weight: ${c.weight}, required: ${c.required})`
			)
			.join('\n');

		const referenceSection = referenceAnswer
			? `\n## Reference Answer\n${referenceAnswer}\n`
			: '';

		return `CRITICAL: You MUST respond with valid JSON only. Do not include any text before or after the JSON structure.

You are an expert Catholic theologian tasked with evaluating AI model responses for accuracy and alignment with Catholic teaching.

## Required Output Format

Respond ONLY with this exact JSON structure (no additional text):

\`\`\`json
{
  "criteria_evaluations": [
    {
      "criterion": "criterion name",
      "met": true/false,
      "score": numeric score,
      "feedback": "brief explanation"
    }
  ],
  "overall_reasoning": "Your overall assessment of the response's theological accuracy and completeness",
  "final_score": numeric score out of ${rubric.max_score}
}
\`\`\`

## Question
${question}

## Model Response
${response}
${referenceSection}
## Grading Rubric
Maximum Score: ${rubric.max_score}

Criteria:
${criteriaText}

## Evaluation Instructions
Evaluate the model's response against each criterion:
1. Assess whether it meets the requirement
2. Assign a score based on the criterion's weight (multiply weight by ${rubric.max_score} for score out of ${rubric.max_score})
3. Note if any required criteria are missing (these must be present for a passing grade)

Be rigorous in assessing theological precision. Heterodox or heretical statements should result in significant score deductions. Missing required dogmatic elements should fail the response entirely.

REMINDER: Output ONLY the JSON structure above. No additional commentary.`;
	}

	/**
	 * Parse the judge's structured response
	 */
	private parseJudgment(judgmentText: string, rubric: Rubric): JudgmentResult {
		try {
			// Extract JSON from markdown code block if present
			let jsonStr = judgmentText;

			if (judgmentText.includes('```json')) {
				const jsonStart = judgmentText.indexOf('```json') + 7;
				const jsonEnd = judgmentText.indexOf('```', jsonStart);
				jsonStr = judgmentText.substring(jsonStart, jsonEnd).trim();
			} else if (judgmentText.includes('```')) {
				// Try generic code block
				const jsonStart = judgmentText.indexOf('```') + 3;
				const jsonEnd = judgmentText.indexOf('```', jsonStart);
				jsonStr = judgmentText.substring(jsonStart, jsonEnd).trim();
			}

			const judgment = JSON.parse(jsonStr) as JudgeResponseSchema;

			return {
				score: judgment.final_score,
				max_score: rubric.max_score,
				reasoning: judgment.overall_reasoning,
				criteria_scores: judgment.criteria_evaluations
			};
		} catch (error) {
			console.error('  ⚠️  Failed to parse judge JSON, attempting text extraction:', error);

			// Fallback: try to extract score from text
			const scorePatterns = [
				/final[_\s]score[:\s]+(\d+(?:\.\d+)?)/i,
				/score[:\s]+(\d+(?:\.\d+)?)\s*(?:out of|\/)/i,
				/(\d+(?:\.\d+)?)\s*(?:out of|\/)\s*\d+/i,
				/receives?\s+(\d+(?:\.\d+)?)\s+points/i
			];

			let extractedScore = 0.0;

			for (const pattern of scorePatterns) {
				const match = judgmentText.match(pattern);
				if (match) {
					extractedScore = parseFloat(match[1]);
					console.log(`  ℹ️  Extracted score from text: ${extractedScore}`);
					break;
				}
			}

			if (extractedScore === 0.0) {
				console.error('  ⚠️  Could not extract score, defaulting to 0.0');
			}

			return {
				score: extractedScore,
				max_score: rubric.max_score,
				reasoning: `[JSON parsing failed] ${judgmentText.substring(0, 300)}`,
				criteria_scores: []
			};
		}
	}
}
