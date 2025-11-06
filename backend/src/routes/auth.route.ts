import Router from "express";
import { register, login, logout } from "../controllers/auth.controller.ts";

const authRoute = Router();

authRoute.post("/register", register);
authRoute.post("/signin", login);
authRoute.post("/signout", logout);
