import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from "cookie-parser";
import routes from "./src/routes/index.route.ts";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(bodyParser.json());
app.use(cookieParser());
// Configure CORS to allow credentials (cookies) from a defined origin
// Set CLIENT_ORIGIN in .env (e.g., http://localhost:3000)
const allowedOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";
app.use(
	cors({
		origin: allowedOrigin,
		credentials: true,
	})
);
app.use("/api", routes);

export default app;
