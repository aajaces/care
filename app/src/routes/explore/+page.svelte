<script lang="ts">
	let { data } = $props();

	// Filter states
	let selectedModel = $state('all');
	let selectedPillar = $state('all');
	let selectedHierarchy = $state('all');
	let searchQuery = $state('');
	let minScore = $state(0);
	let maxScore = $state(100);

	// Expanded row state
	let expandedRows = $state<Set<string>>(new Set());

	// Filtered results
	let filteredResults = $derived(() => {
		return data.results.filter((result) => {
			if (selectedModel !== 'all' && `${result.modelName} ${result.modelVersion}` !== selectedModel) {
				return false;
			}
			if (selectedPillar !== 'all' && result.pillarId !== parseInt(selectedPillar)) {
				return false;
			}
			if (selectedHierarchy !== 'all' && result.truthHierarchy !== parseInt(selectedHierarchy)) {
				return false;
			}
			if (searchQuery && !result.questionText.toLowerCase().includes(searchQuery.toLowerCase()) &&
				!result.questionId.toLowerCase().includes(searchQuery.toLowerCase())) {
				return false;
			}
			const scorePercent = (result.score / result.maxScore) * 100;
			if (scorePercent < minScore || scorePercent > maxScore) {
				return false;
			}
			return true;
		});
	});

	function toggleRow(id: string) {
		const newSet = new Set(expandedRows);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		expandedRows = newSet;
	}

	function getPillarName(id: number) {
		const pillar = data.pillars.find(p => p.id === id);
		return pillar ? pillar.name : `Pillar ${id}`;
	}

	function getHierarchyLabel(level: number) {
		const labels = {
			1: 'Dogma',
			2: 'Definitive Doctrine',
			3: 'Authentic Magisterium',
			4: 'Prudential Judgments'
		};
		return labels[level as keyof typeof labels] || `Level ${level}`;
	}
</script>

<div class="min-h-screen">
	<!-- Header -->
	<section class="py-12 px-6 border-b">
		<div class="max-w-7xl mx-auto">
			<a href="/" class="inline-flex items-center gap-2 text-blue-950 hover:text-blue-900 mb-4 no-underline">
				<iconify-icon icon="ri:arrow-left-line"></iconify-icon>
				Back to Home
			</a>
			<h1 class="text-5xl mb-4">Explore Results</h1>
			<p class="text-xl text-gray-600 font-light">
				Browse and filter evaluation results across all models and questions (Version: {data.version})
			</p>
		</div>
	</section>

	<!-- Filters -->
	<section class="py-8 px-6 bg-white border-b">
		<div class="max-w-7xl mx-auto">
			<div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
				<!-- Model Filter -->
				<div>
					<label class="block text-sm font-medium mb-2">Model</label>
					<select bind:value={selectedModel} class="w-full px-3 py-2 border rounded-lg">
						<option value="all">All Models</option>
						{#each data.models as model}
							<option value={model}>{model}</option>
						{/each}
					</select>
				</div>

				<!-- Pillar Filter -->
				<div>
					<label class="block text-sm font-medium mb-2">Pillar</label>
					<select bind:value={selectedPillar} class="w-full px-3 py-2 border rounded-lg">
						<option value="all">All Pillars</option>
						{#each data.pillars as pillar}
							<option value={pillar.id.toString()}>{pillar.name}</option>
						{/each}
					</select>
				</div>

				<!-- Truth Hierarchy Filter -->
				<div>
					<label class="block text-sm font-medium mb-2">Truth Hierarchy</label>
					<select bind:value={selectedHierarchy} class="w-full px-3 py-2 border rounded-lg">
						<option value="all">All Levels</option>
						<option value="1">1 - Dogma</option>
						<option value="2">2 - Definitive Doctrine</option>
						<option value="3">3 - Authentic Magisterium</option>
						<option value="4">4 - Prudential Judgments</option>
					</select>
				</div>

				<!-- Search -->
				<div>
					<label class="block text-sm font-medium mb-2">Search</label>
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Question ID or text..."
						class="w-full px-3 py-2 border rounded-lg"
					/>
				</div>

				<!-- Score Range -->
				<div>
					<label class="block text-sm font-medium mb-2">Score Range</label>
					<div class="flex gap-2 items-center">
						<input
							type="number"
							bind:value={minScore}
							min="0"
							max="100"
							class="w-20 px-2 py-2 border rounded-lg text-sm"
						/>
						<span class="text-gray-500">-</span>
						<input
							type="number"
							bind:value={maxScore}
							min="0"
							max="100"
							class="w-20 px-2 py-2 border rounded-lg text-sm"
						/>
					</div>
				</div>
			</div>

			<!-- Results count -->
			<div class="mt-4 text-sm text-gray-600">
				Showing {filteredResults().length} of {data.results.length} results
			</div>
		</div>
	</section>

	<!-- Results Table -->
	<section class="py-8 px-6">
		<div class="max-w-7xl mx-auto">
			{#if filteredResults().length === 0}
				<div class="bg-[var(--color-cream)] p-8 rounded-lg text-center">
					<p class="text-xl text-gray-600">No results match your filters. Try adjusting them.</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead>
							<tr>
								<th class="text-left">Question</th>
								<th class="text-left">Model</th>
								<th>Pillar</th>
								<th>Hierarchy</th>
								<th>Score</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each filteredResults() as result}
								{@const rowId = `${result.questionId}-${result.modelName}-${result.modelVersion}`}
								{@const isExpanded = expandedRows.has(rowId)}
								{@const scorePercent = (result.score / result.maxScore) * 100}

								<tr class="cursor-pointer" onclick={() => toggleRow(rowId)}>
									<td>
										<div class="font-medium text-sm">{result.questionId}</div>
										<div class="text-sm text-gray-600 max-w-md truncate">
											{result.questionText}
										</div>
									</td>
									<td>
										<div class="text-sm">{result.modelName}</div>
										<div class="text-xs text-gray-600">{result.modelVersion}</div>
									</td>
									<td class="text-center text-sm">{result.pillarId}</td>
									<td class="text-center text-sm">{result.truthHierarchy}</td>
									<td class="text-center">
										<div class="font-medium" class:text-green-700={scorePercent >= 80} class:text-yellow-700={scorePercent >= 60 && scorePercent < 80} class:text-red-700={scorePercent < 60}>
											{scorePercent.toFixed(1)}%
										</div>
										<div class="text-xs text-gray-500">{result.score}/{result.maxScore}</div>
									</td>
									<td class="text-center">
										<iconify-icon icon={isExpanded ? 'ri:arrow-up-s-line' : 'ri:arrow-down-s-line'} class="text-xl"></iconify-icon>
									</td>
								</tr>

								{#if isExpanded}
									<tr class="bg-[var(--color-cream)]">
										<td colspan="6" class="p-6">
											<div class="space-y-6">
												<!-- Question Details -->
												<div>
													<h4 class="text-sm font-semibold text-blue-950 mb-2">Explicit Question</h4>
													<p class="text-sm">{result.questionText}</p>
												</div>

												<div>
													<h4 class="text-sm font-semibold text-blue-950 mb-2">Implicit Question</h4>
													<p class="text-sm">{result.implicitText}</p>
												</div>

												{#if result.referenceAnswer}
													<div>
														<h4 class="text-sm font-semibold text-blue-950 mb-2">Reference Answer</h4>
														<p class="text-sm text-gray-700">{result.referenceAnswer}</p>
													</div>
												{/if}

												<!-- Model Response -->
												<div>
													<h4 class="text-sm font-semibold text-blue-950 mb-2">Model Response</h4>
													<div class="bg-white p-4 rounded border text-sm leading-relaxed">
														{result.response}
													</div>
												</div>

												<!-- Judge Reasoning -->
												{#if result.judgeReasoning}
													<div>
														<h4 class="text-sm font-semibold text-blue-950 mb-2">Judge Evaluation</h4>
														<div class="bg-white p-4 rounded border text-sm leading-relaxed">
															{result.judgeReasoning}
														</div>
													</div>
												{/if}

												<!-- Metadata -->
												<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
													<div>
														<span class="font-medium">Pillar:</span> {getPillarName(result.pillarId)}
													</div>
													<div>
														<span class="font-medium">Hierarchy:</span> {getHierarchyLabel(result.truthHierarchy)}
													</div>
													<div>
														<span class="font-medium">Weight:</span> {result.weight}
													</div>
													<div>
														<span class="font-medium">Provider:</span> {result.provider}
													</div>
												</div>
											</div>
										</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</section>
</div>

<style>
	select, input {
		font-family: 'Avenir', 'Avenir Next', system-ui, -apple-system, sans-serif;
	}
</style>
