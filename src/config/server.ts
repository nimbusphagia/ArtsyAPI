import express from "express";
import http from "http";
import authRouter from "../domains/auth/auth.routes";
import cors from "cors";

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

app.use("/auth", authRouter);

app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

export { app, server };
