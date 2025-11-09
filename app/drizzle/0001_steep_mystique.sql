ALTER TABLE "responses" DROP CONSTRAINT "responses_question_id_questions_id_fk";
--> statement-breakpoint
ALTER TABLE "model_scores" ALTER COLUMN "score_variance" SET DATA TYPE numeric(8, 2);--> statement-breakpoint
ALTER TABLE "pillar_scores" ALTER COLUMN "sample_variance" SET DATA TYPE numeric(8, 2);