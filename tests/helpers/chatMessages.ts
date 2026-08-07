import request from "supertest";
import { app } from "../../src/config/server";

export async function sendMessage(
  accessToken: string,
  chatId: string,
  data: {
    type: "TEXT" | "POST" | "COLLECTION";
    text?: string;
    postId?: string;
    collectionId?: string;
  },
) {
  return request(app)
    .post(`/chats/${chatId}/messages`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send(data);
}

export async function replyToMessage(
  accessToken: string,
  chatId: string,
  messageId: string,
  text: string,
) {
  return request(app)
    .post(`/chats/${chatId}/messages/${messageId}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ replyToId: messageId, text });
}

export async function deleteMessage(
  accessToken: string,
  chatId: string,
  messageId: string,
) {
  return request(app)
    .delete(`/chats/${chatId}/messages/${messageId}`)
    .set("Authorization", `Bearer ${accessToken}`);
}
