import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/config/server";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/resetDb";
import { getUserWithProfile } from "../helpers/profile";
import { createPostAsUser } from "../helpers/posts";
import { makeUploadStreamImpl } from "../helpers/mockCloudinary";
import { repostPost, removeRepost, getMyReposts } from "../helpers/reposts";

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

describe("POST /posts/:postId/reposts", () => {
  it("rejects unauthenticated requests", async () => {
    const author = await getUserWithProfile();
    const post = await createPostAsUser(author.accessToken);

    const res = await repostPost("", post.publicId);
    expect(res.status).toBe(401);
  });

  it("reposts a public post", async () => {
    const author = await getUserWithProfile();
    const reposter = await getUserWithProfile({
      firstName: "Reposter",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);

    const res = await repostPost(reposter.accessToken, post.publicId);

    expect(res.status).toBe(201);
    expect(res.body.post.publicId).toBe(post.publicId);

    const dbRepost = await prisma.repost.findFirst({
      where: {
        post: { publicId: post.publicId },
        reposter: { publicId: reposter.profile.publicId },
      },
    });
    expect(dbRepost).not.toBeNull();
  });

  it("allows reposting your own public post", async () => {
    const author = await getUserWithProfile();
    const post = await createPostAsUser(author.accessToken);

    const res = await repostPost(author.accessToken, post.publicId);
    expect(res.status).toBe(201);
  });

  it("returns 404 when reposting a private post", async () => {
    const author = await getUserWithProfile();
    const reposter = await getUserWithProfile({
      firstName: "Reposter",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);
    await prisma.post.update({
      where: { publicId: post.publicId },
      data: { private: true },
    });

    const res = await repostPost(reposter.accessToken, post.publicId);
    expect(res.status).toBe(404);
  });

  it("rejects reposting the same post twice (unique constraint -> 409)", async () => {
    const author = await getUserWithProfile();
    const reposter = await getUserWithProfile({
      firstName: "Reposter",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);

    await repostPost(reposter.accessToken, post.publicId);
    const res = await repostPost(reposter.accessToken, post.publicId);

    expect(res.status).toBe(409);
  });

  it("returns 400 for a malformed postId", async () => {
    const { accessToken } = await getUserWithProfile();
    const res = await repostPost(accessToken, "not-a-uuid");
    expect(res.status).toBe(400);
  });

  it("returns 404 for a well-formed but nonexistent postId", async () => {
    const { accessToken } = await getUserWithProfile();
    const res = await repostPost(
      accessToken,
      "018f4a4a-0000-7000-8000-000000000000",
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /posts/:postId/reposts", () => {
  it("rejects unauthenticated requests", async () => {
    const author = await getUserWithProfile();
    const post = await createPostAsUser(author.accessToken);

    const res = await removeRepost("", post.publicId);
    expect(res.status).toBe(401);
  });

  it("removes a previously created repost", async () => {
    const author = await getUserWithProfile();
    const reposter = await getUserWithProfile({
      firstName: "Reposter",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);

    await repostPost(reposter.accessToken, post.publicId);
    const res = await removeRepost(reposter.accessToken, post.publicId);

    expect(res.status).toBe(204);

    const dbRepost = await prisma.repost.findFirst({
      where: {
        post: { publicId: post.publicId },
        reposter: { publicId: reposter.profile.publicId },
      },
    });
    expect(dbRepost).toBeNull();
  });

  it("returns 404 when removing a repost you never made", async () => {
    const author = await getUserWithProfile();
    const nonReposter = await getUserWithProfile({
      firstName: "Never",
      lastName: "Reposted",
    });
    const post = await createPostAsUser(author.accessToken);

    const res = await removeRepost(nonReposter.accessToken, post.publicId);
    expect(res.status).toBe(404);
  });
});

describe("GET /profiles/reposts (my reposts)", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/profiles/reposts");
    expect(res.status).toBe(401);
  });

  it("lists posts the current user has reposted", async () => {
    const author = await getUserWithProfile();
    const reposter = await getUserWithProfile({
      firstName: "Reposter",
      lastName: "Person",
    });
    const post1 = await createPostAsUser(author.accessToken);
    const post2 = await createPostAsUser(author.accessToken);

    await repostPost(reposter.accessToken, post1.publicId);
    await repostPost(reposter.accessToken, post2.publicId);

    const res = await getMyReposts(reposter.accessToken);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    const publicIds = res.body.map((r: any) => r.post.publicId);
    expect(publicIds).toContain(post1.publicId);
    expect(publicIds).toContain(post2.publicId);
  });

  it("returns an empty array when the user has no reposts", async () => {
    const { accessToken } = await getUserWithProfile();
    const res = await getMyReposts(accessToken);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("does not include another user's reposts", async () => {
    const author = await getUserWithProfile();
    const reposterA = await getUserWithProfile({
      firstName: "Reposter",
      lastName: "A",
    });
    const reposterB = await getUserWithProfile({
      firstName: "Reposter",
      lastName: "B",
    });
    const post = await createPostAsUser(author.accessToken);

    await repostPost(reposterA.accessToken, post.publicId);

    const res = await getMyReposts(reposterB.accessToken);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("no longer lists a repost after the original post becomes private", async () => {
    const author = await getUserWithProfile();
    const reposter = await getUserWithProfile({
      firstName: "Reposter",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);

    await repostPost(reposter.accessToken, post.publicId);
    await prisma.post.update({
      where: { publicId: post.publicId },
      data: { private: true },
    });

    const res = await getMyReposts(reposter.accessToken);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
  it("no longer lists a repost after the original author blocks you", async () => {
    const author = await getUserWithProfile();
    const reposter = await getUserWithProfile({
      firstName: "Reposter",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);

    await repostPost(reposter.accessToken, post.publicId);

    await prisma.block.create({
      data: {
        blockerId: (
          await prisma.profile.findUniqueOrThrow({
            where: { publicId: author.profile.publicId },
          })
        ).id,
        blockedId: (
          await prisma.profile.findUniqueOrThrow({
            where: { publicId: reposter.profile.publicId },
          })
        ).id,
      },
    });

    const res = await getMyReposts(reposter.accessToken);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});
