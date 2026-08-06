import request from "supertest";
import { app } from "../../src/config/server";

export async function commentOnPost(
  accessToken: string,
  postPublicId: string,
  text: string,
) {
  return request(app)
    .post(`/posts/${postPublicId}/comments`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ text });
}

export async function getComments(accessToken: string, postPublicId: string) {
  return request(app)
    .get(`/posts/${postPublicId}/comments`)
    .set("Authorization", `Bearer ${accessToken}`);
}

export async function deleteComment(
  accessToken: string,
  commentPublicId: string,
) {
  return request(app)
    .delete(`/posts/comments/${commentPublicId}`)
    .set("Authorization", `Bearer ${accessToken}`);
}

export async function likeComment(
  accessToken: string,
  commentPublicId: string,
) {
  return request(app)
    .post(`/posts/comments/${commentPublicId}/likes`)
    .set("Authorization", `Bearer ${accessToken}`);
}

export async function unlikeComment(
  accessToken: string,
  commentPublicId: string,
) {
  return request(app)
    .delete(`/posts/comments/${commentPublicId}/likes`)
    .set("Authorization", `Bearer ${accessToken}`);
}
