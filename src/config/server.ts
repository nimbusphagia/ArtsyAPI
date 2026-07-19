import express from "express";
import http from "http";
import authRouter from "../domains/auth/auth.routes";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ErrorHandler } from "./errors/errorHandler";

const app = express();
const server = http.createServer(app);
const corsOptions = {
  origin: process.env.CLIENT_URL,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(cookieParser());

app.use("/", authRouter);

app.use(ErrorHandler);

export { app, server };
