import request from "supertest";
import { app } from "../../src/config/server";

export async function likeCollection(
  accessToken: string,
  collectionPublicId: string,
) {
  return request(app)
    .post(`/collections/${collectionPublicId}/likes`)
    .set("Authorization", `Bearer ${accessToken}`);
}

export async function unlikeCollection(
  accessToken: string,
  collectionPublicId: string,
) {
  return request(app)
    .delete(`/collections/${collectionPublicId}/likes`)
    .set("Authorization", `Bearer ${accessToken}`);
}

export async function getCollectionLikes(
  accessToken: string,
  collectionPublicId: string,
) {
  return request(app)
    .get(`/collections/${collectionPublicId}/likes`)
    .set("Authorization", `Bearer ${accessToken}`);
}
