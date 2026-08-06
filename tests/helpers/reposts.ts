import request from "supertest";
import { app } from "../../src/config/server";

export async function repostPost(accessToken: string, postPublicId: string) {
  return request(app)
    .post(`/posts/${postPublicId}/reposts`)
    .set("Authorization", `Bearer ${accessToken}`);
}

export async function removeRepost(accessToken: string, postPublicId: string) {
  return request(app)
    .delete(`/posts/${postPublicId}/reposts`)
    .set("Authorization", `Bearer ${accessToken}`);
}

export async function getMyReposts(accessToken: string) {
  return request(app)
    .get("/profiles/reposts")
    .set("Authorization", `Bearer ${accessToken}`);
}
