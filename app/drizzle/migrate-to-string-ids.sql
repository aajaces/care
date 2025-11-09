-- Migration: Change questions.id and responses.question_id from UUID to VARCHAR
-- This migration handles the constraint dependencies properly

-- Step 1: Drop the foreign key constraint
ALTER TABLE "responses" DROP CONSTRAINT IF EXISTS "responses_question_id_questions_id_fk";

-- Step 2: Alter the column types
ALTER TABLE "responses" ALTER COLUMN "question_id" SET DATA TYPE varchar(100);
ALTER TABLE "questions" ALTER COLUMN "id" SET DATA TYPE varchar(100);
ALTER TABLE "questions" ALTER COLUMN "id" DROP DEFAULT;

-- Step 3: Re-add the foreign key constraint
ALTER TABLE "responses" ADD CONSTRAINT "responses_question_id_questions_id_fk"
  FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;
