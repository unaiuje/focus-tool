import { createServerFn } from "@tanstack/react-start";
import type { Profile, StudyState } from "./study-types";

// Guardado definitivo en el PC: un único archivo SQLite con todos los
// perfiles y sus datos. El navegador sigue siendo la caché instantánea;
// si la app se sirviera sin servidor, todo sigue funcionando en local.

type SqliteStatement = {
  run(...params: unknown[]): unknown;
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
};

type SqliteDb = {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
};

let dbPromise: Promise<SqliteDb> | null = null;

/** BD en <proyecto>/data/mi-curso.sqlite. Import dinámico: node:sqlite
 *  nunca entra en el bundle del navegador. */
function getDb(): Promise<SqliteDb> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const [{ DatabaseSync }, { mkdirSync }, { join }] = await Promise.all([
        import("node:sqlite"),
        import("node:fs"),
        import("node:path"),
      ]);
      const dir = join(process.cwd(), "data");
      mkdirSync(dir, { recursive: true });
      const db = new DatabaseSync(join(dir, "mi-curso.sqlite")) as SqliteDb;
      db.exec(`
        CREATE TABLE IF NOT EXISTS profiles (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          created_at TEXT NOT NULL,
          position INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS states (
          profile_id TEXT PRIMARY KEY,
          data TEXT NOT NULL
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

/** Índice de perfiles guardado en SQLite. */
export const loadProfilesServer = createServerFn({ method: "GET" }).handler(
  async (): Promise<Profile[]> => {
    const db = await getDb();
    const rows = db
      .prepare("SELECT id, name, created_at FROM profiles ORDER BY position, created_at")
      .all() as Array<{ id: string; name: string; created_at: string }>;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.created_at,
    }));
  },
);

/** Estado completo (StudyState) de un perfil. */
export const loadStateServer = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<StudyState | null> => {
    const db = await getDb();
    const row = db.prepare("SELECT data FROM states WHERE profile_id = ?").get(data.id) as
      { data: string } | undefined;
    return row ? (JSON.parse(row.data) as StudyState) : null;
  });

/** Sincroniza la lista de perfiles (altas, renombres y orden). Nunca borra:
 *  el borrado va por removeProfileServer para no arrastrar datos de otros
 *  navegadores con listas desactualizadas. */
export const saveProfilesServer = createServerFn({ method: "POST" })
  .validator((input: { profiles: Profile[] }) => input)
  .handler(async ({ data }) => {
    const db = await getDb();
    const upsert = db.prepare(
      `INSERT INTO profiles (id, name, created_at, position) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, position = excluded.position`,
    );
    data.profiles.forEach((p, i) => upsert.run(p.id, p.name, p.createdAt, i));
  });

/** Guarda el estado completo de un perfil. */
export const saveProfileStateServer = createServerFn({ method: "POST" })
  .validator((input: { id: string; state: StudyState }) => input)
  .handler(async ({ data }) => {
    const db = await getDb();
    db.prepare(
      `INSERT INTO states (profile_id, data) VALUES (?, ?)
       ON CONFLICT(profile_id) DO UPDATE SET data = excluded.data`,
    ).run(data.id, JSON.stringify(data.state));
  });

/** Borra un perfil y todos sus datos. */
export const removeProfileServer = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const db = await getDb();
    db.prepare("DELETE FROM states WHERE profile_id = ?").run(data.id);
    db.prepare("DELETE FROM profiles WHERE id = ?").run(data.id);
  });
