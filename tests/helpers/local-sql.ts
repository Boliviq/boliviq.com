import { execFileSync } from "node:child_process";

/** Run SQL against the local `supabase start` Postgres container. Host `psql` is not assumed. */
export function localSql(query: string): string {
  const names = execFileSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" })
    .split("\n")
    .map((n) => n.trim())
    .filter((n) => n.startsWith("supabase_db_"));
  if (!names[0]) {
    throw new Error("Local Supabase Postgres container is not running.");
  }
  return execFileSync(
    "docker",
    ["exec", names[0], "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-c", query],
    { encoding: "utf8" },
  );
}

export function grantAdminRole(userId: string): void {
  localSql(
    `INSERT INTO public.user_roles (user_id, role) VALUES ('${userId}', 'admin') ON CONFLICT (user_id, role) DO NOTHING;`,
  );
}
