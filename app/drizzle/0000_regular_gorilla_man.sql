CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pillar_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"parent_category_id" uuid,
	"hierarchy_level" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"status" varchar(50) DEFAULT 'running' NOT NULL,
	"current_question" integer DEFAULT 0,
	"total_questions" integer DEFAULT 0,
	"current_question_id" varchar(255),
	"current_variant" varchar(20),
	"responses_completed" integer DEFAULT 0,
	"average_score" numeric(5, 2),
	"estimated_time_remaining" integer,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "model_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"evaluation_run_id" uuid NOT NULL,
	"overall_score" numeric(5, 2),
	"overall_score_ci_lower" numeric(5, 2),
	"overall_score_ci_upper" numeric(5, 2),
	"weighted_score" numeric(5, 2),
	"weighted_score_ci_lower" numeric(5, 2),
	"weighted_score_ci_upper" numeric(5, 2),
	"confidence_level" numeric(3, 2) DEFAULT '0.95',
	"score_variance" numeric(5, 2),
	"consistency_score" numeric(5, 2),
	"total_questions" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"version" varchar(100) NOT NULL,
	"provider" varchar(100) NOT NULL,
	"type" varchar(50) DEFAULT 'raw_model' NOT NULL,
	"tested_at" timestamp DEFAULT now(),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "pillar_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evaluation_run_id" uuid NOT NULL,
	"model_id" uuid NOT NULL,
	"pillar_id" integer NOT NULL,
	"avg_score" numeric(5, 2),
	"avg_score_ci_lower" numeric(5, 2),
	"avg_score_ci_upper" numeric(5, 2),
	"sample_variance" numeric(5, 2),
	"question_count" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pillars" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"order_num" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"pillar_id" integer NOT NULL,
	"category_id" uuid,
	"explicit_text" text NOT NULL,
	"implicit_text" text NOT NULL,
	"truth_hierarchy" integer NOT NULL,
	"weight" numeric(5, 2) DEFAULT '1.00' NOT NULL,
	"reference_answer" text,
	"source_citations" jsonb,
	"rubric" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "response_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"response_id" uuid NOT NULL,
	"run_number" integer NOT NULL,
	"response_text" text NOT NULL,
	"score" numeric(5, 2),
	"max_score" numeric(5, 2),
	"judge_reasoning" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evaluation_run_id" uuid NOT NULL,
	"question_id" varchar(100) NOT NULL,
	"model_id" uuid NOT NULL,
	"question_variant" varchar(50) NOT NULL,
	"response_text" text NOT NULL,
	"run_count" integer DEFAULT 1 NOT NULL,
	"mean_score" numeric(5, 2),
	"std_dev" numeric(5, 2),
	"min_score" numeric(5, 2),
	"max_score" numeric(5, 2),
	"coefficient_of_variation" numeric(5, 2),
	"judge_reasoning" text,
	"response_embedding" vector(1536),
	"created_at" timestamp DEFAULT now(),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "truth_hierarchies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"order_num" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_pillar_id_pillars_id_fk" FOREIGN KEY ("pillar_id") REFERENCES "public"."pillars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_category_id_categories_id_fk" FOREIGN KEY ("parent_category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD CONSTRAINT "evaluation_runs_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_scores" ADD CONSTRAINT "model_scores_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_scores" ADD CONSTRAINT "model_scores_evaluation_run_id_evaluation_runs_id_fk" FOREIGN KEY ("evaluation_run_id") REFERENCES "public"."evaluation_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pillar_scores" ADD CONSTRAINT "pillar_scores_evaluation_run_id_evaluation_runs_id_fk" FOREIGN KEY ("evaluation_run_id") REFERENCES "public"."evaluation_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pillar_scores" ADD CONSTRAINT "pillar_scores_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pillar_scores" ADD CONSTRAINT "pillar_scores_pillar_id_pillars_id_fk" FOREIGN KEY ("pillar_id") REFERENCES "public"."pillars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_pillar_id_pillars_id_fk" FOREIGN KEY ("pillar_id") REFERENCES "public"."pillars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response_runs" ADD CONSTRAINT "response_runs_response_id_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."responses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_evaluation_run_id_evaluation_runs_id_fk" FOREIGN KEY ("evaluation_run_id") REFERENCES "public"."evaluation_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE no action ON UPDATE no action;