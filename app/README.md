# CADRE - Catholic Alignment, Doctrine, and Reasoning Evaluation

A comprehensive benchmark for evaluating large language models on their alignment with Catholic teaching, doctrine, and moral reasoning.

## Tech Stack

- **Frontend/Backend**: SvelteKit (full-stack)
- **Database**: PostgreSQL + pgvector
- **Styling**: Tailwind CSS v4 with Lora serif font
- **ORM**: Drizzle
- **Charts**: Chart.js

## Getting Started

### Prerequisites

- Node.js 18+ (preferably via pnpm)
- Docker (for PostgreSQL database)

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Start the PostgreSQL database with pgvector:
```bash
pnpm db:start
```

The database will be available on port 5433 (to avoid conflicts with other Postgres instances).

3. Set up the database schema:
```bash
# Initialize schema and enable pgvector extension
docker exec -i app-db-1 psql -U root -d local < init.sql

# Seed the 4 pillars
docker exec -i app-db-1 psql -U root -d local < seed-pillars.sql
```

4. Start the development server:
```bash
pnpm dev
```

The application will be available at **http://localhost:5173/**

### Environment Variables

Create a `.env` file (or use the `.env.example` as template):

```bash
DATABASE_URL="postgres://root:mysecretpassword@localhost:5433/local"
```

## Database Schema

The database includes the following main tables:

- **pillars**: The 4 pillars of the Catechism
- **categories**: Ontology categories within pillars
- **questions**: Test questions (explicit and implicit variants)
- **models**: AI models being evaluated
- **rubrics**: Grading criteria
- **evaluation_runs**: Individual evaluation executions
- **responses**: Model responses to questions
- **pillar_scores**: Aggregated scores by pillar
- **model_scores**: Overall model performance

## API Endpoints

- `GET /api/models` - List all evaluated models
- `GET /api/leaderboard` - Current model rankings with scores
- `GET /api/models/[id]/pillars` - Pillar breakdown for specific model
- `POST /api/evaluations` - Submit evaluation results (for Python framework integration)

### POST /api/evaluations

Submit evaluation results from the Python framework:

```json
{
  "model": {
    "name": "GPT-4",
    "version": "gpt-4-0125-preview",
    "provider": "openai",
    "type": "raw_model"
  },
  "responses": [
    {
      "questionId": "uuid",
      "questionVariant": "explicit",
      "responseText": "...",
      "rubricId": "uuid",
      "score": 85.5,
      "maxScore": 100,
      "judgeReasoning": "..."
    }
  ]
}
```

## Development Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm check` - Run Svelte type checking
- `pnpm db:start` - Start PostgreSQL with Docker
- `pnpm db:studio` - Open Drizzle Studio (database UI)

## Project Structure

```
app/
├── src/
│   ├── routes/              # SvelteKit routes
│   │   ├── +page.svelte    # Main landing page
│   │   ├── +page.server.ts # Server-side data loading
│   │   └── api/            # API endpoints
│   ├── lib/
│   │   └── server/
│   │       └── db/         # Database schema and utilities
│   └── app.css             # Global styles (Lora font, academic theme)
├── static/                  # Static assets
├── compose.yaml            # Docker Compose for PostgreSQL
├── drizzle.config.ts       # Drizzle ORM configuration
├── init.sql                # Database initialization script
└── seed-pillars.sql        # Seed data for 4 pillars
```

## Design Philosophy

The website features a traditional academic aesthetic with:
- **Lora** serif font for readability and scholarly feel
- Warm neutral color palette (parchment background, burgundy accents)
- Clean typography hierarchy with generous whitespace
- Radar charts for visualizing model performance across the 4 pillars

## The 4 Pillars

1. **The Profession of Faith** - The Creed
2. **The Celebration of the Christian Mystery** - The Sacraments
3. **Life in Christ** - Moral Life
4. **Christian Prayer** - Prayer

## Hierarchy of Truths

Questions are weighted according to the hierarchy of truths:

1. **Dogma**: Divinely revealed truths requiring assent of faith
2. **Definitive Doctrine**: Teachings definitively proposed by the Magisterium
3. **Authentic Magisterium**: Non-definitive authoritative teachings
4. **Prudential Judgments**: Practical applications and pastoral guidance

## Next Steps

This is the MVP foundation. See the roadmap on the website for upcoming features:

- Phase 2: Expand dataset to 500+ questions
- Phase 3: Application layer testing (ChatGPT, Claude products)
- Phase 4: Human evaluation panel (30 theological experts)
- Phase 5: Advanced tooling (question creator, rubric editor, API)

## License

See LICENSE file in the repository root.
