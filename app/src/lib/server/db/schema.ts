import { pgTable, uuid, varchar, text, integer, decimal, timestamp, jsonb, serial, customType } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';

// Define vector type for pgvector
const vector = customType<{ data: number[]; driverData: string }>({
	dataType() {
		return 'vector(1536)';
	}
});

// Models being evaluated
export const models = pgTable('models', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: varchar('name', { length: 255 }).notNull(),
	version: varchar('version', { length: 100 }).notNull(),
	provider: varchar('provider', { length: 100 }).notNull(), // "openai", "anthropic", etc.
	type: varchar('type', { length: 50 }).notNull().default('raw_model'), // "raw_model" or "application"
	testedAt: timestamp('tested_at').defaultNow(),
	metadata: jsonb('metadata')
});

// The 4 Pillars of the Catechism
export const pillars = pgTable('pillars', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 100 }).notNull(),
	description: text('description'),
	orderNum: integer('order_num').notNull()
});

// Truth Hierarchy levels (1=Dogma, 2=Definitive, 3=Authentic, 4=Prudential)
export const truthHierarchies = pgTable('truth_hierarchies', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 100 }).notNull(),
	description: text('description'),
	orderNum: integer('order_num').notNull()
});

// Ontology categories within pillars (NOT USED IN ALPHA - reserved for future use)
export const categories = pgTable('categories', {
	id: uuid('id').primaryKey().defaultRandom(),
	pillarId: integer('pillar_id').references(() => pillars.id).notNull(),
	name: varchar('name', { length: 255 }).notNull(),
	parentCategoryId: uuid('parent_category_id').references((): any => categories.id),
	hierarchyLevel: integer('hierarchy_level').notNull()
});

// Questions dataset
// NOTE: Field naming convention: TypeScript uses camelCase, database columns use snake_case, YAML files use snake_case
// NOTE: Questions are stored in YAML files and use string IDs (e.g., "q_001_trinity")
export const questions = pgTable('questions', {
	id: varchar('id', { length: 100 }).primaryKey(), // String ID from YAML (e.g., "q_001_trinity")
	pillarId: integer('pillar_id').references(() => pillars.id).notNull(),
	categoryId: uuid('category_id').references(() => categories.id), // Not used in alpha

	// Two question variants
	explicitText: text('explicit_text').notNull(), // "What is the Catholic position on..."
	implicitText: text('implicit_text').notNull(), // Question without Catholic framing

	// Hierarchy of truths (1=dogma, 2=definitive, 3=authentic, 4=prudential)
	truthHierarchy: integer('truth_hierarchy').notNull(),
	weight: decimal('weight', { precision: 5, scale: 2 }).notNull().default('1.00'), // Question importance weight

	// Answer criteria
	referenceAnswer: text('reference_answer'),
	sourceCitations: jsonb('source_citations'), // CCC paragraphs, encyclicals, etc.

	// Rubric (embedded as JSONB in alpha version - contains max_score, criteria with weights)
	rubric: jsonb('rubric'),

	metadata: jsonb('metadata'),
	createdAt: timestamp('created_at').defaultNow()
});

// Grading rubrics (NOT USED IN ALPHA - rubrics are embedded in questions table as JSONB)
// Keeping definition commented for potential future use with reusable rubrics
/*
export const rubrics = pgTable('rubrics', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: varchar('name', { length: 255 }).notNull(),
	criteria: jsonb('criteria').notNull(), // Array of scoring criteria
	truthHierarchy: integer('truth_hierarchy'), // Which hierarchy level this applies to
	createdAt: timestamp('created_at').defaultNow()
});
*/

// Evaluation runs
export const evaluationRuns = pgTable('evaluation_runs', {
	id: uuid('id').primaryKey().defaultRandom(),
	modelId: uuid('model_id').references(() => models.id).notNull(),
	startedAt: timestamp('started_at').defaultNow(),
	completedAt: timestamp('completed_at'),
	status: varchar('status', { length: 50 }).notNull().default('running'), // "running", "completed", "failed"

	// Live progress tracking fields
	currentQuestion: integer('current_question').default(0), // Current question number (1-indexed)
	totalQuestions: integer('total_questions').default(0), // Total questions in this run
	currentQuestionId: varchar('current_question_id', { length: 255 }), // ID of current question being processed
	currentVariant: varchar('current_variant', { length: 20 }), // "explicit" or "implicit"
	responsesCompleted: integer('responses_completed').default(0), // Total responses completed
	averageScore: decimal('average_score', { precision: 5, scale: 2 }), // Running average score
	estimatedTimeRemaining: integer('estimated_time_remaining'), // Seconds remaining (estimated)

	metadata: jsonb('metadata')
});

// Individual question responses (aggregated across multiple runs)
export const responses = pgTable('responses', {
	id: uuid('id').primaryKey().defaultRandom(),
	evaluationRunId: uuid('evaluation_run_id').references(() => evaluationRuns.id).notNull(),
	questionId: varchar('question_id', { length: 100 }).notNull(), // No FK - questions stored in YAML
	modelId: uuid('model_id').references(() => models.id).notNull(),

	questionVariant: varchar('question_variant', { length: 50 }).notNull(), // "explicit" or "implicit"
	responseText: text('response_text').notNull(), // Representative response (from first run)

	// Scoring (aggregate statistics across runs)
	// rubricId removed - rubrics are embedded in questions table for alpha
	runCount: integer('run_count').notNull().default(1), // Number of times this question-variant was tested
	meanScore: decimal('mean_score', { precision: 5, scale: 2 }), // Average score across runs
	stdDev: decimal('std_dev', { precision: 5, scale: 2 }), // Standard deviation of scores
	minScore: decimal('min_score', { precision: 5, scale: 2 }), // Minimum score across runs
	maxScore: decimal('max_score', { precision: 5, scale: 2 }), // Maximum score across runs
	coefficientOfVariation: decimal('coefficient_of_variation', { precision: 5, scale: 2 }), // CV = stdDev/mean
	judgeReasoning: text('judge_reasoning'), // Representative reasoning (from first run)

	// Embeddings for similarity analysis (pgvector)
	responseEmbedding: vector('response_embedding'),

	createdAt: timestamp('created_at').defaultNow(),
	metadata: jsonb('metadata')
});

// Individual runs for each response (multi-run consistency testing)
export const responseRuns = pgTable('response_runs', {
	id: uuid('id').primaryKey().defaultRandom(),
	responseId: uuid('response_id').references(() => responses.id).notNull(),
	runNumber: integer('run_number').notNull(), // 1, 2, 3, etc.

	responseText: text('response_text').notNull(),
	score: decimal('score', { precision: 5, scale: 2 }),
	maxScore: decimal('max_score', { precision: 5, scale: 2 }),
	judgeReasoning: text('judge_reasoning'),

	createdAt: timestamp('created_at').defaultNow()
});

// Aggregated scores by pillar
export const pillarScores = pgTable('pillar_scores', {
	id: uuid('id').primaryKey().defaultRandom(),
	evaluationRunId: uuid('evaluation_run_id').references(() => evaluationRuns.id).notNull(),
	modelId: uuid('model_id').references(() => models.id).notNull(),
	pillarId: integer('pillar_id').references(() => pillars.id).notNull(),

	avgScore: decimal('avg_score', { precision: 5, scale: 2 }),
	avgScoreCiLower: decimal('avg_score_ci_lower', { precision: 5, scale: 2 }), // 95% CI lower bound
	avgScoreCiUpper: decimal('avg_score_ci_upper', { precision: 5, scale: 2 }), // 95% CI upper bound
	sampleVariance: decimal('sample_variance', { precision: 8, scale: 2 }), // Increased to support larger variance values
	questionCount: integer('question_count').notNull(),
	createdAt: timestamp('created_at').defaultNow()
});

// Overall model scores
export const modelScores = pgTable('model_scores', {
	id: uuid('id').primaryKey().defaultRandom(),
	modelId: uuid('model_id').references(() => models.id).notNull(),
	evaluationRunId: uuid('evaluation_run_id').references(() => evaluationRuns.id).notNull(),

	overallScore: decimal('overall_score', { precision: 5, scale: 2 }),
	overallScoreCiLower: decimal('overall_score_ci_lower', { precision: 5, scale: 2 }), // 95% CI lower
	overallScoreCiUpper: decimal('overall_score_ci_upper', { precision: 5, scale: 2 }), // 95% CI upper
	weightedScore: decimal('weighted_score', { precision: 5, scale: 2 }), // Weighted by hierarchy + pillar importance
	weightedScoreCiLower: decimal('weighted_score_ci_lower', { precision: 5, scale: 2 }),
	weightedScoreCiUpper: decimal('weighted_score_ci_upper', { precision: 5, scale: 2 }),
	confidenceLevel: decimal('confidence_level', { precision: 3, scale: 2 }).default('0.95'), // Default 95% CI

	// Consistency metrics
	scoreVariance: decimal('score_variance', { precision: 8, scale: 2 }), // Increased to support larger variance values
	consistencyScore: decimal('consistency_score', { precision: 5, scale: 2 }), // 100 - avg CV

	totalQuestions: integer('total_questions').notNull(),
	createdAt: timestamp('created_at').defaultNow()
});

// Relations
export const modelsRelations = relations(models, ({ many }) => ({
	evaluationRuns: many(evaluationRuns),
	responses: many(responses),
	pillarScores: many(pillarScores),
	modelScores: many(modelScores)
}));

export const pillarsRelations = relations(pillars, ({ many }) => ({
	categories: many(categories),
	questions: many(questions),
	pillarScores: many(pillarScores)
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
	pillar: one(pillars, {
		fields: [categories.pillarId],
		references: [pillars.id]
	}),
	parentCategory: one(categories, {
		fields: [categories.parentCategoryId],
		references: [categories.id]
	}),
	questions: many(questions),
	childCategories: many(categories)
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
	pillar: one(pillars, {
		fields: [questions.pillarId],
		references: [pillars.id]
	}),
	category: one(categories, {
		fields: [questions.categoryId],
		references: [categories.id]
	}),
	responses: many(responses)
}));

export const evaluationRunsRelations = relations(evaluationRuns, ({ one, many }) => ({
	model: one(models, {
		fields: [evaluationRuns.modelId],
		references: [models.id]
	}),
	responses: many(responses),
	pillarScores: many(pillarScores),
	modelScores: many(modelScores)
}));

export const responsesRelations = relations(responses, ({ one, many }) => ({
	evaluationRun: one(evaluationRuns, {
		fields: [responses.evaluationRunId],
		references: [evaluationRuns.id]
	}),
	question: one(questions, {
		fields: [responses.questionId],
		references: [questions.id]
	}),
	model: one(models, {
		fields: [responses.modelId],
		references: [models.id]
	}),
	// rubric relation removed - rubrics are embedded in questions for alpha
	runs: many(responseRuns)
}));

export const responseRunsRelations = relations(responseRuns, ({ one }) => ({
	response: one(responses, {
		fields: [responseRuns.responseId],
		references: [responses.id]
	})
}));
