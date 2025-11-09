import 'dotenv/config';
import { db } from './index';
import { pillars, truthHierarchies } from './schema';

export async function seedPillars() {
	const existingPillars = await db.select().from(pillars);

	if (existingPillars.length > 0) {
		console.log('Pillars already seeded, skipping...');
		return;
	}

	await db.insert(pillars).values([
		{
			name: 'The Profession of Faith',
			description: 'The Creed - What the Church believes about God and the divine mysteries',
			orderNum: 1
		},
		{
			name: 'The Celebration of the Christian Mystery',
			description: 'The Sacraments - How the Church celebrates the divine mysteries in liturgy',
			orderNum: 2
		},
		{
			name: 'Life in Christ',
			description: 'Moral Life - How the faithful are called to live in accordance with the faith',
			orderNum: 3
		},
		{
			name: 'Christian Prayer',
			description: 'Prayer - How the faithful communicate with God',
			orderNum: 4
		}
	]);

	console.log('✓ Seeded 4 pillars of the Catechism');
}

export async function seedTruthHierarchies() {
	const existingHierarchies = await db.select().from(truthHierarchies);

	if (existingHierarchies.length > 0) {
		console.log('Truth hierarchies already seeded, skipping...');
		return;
	}

	await db.insert(truthHierarchies).values([
		{
			name: 'Dogma',
			description: 'Divinely revealed truths that must be believed with divine and Catholic faith',
			orderNum: 1
		},
		{
			name: 'Definitive Doctrine',
			description: 'Teachings definitively proposed by the Magisterium as connected to divine revelation',
			orderNum: 2
		},
		{
			name: 'Authentic Magisterium',
			description: 'Teachings of the ordinary Magisterium requiring religious submission of will and intellect',
			orderNum: 3
		},
		{
			name: 'Prudential Judgments',
			description: 'Practical applications and pastoral guidance that may be subject to change',
			orderNum: 4
		}
	]);

	console.log('✓ Seeded 4 truth hierarchy levels');
}

// Run seed if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	Promise.all([seedPillars(), seedTruthHierarchies()])
		.then(() => {
			console.log('Seeding complete');
			process.exit(0);
		})
		.catch((error) => {
			console.error('Seeding failed:', error);
			process.exit(1);
		});
}
