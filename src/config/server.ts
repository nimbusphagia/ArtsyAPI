import express from "express";
import http from "http";
import authRouter from "../domains/auth/auth.routes";
import profilesRouter from "../domains/profiles/profiles.routes";
import postsRouter from "../domains/posts/posts.routes";
import collectionsRouter from "../domains/collections/collections.routes";
import chatsRouter from "../domains/chats/chats.routes";
import notificationsRouter from "../domains/notifications/notifications.routes";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ErrorHandler } from "./errors/errorHandler";
import { requireAuth } from "../middleware/requireAuth";

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

app.use("/auth", authRouter);
app.use("/profiles", requireAuth, profilesRouter);
app.use("/posts", requireAuth, postsRouter);
app.use("/collections", requireAuth, collectionsRouter);
app.use("/chats", requireAuth, chatsRouter);
app.use("/notifications", requireAuth, notificationsRouter);

app.use(ErrorHandler);

export { app, server };
