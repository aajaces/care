<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	export let runningEvaluations: any[];

	let interval: NodeJS.Timeout;
	let liveEvaluations = runningEvaluations;

	// Poll for updates every 5 seconds
	onMount(() => {
		interval = setInterval(async () => {
			// Fetch updated progress for each running evaluation
			for (const evaluation of liveEvaluations) {
				try {
					const response = await fetch(`/api/evaluations/${evaluation.id}/progress`);
					if (response.ok) {
						const data = await response.json();

						// Update the evaluation in the list
						liveEvaluations = liveEvaluations.map((e) =>
							e.id === evaluation.id ? { ...e, ...data } : e
						);

						// If evaluation is completed, reload the page to show it in leaderboard
						if (data.status === 'completed') {
							setTimeout(() => {
								window.location.reload();
							}, 2000);
						}
					}
				} catch (error) {
					console.error('Failed to fetch progress:', error);
				}
			}
		}, 5000);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
	});

	function formatTime(seconds: number | null): string {
		if (!seconds) return 'Calculating...';

		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;

		if (mins > 0) {
			return `${mins}m ${secs}s`;
		}
		return `${secs}s`;
	}
</script>

{#if liveEvaluations.length > 0}
	<section class="running-evaluations">
		<h2>Live Evaluations</h2>

		{#each liveEvaluations as evaluation}
			<div class="evaluation-card">
				<div class="eval-header">
					<h3>{evaluation.modelName}</h3>
					<span class="provider-badge">{evaluation.modelProvider}</span>
				</div>

				<div class="progress-info">
					<div class="progress-text">
						Question {evaluation.currentQuestion || 0}/{evaluation.totalQuestions ||
							0}
						<span class="variant">
							({evaluation.currentVariant || 'starting'})
						</span>
					</div>

					<div class="progress-bar">
						<div class="progress-fill" style="width: {evaluation.progressPercent || 0}%"></div>
					</div>

					<div class="progress-stats">
						<span class="stat">
							Progress: {evaluation.progressPercent || 0}%
						</span>
						{#if evaluation.averageScore}
							<span class="stat"> Avg Score: {parseFloat(evaluation.averageScore).toFixed(1)}% </span>
						{/if}
						{#if evaluation.estimatedTimeRemaining}
							<span class="stat">
								ETA: {formatTime(evaluation.estimatedTimeRemaining)}
							</span>
						{/if}
					</div>
				</div>

				<div class="question-id">
					{#if evaluation.currentQuestionId}
						<small>Current: {evaluation.currentQuestionId}</small>
					{/if}
				</div>
			</div>
		{/each}
	</section>
{/if}

<style>
	.running-evaluations {
		margin: 2rem 0;
		padding: 2rem;
		background: #fff9f0;
		border: 1px solid #e8d5b7;
		border-radius: 8px;
	}

	h2 {
		font-size: 1.5rem;
		color: #6b4423;
		margin-bottom: 1.5rem;
		font-weight: 600;
	}

	.evaluation-card {
		background: white;
		padding: 1.5rem;
		margin-bottom: 1rem;
		border-radius: 6px;
		border: 1px solid #e8d5b7;
	}

	.eval-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.eval-header h3 {
		font-size: 1.25rem;
		color: #8b4513;
		margin: 0;
	}

	.provider-badge {
		background: #8b4513;
		color: white;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		text-transform: uppercase;
		font-weight: 600;
	}

	.progress-info {
		margin: 1rem 0;
	}

	.progress-text {
		font-size: 0.95rem;
		color: #6b4423;
		margin-bottom: 0.5rem;
		font-weight: 500;
	}

	.variant {
		color: #8b7355;
		font-style: italic;
	}

	.progress-bar {
		width: 100%;
		height: 24px;
		background: #f5ebe0;
		border-radius: 12px;
		overflow: hidden;
		margin: 0.5rem 0;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #8b4513 0%, #a0522d 100%);
		transition: width 0.5s ease;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		padding-right: 0.5rem;
	}

	.progress-stats {
		display: flex;
		gap: 1.5rem;
		margin-top: 0.75rem;
		font-size: 0.875rem;
	}

	.stat {
		color: #6b4423;
		font-weight: 500;
	}

	.question-id {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid #e8d5b7;
	}

	.question-id small {
		color: #8b7355;
		font-size: 0.8rem;
	}

	@media (max-width: 768px) {
		.progress-stats {
			flex-direction: column;
			gap: 0.5rem;
		}
	}
</style>
