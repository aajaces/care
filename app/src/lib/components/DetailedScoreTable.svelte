<script lang="ts">
	import { getProviderColor, type ModelDataPoint } from '$lib/data/model-data';

	// Accept data as prop from parent page
	let { modelData = [] }: { modelData: ModelDataPoint[] } = $props();

	// Sort models by overall performance (descending)
	const sortedModels = $derived([...modelData].sort((a, b) => b.performance - a.performance));

	// Helper function to get color for score (gradient from red to green)
	function getScoreColor(score: number): string {
		if (score >= 90) return '#172554';
		if (score >= 80) return '#2d5f3e'; // Dark green
		if (score >= 70) return '#5a7c65'; // Medium green
		if (score >= 60) return '#8a8a5a'; // Yellow-green
		return '#9a6b4b'; // Brown
	}

	// Helper function to get background color for score
	function getScoreBg(score: number): string {
		if (score >= 90) return 'rgba(23, 37, 84, 0.1)';
		if (score >= 80) return 'rgba(45, 95, 62, 0.1)';
		if (score >= 70) return 'rgba(90, 124, 101, 0.1)';
		if (score >= 60) return 'rgba(138, 138, 90, 0.1)';
		return 'rgba(154, 107, 75, 0.1)';
	}
</script>

<div class="table-container">
	<div class="overflow-x-auto">
		<table class="detailed-score-table">
			<thead>
				<tr>
					<th class="rank-col">Rank</th>
					<th class="model-col">Model</th>
					<th class="provider-col">Provider</th>
					<th class="pillar-col">
						<div class="pillar-header">
							<span>Creed</span>
							<span class="pillar-subtitle">Profession of Faith</span>
						</div>
					</th>
					<th class="pillar-col">
						<div class="pillar-header">
							<span>Sacraments</span>
							<span class="pillar-subtitle">Christian Mystery</span>
						</div>
					</th>
					<th class="pillar-col">
						<div class="pillar-header">
							<span>Moral Life</span>
							<span class="pillar-subtitle">Life in Christ</span>
						</div>
					</th>
					<th class="pillar-col">
						<div class="pillar-header">
							<span>Prayer</span>
							<span class="pillar-subtitle">Christian Prayer</span>
						</div>
					</th>
					<th class="overall-col">
						<div class="pillar-header">
							<span>Overall</span>
							<span class="pillar-subtitle">Total Score</span>
						</div>
					</th>
					<th class="cost-col">Cost/1M</th>
				</tr>
			</thead>
			<tbody>
				{#each sortedModels as model, idx}
					<tr class="model-row">
						<td class="rank-cell">{idx + 1}</td>
						<td class="model-cell">
							<div class="model-name">{model.name}</div>
							<div class="model-version">{model.version}</div>
						</td>
						<td class="provider-cell">
							<div class="provider-badge">
								{model.provider}
							</div>
						</td>
						<td class="score-cell" style="background-color: {getScoreBg(model.pillarScores.creed)}">
							<span style="color: {getScoreColor(model.pillarScores.creed)}">
								{model.pillarScores.creed.toFixed(1)}%
							</span>
						</td>
						<td class="score-cell" style="background-color: {getScoreBg(model.pillarScores.sacraments)}">
							<span style="color: {getScoreColor(model.pillarScores.sacraments)}">
								{model.pillarScores.sacraments.toFixed(1)}%
							</span>
						</td>
						<td class="score-cell" style="background-color: {getScoreBg(model.pillarScores.moralLife)}">
							<span style="color: {getScoreColor(model.pillarScores.moralLife)}">
								{model.pillarScores.moralLife.toFixed(1)}%
							</span>
						</td>
						<td class="score-cell" style="background-color: {getScoreBg(model.pillarScores.prayer)}">
							<span style="color: {getScoreColor(model.pillarScores.prayer)}">
								{model.pillarScores.prayer.toFixed(1)}%
							</span>
						</td>
						<td class="overall-cell" style="background-color: {getScoreBg(model.performance)}">
							<span class="overall-score" style="color: {getScoreColor(model.performance)}">
								{model.performance.toFixed(1)}%
							</span>
						</td>
						<td class="cost-cell">
							<span class="cost-value">${model.cost.toFixed(2)}</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	.table-container {
		width: 100%;
		background-color: var(--color-parchment);
		border-radius: 8px;
		padding: 1rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.overflow-x-auto {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.detailed-score-table {
		width: 100%;
		border-collapse: collapse;
		font-family: 'Lora', serif;
		font-size: 14px;
	}

	thead {
		background-color: #172554 !important;
	}

	th {
		padding: 12px 8px !important;
		text-align: left;
		font-weight: 300;
		border-bottom: 2px solid #172554 !important;
		white-space: nowrap;
		background-color: #172554 !important;
		color: var(--color-parchment) !important;
	}

	.rank-col {
		width: 50px;
		text-align: center;
	}

	.model-col {
		min-width: 180px;
	}

	.provider-col {
		min-width: 120px;
	}

	.pillar-col {
		min-width: 100px;
		text-align: center;
	}

	.overall-col {
		min-width: 100px;
		text-align: center;
		background-color: rgba(0, 0, 0, 0.2);
	}

	.cost-col {
		min-width: 90px;
		text-align: right;
	}

	.pillar-header {
		display: flex;
		flex-direction: column;
		gap: 2px;
		align-items: center;
	}

	.pillar-subtitle {
		font-size: 10px;
		opacity: 0.8;
		font-style: italic;
	}

	tbody tr {
		border-bottom: 1px solid var(--color-light-gray);
		transition: background-color 0.2s ease;
	}

	tbody tr:hover {
		background-color: rgba(23, 37, 84, 0.05) !important;
	}

	tbody tr:last-child {
		border-bottom: none;
	}

	td {
		padding: 12px 8px !important;
		border-bottom: 1px solid var(--color-light-gray) !important;
	}

	.rank-cell {
		text-align: center;
		font-weight: 300;
		color: var(--color-warm-gray);
	}

	.model-cell {
		padding-left: 12px;
	}

	.model-name {
		font-weight: 400;
		color: var(--color-charcoal);
		margin-bottom: 2px;
	}

	.model-version {
		font-size: 12px;
		color: var(--color-warm-gray);
		font-style: italic;
	}

	.provider-cell {
		padding-left: 12px;
	}

	.provider-badge {
		display: inline-block;
		padding: 4px 12px;
		background-color: rgba(0, 0, 0, 0.05);
		border-radius: 9999px;
		font-size: 12px;
		text-transform: capitalize;
		color: var(--color-charcoal);
	}

	.score-cell {
		text-align: center;
		font-weight: 400;
		font-size: 14px;
	}

	.overall-cell {
		text-align: center;
		font-weight: 400;
	}

	.overall-score {
		font-size: 15px;
		font-weight: 600;
	}

	.cost-cell {
		text-align: right;
		padding-right: 16px;
	}

	.cost-value {
		font-size: 13px;
		color: var(--color-warm-gray);
		font-variant-numeric: tabular-nums;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.detailed-score-table {
			font-size: 12px;
		}

		th,
		td {
			padding: 8px 4px;
		}

		.pillar-subtitle {
			display: none;
		}

		.model-col {
			min-width: 140px;
		}

		.pillar-col,
		.overall-col {
			min-width: 70px;
		}
	}
</style>
