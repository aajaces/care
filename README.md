# CADRE

**Catholic Alignment, Doctrine, and Reasoning Evaluation**

A comprehensive benchmark for evaluating large language models on their alignment with Catholic teaching, doctrine, and moral reasoning.

## Overview

CADRE is an open benchmark that tests AI models across the four pillars of the Catechism of the Catholic Church:

1. **The Profession of Faith** (Creed)
2. **The Celebration of the Christian Mystery** (Sacraments)
3. **Life in Christ** (Moral Life)
4. **Christian Prayer**

Each question is weighted according to the hierarchy of truths, prioritizing dogmatic teachings while assessing understanding across all levels of Catholic doctrine.

### Dual Question Methodology: Explicit vs. Implicit

CADRE evaluates models using two variants of each question to distinguish between **factual retrieval** and **native reasoning patterns**:

- **Explicit questions** measure whether models can accurately retrieve Catholic teaching when directly asked. These test factual precision, proper theological terminology, and citation ability—essentially assessing what Catholic knowledge exists in the model's training data.

- **Implicit questions** measure whether Catholic reasoning emerges as the model's default worldview when presented with neutrally-phrased questions that could be answered from multiple theological perspectives. These questions test whether the model naturally applies Catholic frameworks without being explicitly prompted to do so.

This dual approach reveals a critical distinction: whether a model merely possesses Catholic knowledge in its training corpus versus whether it exhibits Catholic reasoning as its native mode of ethical and theological analysis.

## Repository Structure

This repository contains both the benchmark dataset and the evaluation platform:

```
care/
├── data/
│   ├── questions-alpha.yaml      # Benchmark questions (alpha version)
│   ├── scores-alpha.yaml         # Lightweight scores summary (auto-generated)
│   └── results/                  # Evaluation results (one file per model)
│       ├── gpt-4-turbo-alpha.yaml
│       ├── claude-sonnet-4.5-alpha.yaml
│       └── {model-slug}-{version}.yaml
└── app/                          # SvelteKit web application
    ├── src/                      # Website + leaderboard
    ├── scripts/                  # Evaluation & export CLI
    └── ...
```

### Data Files (Source of Truth)

- **`data/questions-alpha.yaml`**: The benchmark dataset containing questions across all four pillars
- **`data/scores-alpha.yaml`**: Lightweight scores summary for fast leaderboard loading
  - Auto-generated from result files via `pnpm scores-summary`
  - Contains rankings, aggregate scores, and pillar breakdowns
  - Optimized for performance (3-8x faster than parsing full results)
- **`data/results/*.yaml`**: Official evaluation results, one file per model evaluation
  - Naming convention: `{model-slug}-{version}.yaml` (e.g., `gpt-4-turbo-alpha.yaml`)
  - Each file contains complete results including scores, responses, and judge reasoning
  - Independent files enable parallel contributions and clean PR workflows

These YAML files are the **source of truth** for the public benchmark. The website reads directly from these files, making the leaderboard transparent and version-controlled.

### App (Evaluation Platform + Website)

- **Website/Leaderboard**: Public-facing site at the root route
- **Evaluation CLI**: Run models through the benchmark (`pnpm eval`)
- **Database**: Used only for testing and running evaluations (not for public data)

## Alpha Version

We're currently in the **alpha phase** with:
- 50 questions across the four pillars
- Focus on dogmatic teachings (hierarchy level 1-2)
- LLM-as-judge evaluation using Claude Opus 4.1
- Both explicit and implicit question variants with differentiated rubrics

### Differentiated Rubric Scoring

CADRE uses **dual evaluation modes** to measure two distinct capabilities:

- **Explicit**: "Can the model retrieve Catholic teaching when asked?"
  - Tests precise doctrinal knowledge, theological terminology, and citation ability
  - Requires exact answers with proper Catholic vocabulary

- **Implicit**: "Is Catholic reasoning the model's default mode?"
  - Tests whether models naturally apply Catholic frameworks without prompting
  - Uses lenient scoring on details but evaluates native alignment patterns

This dual approach reveals whether a model merely has Catholic knowledge in its training data versus whether it exhibits Catholic reasoning as its default worldview.

The alpha version uses semantic versioning in the filename (e.g., `questions-alpha.yaml`, `evaluations-alpha.yaml`). Future versions will be released with updated version identifiers.

## Running the Evaluation Framework

### Prerequisites

1. **PostgreSQL database** (Neon.tech or other hosted Postgres)
2. **OpenRouter API key** ([get one here](https://openrouter.ai/keys))
3. **Node.js 18+** and **pnpm**

### Setup

```bash
# Navigate to the app directory
cd app

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env and add:
#   - DATABASE_URL (your Neon.tech connection string)
#   - OPENROUTER_API_KEY

# Push database schema
pnpm db:push

# Start the development server
pnpm dev
```

### Evaluating a Model

```bash
cd app

# Run an evaluation
pnpm eval --model gpt-4-turbo --runs 3

# With version specification (recommended)
pnpm eval --model gpt-4-turbo --runs 3 --version alpha

# For slow models, increase timeout (default: 300s)
pnpm eval --model magisterium-1 --runs 3 --timeout 600

# Resume an incomplete evaluation (if it failed/timed out)
pnpm eval --resume <eval-run-id> --model magisterium-1

# Options:
#   --model          Model name (required, or with --resume)
#                    Available: gpt-4-turbo, claude-sonnet-4.5, magisterium-1, etc.
#   --runs           Number of runs per question variant (1-10, required)
#   --version        Benchmark version for organizing results (default: alpha)
#   --questions      Custom questions file (optional)
#   --timeout        API request timeout in seconds (default: 300)
#                    Increase for slow models (recommended: 300-600)
#   --resume         Resume incomplete evaluation run by UUID
#                    Skips already-completed question variants
```

The evaluation will:
1. Load questions from `data/questions-alpha.yaml`
2. Run the model on each question (explicit + implicit variants)
3. Use Claude Opus 4.1 to judge responses
4. Save results to the local database with version metadata

**Evaluation Methodology:**
- **Run 1 (Deterministic)**: temperature=0.0, seed=0 for reproducible baseline
- **Runs 2-N (Consistency)**: temperature=0.7, random sampling to measure variance
- Both scores are tracked: deterministic score (reproducible) + consistency metrics (std dev, CV)

### Troubleshooting Evaluations

**Timeouts or Slow Models:**
- If evaluations time out, increase the timeout: `--timeout 600` (10 minutes)
- For very slow models like Magisterium-1, use `--timeout 900` (15 minutes)
- Default timeout is 300 seconds (5 minutes)

**Failed/Interrupted Evaluations:**
- Get the evaluation run ID from the console output (shown at start)
- Resume with: `pnpm eval --resume <eval-run-id> --model <model-name>`
- The system will skip already-completed question variants
- All progress is saved to the database after each variant completes

**Empty Response Errors (Magisterium):**
- If Magisterium returns empty content, the system automatically extracts text from citations
- This is handled transparently in the error recovery logic
- Increase retries or check API key if issues persist

### Review and Publish Results

After running evaluations locally:

1. **Review results** at `http://localhost:5173/explore`
   - Browse all questions and responses
   - Filter by model, pillar, hierarchy, score
   - View detailed judge reasoning

2. **Export to YAML** when ready to publish:
   ```bash
   cd app

   # Export all alpha evaluations (creates one file per model)
   pnpm export --version alpha

   # Or export a specific model only
   pnpm export --version alpha --model gpt-4-turbo
   ```

   This creates files in `data/results/{model-slug}-{version}.yaml` with:
   - Complete model responses and scores
   - Per-question results for explicit and implicit variants
   - Pillar-level and overall scores
   - Judge reasoning for each response

3. **Generate scores summary** (for fast leaderboard loading):
   ```bash
   # Auto-generate scores-alpha.yaml from all result files
   pnpm scores-summary --version alpha
   ```

   This creates `data/scores-alpha.yaml` containing:
   - Lightweight model rankings and scores
   - Per-pillar breakdowns
   - Metadata and timestamps
   - 50-200x smaller than full results (3-8x faster page loads)

4. **Validate consistency**:
   ```bash
   # Ensure scores summary matches source files
   pnpm validate-scores --version alpha
   ```

   This checks:
   - Model counts match
   - Individual scores match (overall, weighted, pillar)
   - Response counts are consistent
   - Timestamps are recent

5. **Review exported files**:
   ```bash
   # Check the exported YAML files
   ls -lh ../data/results/
   cat ../data/results/gpt-4-turbo-alpha.yaml
   cat ../data/scores-alpha.yaml
   ```

6. **Commit and push** to publish on the public leaderboard:
   ```bash
   git add data/results/ data/scores-alpha.yaml
   git commit -m "Add evaluation results for [model-name]"
   git push
   ```

   **Shortcut**: Use the combined publish command:
   ```bash
   pnpm publish --version alpha
   ```
   This runs export + scores-summary + validate-scores in sequence.

The public website automatically reads from `data/scores-alpha.yaml` (fast path) and falls back to `data/results/*.yaml` if needed.

## Architecture Philosophy

CADRE follows a **static data, dynamic testing** approach:

- **Public leaderboard**: Reads from YAML files (fast, transparent, no database)
- **Testing environment**: Uses database for running evaluations and reviewing results
- **Publication workflow**: Export approved results from database to YAML, commit to git

This architecture provides:
- ✅ Full transparency (results are version-controlled)
- ✅ Reproducibility (exact scores and responses in git)
- ✅ Performance (website reads static files, no DB queries)
- ✅ Flexibility (database for testing, YAML for production)

## Evaluation Methodology

CADRE uses a **hybrid approach** that balances reproducibility with consistency measurement:

### Temperature and Sampling

**Deterministic Baseline (Run 1)**:
- Temperature: 0.0
- Seed: 0
- Purpose: Reproducible scores for exact comparisons across time and researchers
- This score is the primary benchmark metric

**Consistency Testing (Runs 2-N)**:
- Temperature: 0.7 (default)
- Seed: Random
- Purpose: Measure model stability and natural variance
- Statistics: mean, standard deviation, coefficient of variation

### Why This Approach?

1. **Reproducibility**: Run 1 (temp=0, seed=0) ensures identical results across evaluations
2. **Stability**: Additional runs measure how consistent the model is across responses
3. **Academic Alignment**: Follows best practices from MMLU, HellaSwag, and recent research (Renze & Guven, 2024)
4. **Transparency**: Both deterministic and consistency scores are published

### Judge Model

- Model: Claude Opus 4.1
- Temperature: 0.0 (deterministic grading for consistency)
- Purpose: Evaluate alignment with Catholic teaching using variant-specific rubrics

## Contributing

We welcome contributions! Areas where you can help:

- **Questions**: Submit new questions with proper citations
- **Evaluation**: Help run evaluations on different models
- **Code**: Improve the evaluation framework or website
- **Documentation**: Clarify methodology or add examples

Please open an issue or pull request to get started.

## Citation

If you use CADRE in your research, please cite:

```bibtex
@misc{cadre2025,
  title={CADRE: Catholic Alignment, Doctrine, and Reasoning Evaluation},
  author={CADRE Contributors},
  year={2025},
  url={https://github.com/ariata-os/care}
}
```

## License

[To be determined - awaiting license decision]

## Contact

For questions or collaboration:
- Open an issue on GitHub
- Visit our website: [TBD]
