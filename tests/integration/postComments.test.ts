import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/resetDb";
import { getUserWithProfile } from "../helpers/profile";
import { createPostAsUser } from "../helpers/posts";
import {
  commentOnPost,
  getComments,
  deleteComment,
  likeComment,
  unlikeComment,
} from "../helpers/postComments";
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

describe("POST /posts/:postId/comments", () => {
  it("rejects unauthenticated requests", async () => {
    const author = await getUserWithProfile();
    const post = await createPostAsUser(author.accessToken);

    const res = await commentOnPost("", post.publicId, "Nice post!");
    expect(res.status).toBe(401);
  });

  it("creates a comment on a public post", async () => {
    const author = await getUserWithProfile();
    const commenter = await getUserWithProfile({
      firstName: "Commenter",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);

    const res = await commentOnPost(
      commenter.accessToken,
      post.publicId,
      "Nice post!",
    );

    expect(res.status).toBe(201);
    expect(res.body.text).toBe("Nice post!");
    expect(res.body.author.publicId).toBe(commenter.profile.publicId);
    expect(res.body.likes).toBe(0);
  });

  it("rejects an empty comment body", async () => {
    const author = await getUserWithProfile();
    const post = await createPostAsUser(author.accessToken);

    const res = await commentOnPost(author.accessToken, post.publicId, "");
    expect(res.status).toBe(400);
  });

  it("returns 404 when commenting on a private post", async () => {
    const author = await getUserWithProfile();
    const commenter = await getUserWithProfile({
      firstName: "Commenter",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);
    await prisma.post.update({
      where: { publicId: post.publicId },
      data: { private: true },
    });

    const res = await commentOnPost(
      commenter.accessToken,
      post.publicId,
      "Should not work",
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 for a malformed postId", async () => {
    const { accessToken } = await getUserWithProfile();
    const res = await commentOnPost(accessToken, "not-a-uuid", "Hello");
    expect(res.status).toBe(400);
  });
});

describe("GET /posts/:postId/comments", () => {
  it("lists comments newest first", async () => {
    const author = await getUserWithProfile();
    const post = await createPostAsUser(author.accessToken);

    await commentOnPost(author.accessToken, post.publicId, "First");
    await commentOnPost(author.accessToken, post.publicId, "Second");

    const res = await getComments(author.accessToken, post.publicId);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].text).toBe("Second");
    expect(res.body[1].text).toBe("First");
  });

  it("returns an empty array for a post with no comments", async () => {
    const author = await getUserWithProfile();
    const post = await createPostAsUser(author.accessToken);

    const res = await getComments(author.accessToken, post.publicId);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("DELETE /posts/comments/:commentId", () => {
  it("deletes your own comment", async () => {
    const author = await getUserWithProfile();
    const post = await createPostAsUser(author.accessToken);
    const commentRes = await commentOnPost(
      author.accessToken,
      post.publicId,
      "Delete me",
    );

    const res = await deleteComment(
      author.accessToken,
      commentRes.body.publicId,
    );
    expect(res.status).toBe(204);

    const found = await prisma.comment.findUnique({
      where: { publicId: commentRes.body.publicId },
    });
    expect(found).toBeNull();
  });

  it("returns 404 when deleting someone else's comment", async () => {
    const author = await getUserWithProfile();
    const commenter = await getUserWithProfile({
      firstName: "Commenter",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);
    const commentRes = await commentOnPost(
      commenter.accessToken,
      post.publicId,
      "Not yours",
    );

    const res = await deleteComment(
      author.accessToken,
      commentRes.body.publicId,
    );
    expect(res.status).toBe(404);

    const stillThere = await prisma.comment.findUnique({
      where: { publicId: commentRes.body.publicId },
    });
    expect(stillThere).not.toBeNull();
  });
});

describe("POST /posts/comments/:commentId/likes", () => {
  it("likes a comment", async () => {
    const author = await getUserWithProfile();
    const liker = await getUserWithProfile({
      firstName: "Liker",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);
    const commentRes = await commentOnPost(
      author.accessToken,
      post.publicId,
      "Like this",
    );

    const res = await likeComment(liker.accessToken, commentRes.body.publicId);
    expect(res.status).toBe(201);

    const dbLike = await prisma.commentLike.findFirst({
      where: { comment: { publicId: commentRes.body.publicId } },
    });
    expect(dbLike).not.toBeNull();
  });

  it("rejects liking the same comment twice (unique constraint -> 409)", async () => {
    const author = await getUserWithProfile();
    const liker = await getUserWithProfile({
      firstName: "Liker",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);
    const commentRes = await commentOnPost(
      author.accessToken,
      post.publicId,
      "Like this",
    );

    await likeComment(liker.accessToken, commentRes.body.publicId);
    const res = await likeComment(liker.accessToken, commentRes.body.publicId);

    expect(res.status).toBe(409);
  });
});

describe("DELETE /posts/comments/:commentId/likes", () => {
  it("unlikes a previously liked comment", async () => {
    const author = await getUserWithProfile();
    const liker = await getUserWithProfile({
      firstName: "Liker",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);
    const commentRes = await commentOnPost(
      author.accessToken,
      post.publicId,
      "Like this",
    );

    await likeComment(liker.accessToken, commentRes.body.publicId);
    const res = await unlikeComment(
      liker.accessToken,
      commentRes.body.publicId,
    );

    expect(res.status).toBe(204);
  });

  it("returns 404 when unliking a comment you never liked", async () => {
    const author = await getUserWithProfile();
    const nonLiker = await getUserWithProfile({
      firstName: "Never",
      lastName: "Liked",
    });
    const post = await createPostAsUser(author.accessToken);
    const commentRes = await commentOnPost(
      author.accessToken,
      post.publicId,
      "Like this",
    );

    const res = await unlikeComment(
      nonLiker.accessToken,
      commentRes.body.publicId,
    );
    expect(res.status).toBe(404);
  });
});
