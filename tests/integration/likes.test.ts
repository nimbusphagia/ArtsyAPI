import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/resetDb";
import { getUserWithProfile } from "../helpers/profile";
import { createPostAsUser } from "../helpers/posts";
import { likePost, unlikePost, getPostLikes } from "../helpers/postLikes";
import { makeUploadStreamImpl } from "../helpers/mockCloudinary";

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

describe("POST /posts/:postId/likes", () => {
  it("rejects unauthenticated requests", async () => {
    const author = await getUserWithProfile();
    const post = await createPostAsUser(author.accessToken);

    const res = await likePost("", post.publicId);
    expect(res.status).toBe(401);
  });
  it("likes a public post", async () => {
    const author = await getUserWithProfile();
    const liker = await getUserWithProfile({
      firstName: "Liker",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);

    const res = await likePost(liker.accessToken, post.publicId);
    expect(res.status).toBe(201);

    const dbLike = await prisma.postLike.findFirst({
      where: { post: { publicId: post.publicId } },
    });
    expect(dbLike).not.toBeNull();
  });

  it("allows liking your own public post", async () => {
    const author = await getUserWithProfile();
    const post = await createPostAsUser(author.accessToken);

    const res = await likePost(author.accessToken, post.publicId);
    expect(res.status).toBe(201);
  });

  it("rejects liking the same post twice (unique constraint -> 409)", async () => {
    const author = await getUserWithProfile();
    const liker = await getUserWithProfile({
      firstName: "Liker",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);

    await likePost(liker.accessToken, post.publicId);
    const res = await likePost(liker.accessToken, post.publicId);

    expect(res.status).toBe(409);
  });

  it("returns 404 when liking a private post, including your own", async () => {
    const author = await getUserWithProfile();
    const post = await createPostAsUser(author.accessToken);
    await prisma.post.update({
      where: { publicId: post.publicId },
      data: { private: true },
    });

    const res = await likePost(author.accessToken, post.publicId);
    expect(res.status).toBe(404);
  });

  it("returns 400 for a malformed postId", async () => {
    const { accessToken } = await getUserWithProfile();
    const res = await likePost(accessToken, "not-a-uuid");
    expect(res.status).toBe(400);
  });

  it("returns 404 for a well-formed but nonexistent postId", async () => {
    const { accessToken } = await getUserWithProfile();
    const res = await likePost(
      accessToken,
      "018f4a4a-0000-7000-8000-000000000000",
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /posts/:postId/likes", () => {
  it("rejects unauthenticated requests", async () => {
    const author = await getUserWithProfile();
    const post = await createPostAsUser(author.accessToken);

    const res = await unlikePost("", post.publicId);
    expect(res.status).toBe(401);
  });

  it("unlikes a previously liked post", async () => {
    const author = await getUserWithProfile();
    const liker = await getUserWithProfile({
      firstName: "Liker",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);

    await likePost(liker.accessToken, post.publicId);
    const res = await unlikePost(liker.accessToken, post.publicId);

    expect(res.status).toBe(204);

    const dbLike = await prisma.postLike.findFirst({
      where: {
        post: { publicId: post.publicId },
        owner: { publicId: liker.profile.publicId },
      },
    });
    expect(dbLike).toBeNull();
  });

  it("returns 404 when unliking a post you never liked", async () => {
    const author = await getUserWithProfile();
    const nonLiker = await getUserWithProfile({
      firstName: "Never",
      lastName: "Liked",
    });
    const post = await createPostAsUser(author.accessToken);

    const res = await unlikePost(nonLiker.accessToken, post.publicId);
    expect(res.status).toBe(404);
  });
});

describe("GET /posts/:postId/likes", () => {
  it("rejects unauthenticated requests", async () => {
    const author = await getUserWithProfile();
    const post = await createPostAsUser(author.accessToken);

    const res = await getPostLikes("", post.publicId);
    expect(res.status).toBe(401);
  });

  it("lists profiles who liked the post", async () => {
    const author = await getUserWithProfile();
    const liker = await getUserWithProfile({
      firstName: "Liker",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);

    await likePost(liker.accessToken, post.publicId);
    const res = await getPostLikes(author.accessToken, post.publicId);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].owner.publicId).toBe(liker.profile.publicId);
  });

  it("returns an empty array for a post with no likes", async () => {
    const author = await getUserWithProfile();
    const post = await createPostAsUser(author.accessToken);

    const res = await getPostLikes(author.accessToken, post.publicId);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
