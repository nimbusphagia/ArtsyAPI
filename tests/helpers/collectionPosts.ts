import request from "supertest";
import { app } from "../../src/config/server";

export async function addPostToCollection(
  accessToken: string,
  collectionPublicId: string,
  postId: string,
) {
  return request(app)
    .post(`/collections/${collectionPublicId}/posts`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ postId });
}

export async function removePostFromCollection(
  accessToken: string,
  collectionPublicId: string,
  collectionPostId: string,
) {
  return request(app)
    .delete(`/collections/${collectionPublicId}/posts`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ collectionPostId });
}
