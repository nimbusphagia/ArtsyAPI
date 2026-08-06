import { app } from "../../src/config/server";
import request from "supertest";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/resetDb";
import { getUserWithProfile } from "../helpers/profile";
import { createPostAsUser } from "../helpers/posts";
import { makeUploadStreamImpl } from "../helpers/mockCloudinary";
import {
  createCollectionAsUser,
  getCollection,
  editCollection,
  deleteCollection,
  reorderCollection,
} from "../helpers/collections";
import {
  addPostToCollection,
  removePostFromCollection,
} from "../helpers/collectionPosts";
import {
  likeCollection,
  unlikeCollection,
  getCollectionLikes,
} from "../helpers/collectionLikes";

const { uploadStreamMock } = vi.hoisted(() => ({ uploadStreamMock: vi.fn() }));

vi.mock("../../src/config/cloudinary", () => ({
  default: {
    uploader: { upload_stream: uploadStreamMock, upload_large_stream: vi.fn() },
    url: vi.fn(() => "https://example.com/thumb.jpg"),
  },
}));

beforeEach(async () => {
  await resetDb();
  uploadStreamMock.mockReset();
  uploadStreamMock.mockImplementation(makeUploadStreamImpl());
});

describe("POST /collections", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(app)
      .post("/collections")
      .send({ name: "X", posts: [] });
    expect(res.status).toBe(401);
  });

  it("creates a collection from your own posts", async () => {
    const author = await getUserWithProfile();
    const post = await createPostAsUser(author.accessToken);

    const collection = await createCollectionAsUser(author.accessToken, [
      { publicId: post.publicId, position: 1 },
    ]);

    expect(collection.name).toBe("Test Collection");
    expect(collection.posts).toHaveLength(1);
    expect(collection.posts[0].position).toBe(1);
  });

  it("allows combining posts from different users (intended behavior)", async () => {
    const curator = await getUserWithProfile();
    const otherAuthor = await getUserWithProfile({
      firstName: "Other",
      lastName: "Author",
    });
    const post = await createPostAsUser(otherAuthor.accessToken);

    const collection = await createCollectionAsUser(curator.accessToken, [
      { publicId: post.publicId, position: 1 },
    ]);

    expect(collection.posts).toHaveLength(1);
    expect(collection.posts[0].post.publicId).toBe(post.publicId);
  });

  it("rejects a private post from another user", async () => {
    const curator = await getUserWithProfile();
    const otherAuthor = await getUserWithProfile({
      firstName: "Other",
      lastName: "Author",
    });
    const post = await createPostAsUser(otherAuthor.accessToken);
    await prisma.post.update({
      where: { publicId: post.publicId },
      data: { private: true },
    });

    const res = await request(app)
      .post("/collections")
      .set("Authorization", `Bearer ${curator.accessToken}`)
      .send({ name: "X", posts: [{ publicId: post.publicId, position: 1 }] });

    expect(res.status).toBe(404);
  });

  it("rejects non-sequential positions (gap)", async () => {
    const author = await getUserWithProfile();
    const post1 = await createPostAsUser(author.accessToken);
    const post2 = await createPostAsUser(author.accessToken);

    const res = await request(app)
      .post("/collections")
      .set("Authorization", `Bearer ${author.accessToken}`)
      .send({
        name: "X",
        posts: [
          { publicId: post1.publicId, position: 1 },
          { publicId: post2.publicId, position: 3 },
        ],
      });

    expect(res.status).toBe(400);
  });

  it("rejects an empty posts array", async () => {
    const { accessToken } = await getUserWithProfile();
    const res = await request(app)
      .post("/collections")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "X", posts: [] });

    expect(res.status).toBe(400);
  });
});

describe("GET /collections/:collectionId", () => {
  it("returns a public collection to anyone", async () => {
    const author = await getUserWithProfile();
    const viewer = await getUserWithProfile({
      firstName: "Viewer",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);
    const collection = await createCollectionAsUser(author.accessToken, [
      { publicId: post.publicId, position: 1 },
    ]);

    const res = await getCollection(viewer.accessToken, collection.publicId);
    expect(res.status).toBe(200);
    expect(res.body.publicId).toBe(collection.publicId);
  });

  it("returns 404 for a private collection viewed by someone else", async () => {
    const author = await getUserWithProfile();
    const viewer = await getUserWithProfile({
      firstName: "Viewer",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);
    const collection = await createCollectionAsUser(
      author.accessToken,
      [{ publicId: post.publicId, position: 1 }],
      { isPrivate: true },
    );

    const res = await getCollection(viewer.accessToken, collection.publicId);
    expect(res.status).toBe(404);
  });

  it("allows the owner to view their own private collection", async () => {
    const author = await getUserWithProfile();
    const post = await createPostAsUser(author.accessToken);
    const collection = await createCollectionAsUser(
      author.accessToken,
      [{ publicId: post.publicId, position: 1 }],
      { isPrivate: true },
    );

    const res = await getCollection(author.accessToken, collection.publicId);
    expect(res.status).toBe(200);
  });
});

describe("PATCH /collections/:collectionId", () => {
  it("updates name/description/privacy on your own collection", async () => {
    const author = await getUserWithProfile();
    const post = await createPostAsUser(author.accessToken);
    const collection = await createCollectionAsUser(author.accessToken, [
      { publicId: post.publicId, position: 1 },
    ]);

    const res = await editCollection(author.accessToken, collection.publicId, {
      name: "Renamed",
    });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Renamed");
  });

  it("rejects editing a collection that belongs to someone else", async () => {
    const owner = await getUserWithProfile();
    const attacker = await getUserWithProfile({
      firstName: "Eve",
      lastName: "Attacker",
    });
    const post = await createPostAsUser(owner.accessToken);
    const collection = await createCollectionAsUser(owner.accessToken, [
      { publicId: post.publicId, position: 1 },
    ]);

    const res = await editCollection(
      attacker.accessToken,
      collection.publicId,
      { name: "Hijacked" },
    );
    expect(res.status).toBe(404);

    const untouched = await prisma.collection.findUnique({
      where: { publicId: collection.publicId },
    });
    expect(untouched?.name).not.toBe("Hijacked");
  });

  it("rejects an empty edit body", async () => {
    const author = await getUserWithProfile();
    const post = await createPostAsUser(author.accessToken);
    const collection = await createCollectionAsUser(author.accessToken, [
      { publicId: post.publicId, position: 1 },
    ]);

    const res = await editCollection(
      author.accessToken,
      collection.publicId,
      {},
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /collections/:collectionId", () => {
  it("deletes your own collection", async () => {
    const author = await getUserWithProfile();
    const post = await createPostAsUser(author.accessToken);
    const collection = await createCollectionAsUser(author.accessToken, [
      { publicId: post.publicId, position: 1 },
    ]);

    const res = await deleteCollection(author.accessToken, collection.publicId);
    expect(res.status).toBe(204);

    const found = await prisma.collection.findUnique({
      where: { publicId: collection.publicId },
    });
    expect(found).toBeNull();
  });

  it("rejects deleting a collection that belongs to someone else", async () => {
    const owner = await getUserWithProfile();
    const attacker = await getUserWithProfile({
      firstName: "Eve",
      lastName: "Attacker",
    });
    const post = await createPostAsUser(owner.accessToken);
    const collection = await createCollectionAsUser(owner.accessToken, [
      { publicId: post.publicId, position: 1 },
    ]);

    const res = await deleteCollection(
      attacker.accessToken,
      collection.publicId,
    );
    expect(res.status).toBe(404);
  });
});

describe("POST /collections/:collectionId/posts (add)", () => {
  it("adds a post and appends it at the next position", async () => {
    const author = await getUserWithProfile();
    const post1 = await createPostAsUser(author.accessToken);
    const post2 = await createPostAsUser(author.accessToken);
    const collection = await createCollectionAsUser(author.accessToken, [
      { publicId: post1.publicId, position: 1 },
    ]);

    const res = await addPostToCollection(
      author.accessToken,
      collection.publicId,
      post2.publicId,
    );
    expect(res.status).toBe(201);
    expect(res.body.position).toBe(2);
  });

  it("returns 404 when adding a post to a collection you don't own", async () => {
    const owner = await getUserWithProfile();
    const attacker = await getUserWithProfile({
      firstName: "Eve",
      lastName: "Attacker",
    });
    const post = await createPostAsUser(owner.accessToken);
    const collection = await createCollectionAsUser(owner.accessToken, [
      { publicId: post.publicId, position: 1 },
    ]);
    const attackerPost = await createPostAsUser(attacker.accessToken);

    const res = await addPostToCollection(
      attacker.accessToken,
      collection.publicId,
      attackerPost.publicId,
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /collections/:collectionId/posts (remove)", () => {
  it("removes a post using the CollectionPost publicId and shifts later positions down", async () => {
    const author = await getUserWithProfile();
    const post1 = await createPostAsUser(author.accessToken);
    const post2 = await createPostAsUser(author.accessToken);
    const post3 = await createPostAsUser(author.accessToken);

    const collection = await createCollectionAsUser(author.accessToken, [
      { publicId: post1.publicId, position: 1 },
      { publicId: post2.publicId, position: 2 },
      { publicId: post3.publicId, position: 3 },
    ]);

    const middleColPost = collection.posts.find(
      (p: any) => p.post.publicId === post2.publicId,
    );

    const res = await removePostFromCollection(
      author.accessToken,
      collection.publicId,
      middleColPost.publicId,
    );
    expect(res.status).toBe(204);

    const updated = await getCollection(
      author.accessToken,
      collection.publicId,
    );
    const remaining = updated.body.posts.sort(
      (a: any, b: any) => a.position - b.position,
    );
    expect(remaining).toHaveLength(2);
    expect(remaining[0].post.publicId).toBe(post1.publicId);
    expect(remaining[0].position).toBe(1);
    expect(remaining[1].post.publicId).toBe(post3.publicId);
    expect(remaining[1].position).toBe(2);
  });

  it("returns 404 when using the underlying Post publicId instead of CollectionPost publicId (documents current API contract)", async () => {
    const author = await getUserWithProfile();
    const post = await createPostAsUser(author.accessToken);
    const collection = await createCollectionAsUser(author.accessToken, [
      { publicId: post.publicId, position: 1 },
    ]);

    const res = await removePostFromCollection(
      author.accessToken,
      collection.publicId,
      post.publicId,
    );
    expect(res.status).toBe(404);
  });
});

describe("PUT /collections/:collectionId (reorder)", () => {
  it("reverses the order of all posts", async () => {
    const author = await getUserWithProfile();
    const post1 = await createPostAsUser(author.accessToken);
    const post2 = await createPostAsUser(author.accessToken);
    const post3 = await createPostAsUser(author.accessToken);

    const collection = await createCollectionAsUser(author.accessToken, [
      { publicId: post1.publicId, position: 1 },
      { publicId: post2.publicId, position: 2 },
      { publicId: post3.publicId, position: 3 },
    ]);

    const colPostByPost = new Map(
      collection.posts.map((p: any) => [p.post.publicId, p.publicId]),
    );

    const res = await reorderCollection(
      author.accessToken,
      collection.publicId,
      [
        { publicId: String(colPostByPost.get(post1.publicId)), position: 3 },
        { publicId: String(colPostByPost.get(post2.publicId)), position: 2 },
        { publicId: String(colPostByPost.get(post3.publicId)), position: 1 },
      ],
    );

    expect(res.status).toBe(200);
    const sorted = res.body.posts.sort(
      (a: any, b: any) => a.position - b.position,
    );
    expect(sorted[0].post.publicId).toBe(post3.publicId);
    expect(sorted[2].post.publicId).toBe(post1.publicId);
  });

  it("rejects a reorder payload missing a post currently in the collection", async () => {
    const author = await getUserWithProfile();
    const post1 = await createPostAsUser(author.accessToken);
    const post2 = await createPostAsUser(author.accessToken);

    const collection = await createCollectionAsUser(author.accessToken, [
      { publicId: post1.publicId, position: 1 },
      { publicId: post2.publicId, position: 2 },
    ]);

    const colPost1 = collection.posts.find(
      (p: any) => p.post.publicId === post1.publicId,
    ).publicId;

    const res = await reorderCollection(
      author.accessToken,
      collection.publicId,
      [{ publicId: colPost1, position: 1 }],
    );

    expect(res.status).toBe(400);
  });
});

describe("Collection likes", () => {
  it("likes a public collection", async () => {
    const author = await getUserWithProfile();
    const liker = await getUserWithProfile({
      firstName: "Liker",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);
    const collection = await createCollectionAsUser(author.accessToken, [
      { publicId: post.publicId, position: 1 },
    ]);

    const res = await likeCollection(liker.accessToken, collection.publicId);
    expect(res.status).toBe(201);
  });

  it("returns 404 when liking a private collection", async () => {
    const author = await getUserWithProfile();
    const liker = await getUserWithProfile({
      firstName: "Liker",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);
    const collection = await createCollectionAsUser(
      author.accessToken,
      [{ publicId: post.publicId, position: 1 }],
      { isPrivate: true },
    );

    const res = await likeCollection(liker.accessToken, collection.publicId);
    expect(res.status).toBe(404);
  });

  it("unlikes a previously liked collection", async () => {
    const author = await getUserWithProfile();
    const liker = await getUserWithProfile({
      firstName: "Liker",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);
    const collection = await createCollectionAsUser(author.accessToken, [
      { publicId: post.publicId, position: 1 },
    ]);

    await likeCollection(liker.accessToken, collection.publicId);
    const res = await unlikeCollection(liker.accessToken, collection.publicId);
    expect(res.status).toBe(204);
  });

  it("lists profiles who liked the collection", async () => {
    const author = await getUserWithProfile();
    const liker = await getUserWithProfile({
      firstName: "Liker",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);
    const collection = await createCollectionAsUser(author.accessToken, [
      { publicId: post.publicId, position: 1 },
    ]);

    await likeCollection(liker.accessToken, collection.publicId);
    const res = await getCollectionLikes(
      author.accessToken,
      collection.publicId,
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].owner.publicId).toBe(liker.profile.publicId);
  });
});
