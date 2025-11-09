import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env' });

const sql = neon(process.env.DATABASE_URL);

const result = await sql`
  SELECT
    er.id,
    er.status,
    er.current_question,
    er.total_questions,
    er.responses_completed,
    ROUND(er.average_score::numeric, 2) as avg_score,
    to_char(er.started_at, 'YYYY-MM-DD HH24:MI') as started,
    to_char(er.completed_at, 'YYYY-MM-DD HH24:MI') as completed,
    m.name as model_name,
    m.version as model_version
  FROM evaluation_runs er
  JOIN models m ON er.model_id = m.id
  WHERE er.id = '2b37d8d3-e547-402e-9159-b902e1cb7ffd'
`;

if (result.length === 0) {
  console.log('Evaluation run not found');
} else {
  const run = result[0];
  console.log('\n=== Grok 4 Fast Evaluation Status ===\n');
  console.log('Status:', run.status);
  console.log('Model:', run.model_name, '(' + run.model_version + ')');
  console.log('Progress:', (run.responses_completed || 0), '/', run.total_questions * 2, 'responses');
  console.log('Average Score:', (run.avg_score || 'N/A') + '%');
  console.log('Started:', run.started);
  console.log('Completed:', run.completed || 'In progress');

  if (run.status === 'completed') {
    console.log('\nEvaluation FINISHED');
  } else if (run.status === 'failed') {
    console.log('\nEvaluation FAILED');
  } else {
    console.log('\nEvaluation in progress (' + run.status + ')');
  }
}
