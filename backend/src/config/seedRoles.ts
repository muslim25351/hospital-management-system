import Role, { ROLE_NAMES } from "../models/role.model.ts";

// Ensure core roles exist in the database; idempotent
export async function ensureRoles(): Promise<void> {
  const existing = await Role.find({}).select("name");
  const have = new Set((existing || []).map((r: any) => r.name));
  const toCreate = ROLE_NAMES.filter((name) => !have.has(name));
  if (toCreate.length === 0) return;
  // Use create in a loop to satisfy strict typings and let mongoose set timestamps
  for (const name of toCreate) {
    try {
      // ignore duplicates if race occurs
      // create will populate timestamps correctly
      // eslint-disable-next-line no-await-in-loop
      await Role.create({ name });
    } catch (e) {
      // if another process created the role concurrently, ignore duplicate key errors
    }
  }
}
