import { Router } from "express";
import {
  archiveChat,
  createChat,
  getChat,
  listChatsByUser,
  unarchiveChat,
} from "./chats.controller";
import messagesRouter from "./messages/messages.routes";

const router = Router();

router.get("/", listChatsByUser);
router.post("/", createChat);
router.get("/:chatId", getChat);

router.delete("/:chatId/archive", archiveChat);
router.post("/:chatId/unarchive", unarchiveChat);

router.use("/messages", messagesRouter);

export default router;
