#!/usr/bin/env tsx
/**
 * Analyze worst performing questions for a model
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { parse } from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface QuestionResult {
	id: string;
	pillar_id: number;
	truth_hierarchy: number;
	weight: string;
	variant: string;
	response: string;
	score: string;
	max_score: string;
	judge_reasoning: string;
}

async function main() {
	const args = process.argv.slice(2);
	const modelSlug = args[0] || 'magisterium-1';
	const version = args[1] || 'alpha';
	const numResults = parseInt(args[2] || '5');

	const filename = `${modelSlug}-${version}.yaml`;
	const filepath = resolve(__dirname, '../src/lib/data/results', filename);

	console.log(`\nAnalyzing worst questions for: ${modelSlug}`);
	console.log('='.repeat(70));

	const content = readFileSync(filepath, 'utf-8');
	const data = parse(content);

	const questions: QuestionResult[] = data.questions;

	// Calculate percentage score for each question
	const scored = questions.map(q => ({
		...q,
		percentage: (parseFloat(q.score) / parseFloat(q.max_score)) * 100
	}));

	// Sort by percentage (lowest first)
	scored.sort((a, b) => a.percentage - b.percentage);

	console.log(`\nTop ${numResults} Worst Performing Questions:\n`);

	for (let i = 0; i < Math.min(numResults, scored.length); i++) {
		const q = scored[i];
		console.log(`${i + 1}. Question ${q.id} (${q.variant})`);
		console.log(`   Pillar: ${q.pillar_id} | Truth Hierarchy: ${q.truth_hierarchy} | Weight: ${q.weight}`);
		console.log(`   Score: ${q.score}/${q.max_score} (${q.percentage.toFixed(1)}%)`);
		console.log(`
   Judge Reasoning:`);
		console.log(`   ${q.judge_reasoning.split('\n').join('\n   ')}`);
		console.log(`
   Response:`);
		console.log(`   ${q.response.substring(0, 300)}${q.response.length > 300 ? '...' : ''}`);
		console.log('\n' + '-'.repeat(70) + '\n');
	}

	// Summary stats
	const avgScore = scored.reduce((sum, q) => sum + q.percentage, 0) / scored.length;
	console.log('='.repeat(70));
	console.log(`Average Question Score: ${avgScore.toFixed(1)}%`);
	console.log(`Lowest Score: ${scored[0].percentage.toFixed(1)}%`);
	console.log(`Highest Score: ${scored[scored.length - 1].percentage.toFixed(1)}%`);
	console.log('='.repeat(70) + '\n');
}

main().catch(err => {
	console.error('Error:', err);
	process.exit(1);
});
