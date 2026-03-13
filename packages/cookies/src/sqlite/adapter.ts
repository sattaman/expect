const IS_BUN = typeof globalThis.Bun !== "undefined";

export const querySqlite = async (
  databasePath: string,
  sqlQuery: string,
): Promise<Array<Record<string, unknown>>> => {
  if (IS_BUN) {
    const { Database } = await import("bun:sqlite");
    const database = new Database(databasePath, { readonly: true });
    try {
      return database.query(sqlQuery).all() as Array<Record<string, unknown>>;
    } finally {
      database.close();
    }
  }

  const { DatabaseSync } = await import("node:sqlite");
  const database = new DatabaseSync(databasePath, { readOnly: true, readBigInts: true });
  try {
    return database.prepare(sqlQuery).all() as Array<Record<string, unknown>>;
  } finally {
    database.close();
  }
};
