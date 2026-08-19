/**
 * JSON field codec for SQLite mode.
 *
 * Prisma's SQLite connector does not support the Json type, so the SQLite
 * schema (prisma/sqlite/schema.prisma) stores those fields as JSON strings.
 * This middleware transparently serializes objects to strings on write and
 * parses them back on read, so the rest of the application keeps working
 * with plain JavaScript objects regardless of the database engine.
 *
 * Only the models that have Json fields in the PostgreSQL schema are listed.
 */

const JSON_FIELDS: Record<string, readonly string[]> = {
  WhitelabelConfig: ["brand", "theme", "navigation", "emailTemplates", "modules"],
  Node: ["capacity"],
  Server: ["resources", "environment"],
  Plan: ["limits"],
  Payment: ["method"],
  InvoiceLine: ["metadata"],
  AuditLog: ["metadata"]
};

const WRITE_ACTIONS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert"
]);

const READ_ACTIONS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow"
]);

import type { Prisma } from "@prisma/client";

function serializeRow(row: Record<string, unknown>, fields: readonly string[]): void {
  for (const field of fields) {
    const value = row[field];
    if (value !== undefined && value !== null) {
      row[field] = JSON.stringify(value);
    }
  }
}

function deserializeRow(row: Record<string, unknown>, fields: readonly string[]): void {
  for (const field of fields) {
    const value = row[field];
    if (typeof value === "string") {
      try {
        row[field] = JSON.parse(value);
      } catch {
        // Keep the raw string when it is not valid JSON.
      }
    }
  }
}

/**
 * Install the codec on a Prisma client. Call once per client instance.
 */
export function applyJsonCodec(client: { $use: (fn: Prisma.Middleware) => void }): void {
  client.$use(async (params, next) => {
    const fields = params.model ? JSON_FIELDS[params.model] : undefined;
    if (!fields) {
      return next(params);
    }

    if (WRITE_ACTIONS.has(params.action)) {
      const data = (params.args?.data ?? {}) as
        | Record<string, unknown>
        | Record<string, unknown>[];
      const rows = Array.isArray(data) ? data : [data];
      const nested = (params.args?.data as Record<string, unknown>)?.create;
      const update = (params.args?.data as Record<string, unknown>)?.update;
      for (const row of rows) {
        serializeRow(row, fields);
      }
      if (nested) serializeRow(nested as Record<string, unknown>, fields);
      if (update) serializeRow(update as Record<string, unknown>, fields);
    }

    const result = await next(params);

    if (READ_ACTIONS.has(params.action)) {
      if (Array.isArray(result)) {
        for (const row of result as Record<string, unknown>[]) {
          deserializeRow(row, fields);
        }
      } else if (result && typeof result === "object") {
        deserializeRow(result as Record<string, unknown>, fields);
      }
    }
    return result;
  });
}
