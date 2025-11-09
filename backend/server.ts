import app from "./app.ts";
import dotenv from "dotenv";
import { connectToDatabase } from "./src/config/db.ts";
import { ensureRoles } from "./src/config/seedRoles.ts";

dotenv.config();

const PORT = process.env.PORT || 3000;

(async () => {
  await connectToDatabase();
  // Seed core roles if missing (idempotent)
  await ensureRoles();
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
})();
