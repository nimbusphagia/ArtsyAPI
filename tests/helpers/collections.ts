import request from "supertest";
import { app } from "../../src/config/server";

export async function createCollectionAsUser(
  accessToken: string,
  posts: { publicId: string; position: number }[],
  overrides: { name?: string; description?: string; isPrivate?: boolean } = {},
) {
  const res = await request(app)
    .post("/collections")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: overrides.name ?? "Test Collection",
      ...(overrides.description !== undefined && {
        description: overrides.description,
      }),
      ...(overrides.isPrivate !== undefined && {
        isPrivate: overrides.isPrivate,
      }),
      posts,
    });

  if (res.status !== 201) {
    throw new Error(
      `Setup failed: collection creation returned ${res.status} — ${JSON.stringify(res.body)}`,
    );
  }
  return res.body;
}

export async function getCollection(
  accessToken: string,
  collectionPublicId: string,
) {
  return request(app)
    .get(`/collections/${collectionPublicId}`)
    .set("Authorization", `Bearer ${accessToken}`);
}

export async function editCollection(
  accessToken: string,
  collectionPublicId: string,
  data: object,
) {
  return request(app)
    .patch(`/collections/${collectionPublicId}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send(data);
}

export async function deleteCollection(
  accessToken: string,
  collectionPublicId: string,
) {
  return request(app)
    .delete(`/collections/${collectionPublicId}`)
    .set("Authorization", `Bearer ${accessToken}`);
}

export async function reorderCollection(
  accessToken: string,
  collectionPublicId: string,
  posts: { publicId: string; position: number }[],
) {
  return request(app)
    .put(`/collections/${collectionPublicId}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ posts });
}
