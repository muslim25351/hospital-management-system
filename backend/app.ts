import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import routes from "./src/routes/index.route.ts";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(bodyParser.json());
app.use(cors());
// app.use("/api", routes);

export default app;
