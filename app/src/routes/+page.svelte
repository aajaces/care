<script lang="ts">
	import { onMount } from "svelte";
	import {
		RadarController,
		RadialLinearScale,
		PointElement,
		LineElement,
		Filler,
		Tooltip,
		Legend,
	} from "chart.js";
	import ChiRho from "$lib/components/ChiRho.svelte";
	import CostPerformanceChart from "$lib/components/CostPerformanceChart.svelte";

	let { data } = $props();
</script>

<svelte:head>
	<!-- Primary Meta Tags -->
	<title>Catholic Benchmark: CADRE - Catholic Alignment, Doctrine, and Reasoning Evaluation</title>
	<meta name="title" content="Catholic Benchmark: CADRE - Catholic Alignment, Doctrine, and Reasoning Evaluation" />
	<meta name="description" content="Benchmark evaluating AI language models on Catholic teaching across Creed, Sacraments, Moral Life, and Prayer. View model leaderboard and results." />
	<meta name="keywords" content="Catholic, AI, Benchmark, Evaluation, Language Models, Teaching, Doctrine, Catechism, Alignment, LLM, CADRE" />
	<meta name="author" content="CADRE Contributors" />
	<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
	<link rel="canonical" href="https://www.catholicalignment.com/" />

	<!-- Theme Color -->
	<meta name="theme-color" content="#741b1b" />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://www.catholicalignment.com/" />
	<meta property="og:title" content="Catholic Benchmark: CADRE - AI Model Alignment Evaluation" />
	<meta property="og:description" content="Evaluate AI language models on understanding Catholic teaching across doctrine, sacraments, moral reasoning, and prayer." />
	<meta property="og:image" content="https://www.catholicalignment.com/og-image.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:site_name" content="CADRE - Catholic Alignment Benchmark" />
	<meta property="og:locale" content="en_US" />

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content="https://www.catholicalignment.com/" />
	<meta name="twitter:title" content="Catholic Benchmark: CADRE - AI Model Alignment Evaluation" />
	<meta name="twitter:description" content="Evaluate AI language models on understanding Catholic teaching across 4 pillars." />
	<meta name="twitter:image" content="https://www.catholicalignment.com/og-image.png" />

	<!-- Structured Data - Organization -->
	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "Organization",
			"name": "CADRE",
			"alternateName": "Catholic Alignment, Doctrine, and Reasoning Evaluation",
			"url": "https://www.catholicalignment.com",
			"logo": "https://www.catholicalignment.com/favicon.svg",
			"description": "An open benchmark evaluating AI language models on alignment with Catholic teaching",
			"sameAs": [
				"https://github.com/aajaces/cadre"
			]
		}
	</script>

	<!-- Structured Data - Dataset -->
	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "Dataset",
			"name": "CADRE: Catholic Alignment, Doctrine, and Reasoning Evaluation",
			"description": "A comprehensive benchmark dataset for evaluating AI language models on their alignment with Catholic teaching across 4 pillars: Creed, Sacraments, Moral Life, and Prayer.",
			"url": "https://www.catholicalignment.com",
			"version": "alpha",
			"isAccessibleForFree": true,
			"distribution": {
				"@type": "DataDownload",
				"encodingFormat": "YAML",
				"contentUrl": "https://github.com/aajaces/cadre"
			},
			"keywords": "Catholic teaching, AI evaluation, benchmark, language models, doctrine, catechism",
			"spatialCoverage": {
				"@type": "Place",
				"name": "Worldwide"
			},
			"temporalCoverage": "2025-01-01/P1Y",
			"creator": {
				"@type": "Organization",
				"name": "CADRE Contributors"
			},
			"includedInDataCatalog": {
				"@type": "DataCatalog",
				"name": "AI Benchmarks and Datasets"
			}
		}
	</script>

	<!-- Structured Data - WebSite -->
	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "WebSite",
			"name": "CADRE",
			"url": "https://www.catholicalignment.com"
		}
	</script>
</svelte:head>

<div class="min-h-screen">
	<!-- Hero Section -->
	<section class="py-12 px-6">
		<div class="max-w-5xl mx-auto text-center">
			<!-- Logo and Title -->
			<div class="flex items-center justify-center gap-6 mb-4">
				<div class="w-8 h-8 mb-8">
					<ChiRho />
				</div>
				<h1 class="text-6xl text-[var(--color-navy)] font-light">
					CADRE
				</h1>
			</div>

			<h2 class="text-xl mb-6 text-[var(--color-navy)] font-light">
				Catholic Alignment, Doctrine, and Reasoning Evaluation
			</h2>
			<p class="text-lg max-w-3xl mx-auto mb-2 text-gray-800 font-light">
				A comprehensive benchmark for evaluating large language models
				on their alignment with Catholic teaching, doctrine, and moral
				reasoning.
			</p>

			<p
				class="text-md max-w-3xl mx-auto mb-8 text-rose-800 italic font-light"
			>
				Alpha version: not for production use—a technical preview to
				establish eval methodology
			</p>

			<!-- Links Section -->
			<div class="flex items-center justify-center gap-4 mb-12 flex-wrap">
				<a
					href="https://github.com/aajaces/cadre"
					target="_blank"
					class="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition-colors no-underline font-light"
				>
					<iconify-icon icon="ri:github-fill" class="text-base"
					></iconify-icon>
					GitHub
				</a>
				<!-- Paper button temporarily commented out
				<button
					onclick={() =>
						alert(
							"Paper in progress! Interested in collaborating or reviewing? Please reach out via GitHub Issues.",
						)}
					class="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-black rounded-lg hover:bg-black hover:text-white transition-colors font-light cursor-pointer"
				>
					<iconify-icon icon="ri:file-text-line" class="text-base"
					></iconify-icon>
					Paper
				</button>
				-->
				<a
					href="/explore"
					class="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-black rounded-lg hover:bg-black hover:text-white transition-colors no-underline font-light"
				>
					<iconify-icon icon="ri:search-line" class="text-base"
					></iconify-icon>
					Explore Results
				</a>
			</div>
		</div>
	</section>

	<main class="max-w-5xl mx-auto px-6 py-8 pb-12">
		<!-- About Section -->
		<section id="about" class="mb-12">
			<h2>About CADRE</h2>
			<div class="space-y-3">
				<p>
					CADRE ("Catholic Alignment, Doctrine, and Reasoning Evaluation")
					evaluates how well AI language models understand and
					articulate Catholic teaching. The benchmark tests models
					across the four pillars of the Catechism, emphasizing
					dogmatic teachings that form the foundation of Catholic
					faith.
				</p>
				<p>
					Our methodology incorporates the <em>hierarchy of truths</em
					>, weighting questions by authoritative level: Dogma (Level
					1), Definitive Doctrine (Level 2), Authentic Magisterium
					(Level 3), and Prudential Judgments (Level 4).
				</p>
				<p>
					CADRE uses two question variants to distinguish between
					<strong class="text-(--color-navy)"
						>factual retrieval</strong
					>
					and
					<strong class="text-(--color-navy)"
						>native reasoning patterns</strong
					>. Explicit questions test whether models can accurately
					retrieve Catholic teaching when directly asked. Implicit
					questions test whether Catholic reasoning emerges naturally
					when presented with neutrally-phrased questions answerable
					from multiple theological perspectives. This dual approach
					reveals whether a model merely possesses Catholic knowledge
					versus whether it exhibits Catholic reasoning as its native
					mode of ethical and theological analysis.
				</p>
			</div>
		</section>

		<!-- Leaderboard Section -->
		<section id="leaderboard" class="mb-12">
			<h2>Model Leaderboard</h2>

			{#if data.leaderboard.length === 0}
				<div class="bg-[var(--color-cream)] p-8 rounded-lg text-center">
					<p class="text-xl text-gray-600">
						No models have been evaluated yet. Check back soon!
					</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="leaderboard-table">
						<thead>
							<tr>
								<th class="rank-col">Rank</th>
								<th class="model-col">Model</th>
								<th class="provider-col">Provider</th>
								<th class="score-col">Overall Score</th>
								{#each data.pillars as pillar}
									<th
										class="pillar-col"
										title={pillar.description}
									>
										{pillar.name}
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each data.leaderboard as model, idx}
								<tr>
									<td class="rank-col">
										<span class="rank-number"
											>{idx + 1}</span
										>
									</td>
									<td class="model-col">
										<div class="model-name">
											{model.name}
										</div>
										<div class="model-version">
											{model.version}
										</div>
									</td>
									<td class="provider-col">
										<span class="provider-badge"
											>{model.provider}</span
										>
									</td>
									<td class="score-col overall-score">
										<div class="score-main">
											{parseFloat(
												model.overallScore || "0",
											).toFixed(1)}%
										</div>
									</td>
									{#if data.pillarScores}
										{#each data.pillars as pillar}
											{@const pillarScore =
												data.pillarScores.find(
													(ps) =>
														ps.modelId ===
															model.id &&
														ps.pillarId ===
															pillar.id,
												)}
											<td class="pillar-col">
												<div class="score-main">
													{pillarScore
														? parseFloat(
																pillarScore.avgScore ||
																	"0",
															).toFixed(1)
														: "—"}%
												</div>
											</td>
										{/each}
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>

		<!-- Cost / Catholic Analysis -->
		<section id="cost-performance" class="mb-12">
			<h2>Cost / Catholic Analysis</h2>
			<div class="space-y-4">
				<div class="bg-[var(--color-cream)] rounded-lg">
					<CostPerformanceChart modelData={data.modelData} />
				</div>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="bg-[var(--color-cream)] p-4 rounded-lg">
						<h4>Cost Metrics</h4>
						<p class="text-sm text-gray-600">
							USD per 1M tokens (average input/output). Lower-cost
							models suit high-volume applications; higher-cost
							models offer superior theological precision.
						</p>
					</div>
					<div class="bg-[var(--color-cream)] p-4 rounded-lg">
						<h4>Pareto Frontier</h4>
						<p class="text-sm text-gray-600">
							Optimal models: high performance at lower cost
							(upper-left). Mission-critical theological
							applications may justify premium pricing.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Methodology Section -->
		<section id="methodology" class="mb-12">
			<h2>Methodology</h2>
			<div class="space-y-3">
				<p>
					The benchmark consists of 50 questions across the four pillars of the Catechism—Creed (15 questions), Sacraments (12), Moral Life (13), and Prayer (10)—weighted by the <em>hierarchy of truths</em>: 56% dogma (divinely revealed truths), 26% definitive doctrine (magisterial teaching), and 18% authentic magisterium (authoritative teaching).
				</p>
				<p>
					Each question has two variants testing distinct capabilities. <strong>Explicit questions</strong> assess whether models can retrieve Catholic teaching when directly asked, testing precise doctrinal knowledge, theological terminology, and citation ability (e.g., "What is the Catholic Church's teaching on the Holy Trinity?"). <strong>Implicit questions</strong> evaluate whether Catholic reasoning emerges naturally without prompting, using lenient scoring on details but evaluating native alignment patterns (e.g., "What is the relationship between the Father, Son, and Holy Spirit?"). This dual approach reveals whether a model merely has Catholic knowledge in its training data versus whether it exhibits Catholic reasoning as its default worldview.
				</p>
				<p>
					LLM-as-judge (Claude Opus 4.1) evaluates responses using structured rubrics with weighted criteria: 3-5 criteria per question with assigned weights, required versus optional criteria (failures on required criteria result in zero scores), reference answers with magisterial sources (CCC, councils, encyclicals), and assessment of theological precision, factual accuracy, and absence of error.
				</p>
			</div>
		</section>

		<!-- Roadmap Section -->
		<section id="roadmap" class="mb-12">
			<h2>Roadmap</h2>
			<div class="roadmap-timeline">
				<div class="roadmap-item">
					<div class="roadmap-marker"></div>
					<div class="roadmap-content">
						<div class="roadmap-phase">
							Phase 1: Foundation <span class="roadmap-current"
								>(Current)</span
							>
						</div>
						<p class="roadmap-description">
							50 questions, base model evaluation, public
							leaderboard
						</p>
					</div>
				</div>
				<div class="roadmap-item">
					<div class="roadmap-marker"></div>
					<div class="roadmap-content">
						<div class="roadmap-phase">Phase 2: Expansion</div>
						<p class="roadmap-description">
							500+ questions across all hierarchy levels, 10+
							models, granular categories
						</p>
					</div>
				</div>
				<div class="roadmap-item">
					<div class="roadmap-marker"></div>
					<div class="roadmap-content">
						<div class="roadmap-phase">
							Phase 3: Application Testing
						</div>
						<p class="roadmap-description">
							Evaluate AI assistants as products (ChatGPT, Claude)
							with tools and context
						</p>
					</div>
				</div>
				<div class="roadmap-item">
					<div class="roadmap-marker"></div>
					<div class="roadmap-content">
						<div class="roadmap-phase">
							Phase 4: Human Evaluation
						</div>
						<p class="roadmap-description">
							Theological expert panel, human grading interface,
							judge agreement analysis
						</p>
					</div>
				</div>
				<div class="roadmap-item">
					<div class="roadmap-marker"></div>
					<div class="roadmap-content">
						<div class="roadmap-phase">Phase 5: Tooling</div>
						<p class="roadmap-description">
							Question creation tool, rubric editor, community
							portal, public API
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Footer -->
		<footer class="pt-8 mt-16 text-center">
			<p class="text-gray-600">
				CADRE is an open initiative to analyze and evaluate the accuracy
				and sufficient representation of Catholic teaching in AI
				systems.
			</p>
			<p class="mt-2 text-sm text-gray-600">
				For questions or contributions, please reach out through our
				GitHub repository.
			</p>
		</footer>
	</main>
</div>

<style>
	/* Additional component-specific styles */
	section {
		scroll-margin-top: 2rem;
	}

	.shadow-sm {
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	/* Leaderboard Table Styles */
	.leaderboard-table :global(th.rank-col),
	.leaderboard-table :global(td.rank-col) {
		width: 60px;
		text-align: center;
		padding: 0.75rem 1rem;
	}

	.leaderboard-table :global(th.model-col),
	.leaderboard-table :global(td.model-col) {
		min-width: 180px;
		padding: 0.75rem 1.5rem;
	}

	.leaderboard-table :global(th.provider-col),
	.leaderboard-table :global(td.provider-col) {
		width: 120px;
		text-align: center;
		padding: 0.75rem 1rem;
	}

	.leaderboard-table :global(th.score-col),
	.leaderboard-table :global(td.score-col) {
		width: 110px;
		text-align: center;
		padding: 0.75rem 1rem;
	}

	.leaderboard-table :global(th.pillar-col),
	.leaderboard-table :global(td.pillar-col) {
		width: 100px;
		text-align: center;
		padding: 0.75rem 0.75rem;
	}

	/* Rank styling */
	.leaderboard-table :global(.rank-number) {
		font-weight: 300;
		color: var(--color-warm-gray);
		font-size: 0.95rem;
	}

	/* Model name styling */
	.leaderboard-table :global(.model-name) {
		font-weight: 500;
		color: var(--color-charcoal);
		margin-bottom: 2px;
		line-height: 1.4;
	}

	.leaderboard-table :global(.model-version) {
		font-size: 0.8125rem;
		color: var(--color-warm-gray);
		font-weight: 300;
		font-style: italic;
		line-height: 1.3;
	}

	/* Provider badge styling */
	.leaderboard-table :global(.provider-badge) {
		display: inline-block;
		padding: 4px 12px;
		background-color: rgba(0, 0, 0, 0.05);
		border-radius: 9999px;
		font-size: 0.8125rem;
		font-weight: 400;
		text-transform: capitalize;
		color: var(--color-charcoal);
	}

	/* Score styling */
	.leaderboard-table :global(.score-main) {
		font-weight: 600;
		color: var(--color-charcoal);
		font-size: 0.9375rem;
		line-height: 1.4;
	}

	.leaderboard-table :global(.score-ci) {
		font-size: 0.75rem;
		color: var(--color-warm-gray);
		font-weight: 300;
		margin-top: 2px;
		line-height: 1.2;
	}

	/* Overall score emphasis */
	.leaderboard-table :global(td.overall-score .score-main) {
		color: var(--color-deep-blue);
		font-weight: 700;
	}

	/* Pillar score styling */
	.leaderboard-table :global(.pillar-count) {
		font-size: 0.6875rem;
		color: var(--color-warm-gray);
		font-weight: 300;
		margin-top: 2px;
		line-height: 1.2;
	}

	/* Roadmap Timeline Styles */
	.roadmap-timeline {
		position: relative;
		padding-left: 2rem;
	}

	.roadmap-timeline::before {
		content: "";
		position: absolute;
		left: 0.375rem;
		top: 0.5rem;
		bottom: 0;
		width: 2px;
		background-color: var(--color-light-gray);
	}

	.roadmap-item {
		position: relative;
		padding-bottom: 2rem;
		display: flex;
		align-items: flex-start;
	}

	.roadmap-item:last-child {
		padding-bottom: 0;
	}

	.roadmap-marker {
		position: absolute;
		left: -2rem;
		top: 0.375rem;
		width: 0.875rem;
		height: 0.875rem;
		background-color: var(--color-navy);
		border-radius: 50%;
		border: 2px solid var(--color-cream);
	}

	.roadmap-item:first-child .roadmap-marker {
		background-color: var(--color-deep-blue);
		box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.1);
	}

	.roadmap-content {
		flex: 1;
	}

	.roadmap-phase {
		font-weight: 500;
		color: var(--color-navy);
		margin-bottom: 0.25rem;
		font-size: 0.9375rem;
	}

	.roadmap-current {
		font-weight: 400;
		color: var(--color-deep-blue);
		font-style: italic;
	}

	.roadmap-description {
		color: var(--color-warm-gray);
		font-size: 0.875rem;
		line-height: 1.5;
		margin: 0;
	}
</style>
