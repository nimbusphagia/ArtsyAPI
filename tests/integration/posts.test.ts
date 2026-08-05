import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/config/server";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/resetDb";
import { getUserWithProfile } from "../helpers/profile";
import { createPostAsUser } from "../helpers/posts";
import {
  makeUploadLargeStreamImpl,
  makeUploadStreamImpl,
} from "../helpers/mockCloudinary";

const { uploadStreamMock, uploadLargeStreamMock } = vi.hoisted(() => ({
  uploadStreamMock: vi.fn(),
  uploadLargeStreamMock: vi.fn(),
}));

vi.mock("../../src/config/cloudinary", () => ({
  default: {
    uploader: {
      upload_stream: uploadStreamMock,
      upload_large_stream: uploadLargeStreamMock,
    },
    url: vi.fn(() => "https://example.com/thumb.jpg"),
  },
}));

beforeEach(async () => {
  await resetDb();
  uploadStreamMock.mockReset();
  uploadStreamMock.mockImplementation(makeUploadStreamImpl());
  uploadLargeStreamMock.mockReset();
  uploadLargeStreamMock.mockImplementation(makeUploadLargeStreamImpl());
});

describe("POST /posts", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(app).post("/posts");
    expect(res.status).toBe(401);
  });

  it("rejects a request with no files (nonempty array required)", async () => {
    const { accessToken } = await getUserWithProfile();

    const res = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("description", "No slides here");

    expect(res.status).toBe(400);
  });

  it("creates a post with a single slide", async () => {
    const { accessToken } = await getUserWithProfile();

    const res = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("description", "My first post")
      .attach("slide-1", Buffer.from("fake-image-data"), {
        filename: "slide1.jpg",
        contentType: "image/jpeg",
      });

    expect(res.status).toBe(201);
    expect(res.body.description).toBe("My first post");
    expect(res.body.slides).toHaveLength(1);
    expect(uploadStreamMock).toHaveBeenCalledOnce();
  });

  it("creates a post with multiple slides in position order", async () => {
    const { accessToken } = await getUserWithProfile();

    const res = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${accessToken}`)
      .attach("slide-1", Buffer.from("img-1"), {
        filename: "a.jpg",
        contentType: "image/jpeg",
      })
      .attach("slide-2", Buffer.from("img-2"), {
        filename: "b.jpg",
        contentType: "image/jpeg",
      })
      .attach("slide-3", Buffer.from("img-3"), {
        filename: "c.jpg",
        contentType: "image/jpeg",
      });

    expect(res.status).toBe(201);
    expect(res.body.slides).toHaveLength(3);
    expect(uploadStreamMock).toHaveBeenCalledTimes(3);

    const positions = res.body.slides.map((s: any) => s.position).sort();
    expect(positions).toEqual([1, 2, 3]);
  });
});

describe("GET /posts/:postId", () => {
  it("returns a public post by id", async () => {
    const author = await getUserWithProfile();
    const viewer = await getUserWithProfile({
      firstName: "Viewer",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);

    const res = await request(app)
      .get(`/posts/${post.publicId}`)
      .set("Authorization", `Bearer ${viewer.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.publicId).toBe(post.publicId);
  });

  it("returns 404 for a private post viewed by someone else", async () => {
    const author = await getUserWithProfile();
    const viewer = await getUserWithProfile({
      firstName: "Viewer",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);
    await prisma.post.update({
      where: { publicId: post.publicId },
      data: { private: true },
    });

    const res = await request(app)
      .get(`/posts/${post.publicId}`)
      .set("Authorization", `Bearer ${viewer.accessToken}`);

    expect(res.status).toBe(404);
  });

  it("returns 400 for a malformed postId", async () => {
    const { accessToken } = await getUserWithProfile();
    const res = await request(app)
      .get("/posts/not-a-uuid")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
  });

  it("returns 404 for a well-formed but nonexistent postId", async () => {
    const { accessToken } = await getUserWithProfile();
    const res = await request(app)
      .get("/posts/018f4a4a-0000-7000-8000-000000000000")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });
});

describe("PATCH /posts/:postId", () => {
  it("updates description on your own post", async () => {
    const { accessToken } = await getUserWithProfile();
    const post = await createPostAsUser(accessToken);

    const res = await request(app)
      .patch(`/posts/${post.publicId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ description: "Updated text" });

    expect(res.status).toBe(200);
    expect(res.body.description).toBe("Updated text");
  });

  it("rejects an empty body (no description, no isPrivate)", async () => {
    const { accessToken } = await getUserWithProfile();
    const post = await createPostAsUser(accessToken);

    const res = await request(app)
      .patch(`/posts/${post.publicId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it("rejects editing a post that belongs to someone else", async () => {
    const owner = await getUserWithProfile();
    const attacker = await getUserWithProfile({
      firstName: "Eve",
      lastName: "Attacker",
    });
    const post = await createPostAsUser(owner.accessToken);

    const res = await request(app)
      .patch(`/posts/${post.publicId}`)
      .set("Authorization", `Bearer ${attacker.accessToken}`)
      .send({ description: "Hijacked!" });

    expect(res.status).toBe(404);

    const untouched = await prisma.post.findUnique({
      where: { publicId: post.publicId },
    });
    expect(untouched?.description).not.toBe("Hijacked!");
  });
});

describe("DELETE /posts/:postId", () => {
  it("deletes your own post", async () => {
    const { accessToken } = await getUserWithProfile();
    const post = await createPostAsUser(accessToken);

    const res = await request(app)
      .delete(`/posts/${post.publicId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(204);

    const found = await prisma.post.findUnique({
      where: { publicId: post.publicId },
    });
    expect(found).toBeNull();
  });

  it("rejects deleting a post that belongs to someone else", async () => {
    const owner = await getUserWithProfile();
    const attacker = await getUserWithProfile({
      firstName: "Eve",
      lastName: "Attacker",
    });
    const post = await createPostAsUser(owner.accessToken);

    const res = await request(app)
      .delete(`/posts/${post.publicId}`)
      .set("Authorization", `Bearer ${attacker.accessToken}`);

    expect(res.status).toBe(404);

    const stillThere = await prisma.post.findUnique({
      where: { publicId: post.publicId },
    });
    expect(stillThere).not.toBeNull();
  });
});

describe("POST /posts with mixed image and video slides", () => {
  it("creates a post with both image and video slides, preserving order and resourceType", async () => {
    const { accessToken } = await getUserWithProfile();

    const res = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${accessToken}`)
      .attach("slide-1", Buffer.from("img-data"), {
        filename: "a.jpg",
        contentType: "image/jpeg",
      })
      .attach("slide-2", Buffer.from("vid-data"), {
        filename: "b.mp4",
        contentType: "video/mp4",
      });

    expect(res.status).toBe(201);
    expect(res.body.slides).toHaveLength(2);
    expect(uploadStreamMock).toHaveBeenCalledOnce();
    expect(uploadLargeStreamMock).toHaveBeenCalledOnce();

    const byPosition = [...res.body.slides].sort(
      (a: any, b: any) => a.position - b.position,
    );
    expect(byPosition[0].media.resourceType).toBe("image");
    expect(byPosition[1].media.resourceType).toBe("video");
    expect(byPosition[1].media.thumbnail).toContain("fake_thumb");
  });

  it("stores video duration correctly (verified via GET, which returns full media detail)", async () => {
    const { accessToken } = await getUserWithProfile();

    const createRes = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${accessToken}`)
      .attach("slide-1", Buffer.from("vid-data"), {
        filename: "b.mp4",
        contentType: "video/mp4",
      });

    const getRes = await request(app)
      .get(`/posts/${createRes.body.publicId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.slides[0].media.duration).toBe(12.5);
  });
});
describe("POST /posts — slide position validation", () => {
  it("rejects a fieldname that doesn't match the slide-N pattern", async () => {
    const { accessToken } = await getUserWithProfile();

    const res = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${accessToken}`)
      .attach("banner", Buffer.from("img-1"), {
        filename: "a.jpg",
        contentType: "image/jpeg",
      });

    expect(res.status).toBe(400);
  });

  it("rejects positions with a gap (1, 3 — missing 2)", async () => {
    const { accessToken } = await getUserWithProfile();

    const res = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${accessToken}`)
      .attach("slide-1", Buffer.from("img-1"), {
        filename: "a.jpg",
        contentType: "image/jpeg",
      })
      .attach("slide-3", Buffer.from("img-2"), {
        filename: "b.jpg",
        contentType: "image/jpeg",
      });

    expect(res.status).toBe(400);
  });

  it("rejects duplicate positions (1, 1)", async () => {
    const { accessToken } = await getUserWithProfile();

    const res = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${accessToken}`)
      .attach("slide-1", Buffer.from("img-1"), {
        filename: "a.jpg",
        contentType: "image/jpeg",
      })
      .attach("slide-1", Buffer.from("img-2"), {
        filename: "b.jpg",
        contentType: "image/jpeg",
      });

    expect(res.status).toBe(400);
  });

  it("rejects positions starting at 0 instead of 1", async () => {
    const { accessToken } = await getUserWithProfile();

    const res = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${accessToken}`)
      .attach("slide-0", Buffer.from("img-1"), {
        filename: "a.jpg",
        contentType: "image/jpeg",
      });

    expect(res.status).toBe(400);
  });
});
