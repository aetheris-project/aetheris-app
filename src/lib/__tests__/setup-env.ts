/**
 * Test environment bootstrap.
 *
 * src/lib/config/env.ts validates process.env at import time and aborts when
 * required variables are missing. This module must be imported FIRST in any
 * test file so the variables exist before the modules under test load.
 */

// NODE_ENV is typed read-only; assign through a mutable view of process.env.
const env = process.env as Record<string, string>;
env.NODE_ENV = "test";
env.AETHERIS_SECRET = "test-secret-that-is-at-least-32-characters-long";
env.DATABASE_URL = "postgresql://aetheris:aetheris@localhost:5432/aetheris";
env.REDIS_URL = "redis://localhost:6379";
env.AETHERIS_APP_URL = "http://localhost:3000";
