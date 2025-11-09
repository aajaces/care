/**
 * OpenRouter API client for unified LLM access
 * Replaces care_eval/models/openrouter.py
 */

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

interface OpenRouterMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

interface OpenRouterResponse {
	choices: Array<{
		message: {
			content: string;
		};
	}>;
}

export class OpenRouterClient {
	private apiKey: string;
	private modelName: string;
	private baseUrl = 'https://openrouter.ai/api/v1';
	private timeoutMs: number;

	constructor(apiKey: string, modelName: string, timeoutMs: number = 300000) {
		this.apiKey = apiKey;
		this.modelName = modelName;
		this.timeoutMs = timeoutMs; // Default 300s (5 minutes)
	}

	/**
	 * Generate a response using OpenRouter's API with retry logic
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

		const messages: OpenRouterMessage[] = [];

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

		const headers = {
			'Authorization': `Bearer ${this.apiKey}`,
			'Content-Type': 'application/json',
			'HTTP-Referer': env.OPENROUTER_HTTP_REFERER || 'https://github.com/aajaces/care',
			'X-Title': 'CADRE - Catholic Alignment Evaluation'
		};

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

		for (let attempt = 0; attempt < maxRetries; attempt++) {
			try {
				const response = await fetch(`${this.baseUrl}/chat/completions`, {
					method: 'POST',
					headers,
					body: JSON.stringify(payload),
					signal: AbortSignal.timeout(this.timeoutMs)
				});

				if (!response.ok) {
					const errorText = await response.text();
					throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
				}

				const data = (await response.json()) as OpenRouterResponse;

				if (data.choices && data.choices.length > 0) {
					return data.choices[0].message.content.trim();
				} else {
					throw new Error(`Unexpected response format: ${JSON.stringify(data)}`);
				}
			} catch (error) {
				if (attempt < maxRetries - 1) {
					const delay = retryDelay * (attempt + 1);
					console.log(
						`  ⚠️  OpenRouter error (attempt ${attempt + 1}/${maxRetries}): ${error}`
					);
					console.log(`  ⏳ Retrying in ${delay}ms...`);
					await new Promise((resolve) => setTimeout(resolve, delay));
				} else {
					throw new Error(
						`OpenRouter failed after ${maxRetries} attempts: ${error}`
					);
				}
			}
		}

		throw new Error('OpenRouter request failed');
	}
}

/**
 * Model configurations for common models
 */
export const MODEL_CONFIGS = {
	'gpt-4': {
		name: 'GPT-4',
		version: 'gpt-4',
		provider: 'openai',
		openrouter_model: 'openai/gpt-4'
	},
	'gpt-4-turbo': {
		name: 'GPT-4 Turbo',
		version: 'gpt-4-turbo',
		provider: 'openai',
		openrouter_model: 'openai/gpt-4-turbo'
	},
	'claude-3-haiku': {
		name: 'Claude 3 Haiku',
		version: 'claude-3-haiku',
		provider: 'anthropic',
		openrouter_model: 'anthropic/claude-3-haiku'
	},
	'claude-3.5-haiku': {
		name: 'Claude 3.5 Haiku',
		version: 'claude-3.5-haiku',
		provider: 'anthropic',
		openrouter_model: 'anthropic/claude-3.5-haiku'
	},
	'claude-haiku-4.5': {
		name: 'Claude Haiku 4.5',
		version: 'claude-haiku-4.5',
		provider: 'anthropic',
		openrouter_model: 'anthropic/claude-haiku-4.5'
	},
	'claude-3-sonnet': {
		name: 'Claude 3 Sonnet',
		version: 'claude-3-sonnet',
		provider: 'anthropic',
		openrouter_model: 'anthropic/claude-3-sonnet'
	},
	'claude-sonnet-4': {
		name: 'Claude Sonnet 4',
		version: 'claude-sonnet-4',
		provider: 'anthropic',
		openrouter_model: 'anthropic/claude-sonnet-4'
	},
	'claude-sonnet-4.5': {
		name: 'Claude Sonnet 4.5',
		version: 'claude-sonnet-4.5',
		provider: 'anthropic',
		openrouter_model: 'anthropic/claude-sonnet-4.5'
	},
	'grok-4-fast': {
		name: 'Grok 4 Fast',
		version: 'grok-4-fast',
		provider: 'xai',
		openrouter_model: 'x-ai/grok-4-fast'
	},
	'grok-4': {
		name: 'Grok 4',
		version: 'grok-4',
		provider: 'xai',
		openrouter_model: 'x-ai/grok-4'
	},
	'grok-3-mini': {
		name: 'Grok 3 Mini',
		version: 'grok-3-mini',
		provider: 'xai',
		openrouter_model: 'x-ai/grok-3-mini'
	},
	'hermes-4-70b': {
		name: 'Hermes 4 70B',
		version: 'hermes-4-70b',
		provider: 'nousresearch',
		openrouter_model: 'nousresearch/hermes-4-70b'
	},
	'hermes-4-405b': {
		name: 'Hermes 4 405B',
		version: 'hermes-4-405b',
		provider: 'nousresearch',
		openrouter_model: 'nousresearch/hermes-4-405b'
	},
	'deepseek-r1-free': {
		name: 'DeepSeek R1 (Free)',
		version: 'deepseek-r1-free',
		provider: 'deepseek',
		openrouter_model: 'deepseek/deepseek-r1:free'
	}
} as const;

export type ModelName = keyof typeof MODEL_CONFIGS;
