/**
 * Rate limiter using token bucket algorithm
 * Enforces requests per minute (RPM) limits for API providers
 */

interface RequestTimestamp {
	timestamp: number;
}

class RateLimiter {
	private requestHistory: Map<string, RequestTimestamp[]> = new Map();

	/**
	 * Throttles a function call based on RPM limit
	 * @param provider - Provider identifier (e.g., 'magisterium', 'openrouter')
	 * @param limitRPM - Requests per minute limit
	 * @param fn - Async function to execute
	 * @returns Result of the function
	 */
	async throttle<T>(provider: string, limitRPM: number, fn: () => Promise<T>): Promise<T> {
		// If no limit, execute immediately
		if (limitRPM <= 0) {
			return fn();
		}

		// Get or create request history for this provider
		if (!this.requestHistory.has(provider)) {
			this.requestHistory.set(provider, []);
		}

		const history = this.requestHistory.get(provider)!;
		const now = Date.now();
		const windowMs = 60 * 1000; // 1 minute in milliseconds
		const minSpacingMs = windowMs / limitRPM; // Minimum time between requests

		// Clean up old requests outside the 1-minute window
		const cutoff = now - windowMs;
		const recentRequests = history.filter((req) => req.timestamp > cutoff);
		this.requestHistory.set(provider, recentRequests);

		// Calculate when we can make the next request
		if (recentRequests.length >= limitRPM) {
			// We've hit the limit, need to wait
			const oldestRequest = recentRequests[0].timestamp;
			const waitTime = oldestRequest + windowMs - now;

			if (waitTime > 0) {
				console.log(
					`[RateLimiter] ${provider}: Rate limit reached (${limitRPM} RPM). Waiting ${Math.ceil(waitTime / 1000)}s...`
				);
				await new Promise((resolve) => setTimeout(resolve, waitTime));
			}
		} else if (recentRequests.length > 0) {
			// Enforce minimum spacing between requests to spread them evenly
			const lastRequest = recentRequests[recentRequests.length - 1].timestamp;
			const timeSinceLastRequest = now - lastRequest;
			const waitTime = minSpacingMs - timeSinceLastRequest;

			if (waitTime > 0) {
				console.log(
					`[RateLimiter] ${provider}: Spacing requests. Waiting ${Math.ceil(waitTime / 1000)}s...`
				);
				await new Promise((resolve) => setTimeout(resolve, waitTime));
			}
		}

		// Record this request
		recentRequests.push({ timestamp: Date.now() });

		// Execute the function
		return fn();
	}

	/**
	 * Clears rate limit history for a provider
	 * @param provider - Provider identifier
	 */
	clearHistory(provider: string): void {
		this.requestHistory.delete(provider);
	}

	/**
	 * Clears all rate limit history
	 */
	clearAllHistory(): void {
		this.requestHistory.clear();
	}
}

// Singleton instance
export const rateLimiter = new RateLimiter();
