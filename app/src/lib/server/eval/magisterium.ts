/**
 * Magisterium API client
 * Uses rate limiting to enforce 5 RPM limit
 */

import Magisterium from 'magisterium';
import { rateLimiter } from './rate-limiter.js';

// Conditional import for SvelteKit environment variables
// Falls back to process.env when running in script context
let env: Record<string, string | undefined>;
try {
	const svelteEnv = await import('$env/dynamic/private');
	env = svelteEnv.env;
} catch {
	// Running in script context (tsx), use process.env
	env = process.env;
}

// Magisterium rate limit: 5 requests per minute
const MAGISTERIUM_RPM_LIMIT = 5;

interface MagisteriumMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export class MagisteriumClient {
	private client: Magisterium;
	private modelName: string;
	private timeoutMs: number;

	constructor(apiKey: string, modelName: string, timeoutMs: number = 300000) {
		this.client = new Magisterium({
			apiKey
		});
		this.modelName = modelName;
		this.timeoutMs = timeoutMs; // Default 300s (5 minutes)
	}

	/**
	 * Generate a response using Magisterium's API with retry logic and rate limiting
	 * @param prompt The input prompt
	 * @param maxTokens Maximum tokens in response
	 * @param temperature Sampling temperature
	 * @param systemMessage Optional system message
	 * @param seed Optional seed for deterministic generation (undefined = random)
	 * @returns The model's response text
	 */
	async generate(
		prompt: string,
		maxTokens: number = 2000,
		temperature: number = 0.7,
		systemMessage?: string,
		seed?: number
	): Promise<string> {
		const maxRetries = 3;
		const retryDelay = 2000; // ms

		const messages: MagisteriumMessage[] = [];

		if (systemMessage) {
			messages.push({
				role: 'system',
				content: systemMessage
			});
		}

		messages.push({
			role: 'user',
			content: prompt
		});

		for (let attempt = 0; attempt < maxRetries; attempt++) {
			try {
				// Use rate limiter to enforce 5 RPM limit
				const result = await rateLimiter.throttle(
					'magisterium',
					MAGISTERIUM_RPM_LIMIT,
					async () => {
						const payload: any = {
							model: this.modelName,
							messages,
							max_tokens: maxTokens,
							temperature
						};

						// Add seed if provided (for deterministic generation)
						if (seed !== undefined) {
							payload.seed = seed;
						}

						// Use AbortSignal for timeout
						const controller = new AbortController();
						const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

						try {
							const response = await this.client.chat.completions.create(payload);
							clearTimeout(timeoutId);
							return response;
						} catch (error) {
							clearTimeout(timeoutId);
							throw error;
						}
					}
				);

				if (result.choices && result.choices.length > 0) {
					const content = result.choices[0].message.content;

					// Handle case where content exists
					if (content && content.trim().length > 0) {
						return content.trim();
					}

					// Handle case where content is empty but citations exist
					if (result.citations && Array.isArray(result.citations) && result.citations.length > 0) {
						console.log(`  ⚠️  Empty content but ${result.citations.length} citations present. Extracting from citations...`);
						// Attempt to extract text from citations as fallback
						const extractedText = result.citations
							.map((citation: any) => citation.cited_text || '')
							.filter((text: string) => text.trim().length > 0)
							.join('\n\n');

						if (extractedText.trim().length > 0) {
							console.log(`  ✓ Extracted ${extractedText.length} characters from citations`);
							return extractedText.trim();
						}
					}

					// If we get here, we have no usable content
					throw new Error(
						`Empty response content. Choices: ${result.choices.length}, ` +
						`Citations: ${result.citations?.length || 0}, ` +
						`Response: ${JSON.stringify(result).substring(0, 500)}...`
					);
				} else {
					throw new Error(`Unexpected response format: ${JSON.stringify(result)}`);
				}
			} catch (error) {
				if (attempt < maxRetries - 1) {
					const delay = retryDelay * (attempt + 1);
					console.log(
						`  ⚠️  Magisterium error (attempt ${attempt + 1}/${maxRetries}): ${error}`
					);
					console.log(`  ⏳ Retrying in ${delay}ms...`);
					await new Promise((resolve) => setTimeout(resolve, delay));
				} else {
					throw new Error(`Magisterium failed after ${maxRetries} attempts: ${error}`);
				}
			}
		}

		throw new Error('Magisterium request failed');
	}
}

/**
 * Model configurations for Magisterium models
 */
export const MAGISTERIUM_MODEL_CONFIGS = {
	'magisterium-1': {
		name: 'Magisterium 1',
		version: 'magisterium-1',
		provider: 'magisterium',
		magisterium_model: 'magisterium-1'
	}
} as const;

export type MagisteriumModelName = keyof typeof MAGISTERIUM_MODEL_CONFIGS;
