import request from "supertest";
import { app } from "../../src/config/server";

export async function likePost(accessToken: string, postPublicId: string) {
  return request(app)
    .post(`/posts/${postPublicId}/likes`)
    .set("Authorization", `Bearer ${accessToken}`);
}

export async function unlikePost(accessToken: string, postPublicId: string) {
  return request(app)
    .delete(`/posts/${postPublicId}/likes`)
    .set("Authorization", `Bearer ${accessToken}`);
}

export async function getPostLikes(accessToken: string, postPublicId: string) {
  return request(app)
    .get(`/posts/${postPublicId}/likes`)
    .set("Authorization", `Bearer ${accessToken}`);
}
