import request from "supertest";
import { app } from "../../src/config/server";

export async function createChatAsUser(accessToken: string, profileId: string) {
  return request(app)
    .post("/chats")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ profileId });
}

export async function getUserChats(accessToken: string) {
  return request(app)
    .get("/chats")
    .set("Authorization", `Bearer ${accessToken}`);
}

export async function getChat(accessToken: string, chatId: string) {
  return request(app)
    .get(`/chats/${chatId}`)
    .set("Authorization", `Bearer ${accessToken}`);
}

export async function archiveChat(accessToken: string, chatMemberId: string) {
  return request(app)
    .delete(`/chats/${chatMemberId}/archive`)
    .set("Authorization", `Bearer ${accessToken}`);
}

export async function unarchiveChat(accessToken: string, chatMemberId: string) {
  return request(app)
    .post(`/chats/${chatMemberId}/unarchive`)
    .set("Authorization", `Bearer ${accessToken}`);
}
