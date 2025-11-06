import app from "./app.ts";
import dotenv from "dotenv";
import { connectToDatabase } from "./src/config/db.ts";

dotenv.config();

const PORT = process.env.PORT || 3000;

(async () => {
  await connectToDatabase();
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
})();
