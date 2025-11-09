import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Use process.env directly - works in both SvelteKit and standalone contexts
// SvelteKit will populate process.env from .env files automatically
const DATABASE_URL = process.env.DATABASE_URL!;

if (!DATABASE_URL) {
	throw new Error('DATABASE_URL environment variable is not set');
}

const client = postgres(DATABASE_URL);

export const db = drizzle(client, { schema });
