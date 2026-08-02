import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import { app } from "../src/config/server";
import { prisma } from "../src/config/prisma";
import { resetDb } from "./helpers/resetDb";
import { getAuthenticatedUser } from "./helpers/auth";
import { getUserWithProfile } from "./helpers/profile";

const { uploadStreamMock } = vi.hoisted(() => ({
  uploadStreamMock: vi.fn(),
}));

vi.mock("../src/config/cloudinary", () => ({
  default: {
    uploader: {
      upload_stream: uploadStreamMock,
      upload_large_stream: vi.fn(),
    },
    url: vi.fn(() => "https://example.com/thumb.jpg"),
  },
}));

beforeEach(async () => {
  await resetDb();
});

describe("POST /profiles", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(app).post("/profiles").send({});
    expect(res.status).toBe(401);
  });

  it("creates a profile using default assets when no files are uploaded", async () => {
    const { accessToken } = await getAuthenticatedUser({
      firstName: "Ada",
      lastName: "Lovelace",
    });

    const res = await request(app)
      .post("/profiles")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.nickname).toBe("Ada Lovelace");
    expect(res.body.picture).toBeDefined();
  });

  it("accepts a custom nickname", async () => {
    const { accessToken } = await getAuthenticatedUser();

    const res = await request(app)
      .post("/profiles")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ nickname: "CoolArtist" });

    expect(res.status).toBe(201);
    expect(res.body.nickname).toBe("CoolArtist");
  });

  it("rejects creating a second profile for the same user", async () => {
    const { accessToken } = await getUserWithProfile();

    const res = await request(app)
      .post("/profiles")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(409);
  });
});

describe("GET /profiles/me", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/profiles/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 (per getCurrentProfile logic) if no profile exists yet", async () => {
    // getCurrentProfile's currentUser lookup requires profile: { isNot: null },
    // so a user without a profile fails that check → UnauthorizedError, not 404
    const { accessToken } = await getAuthenticatedUser();

    const res = await request(app)
      .get("/profiles/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(401);
  });

  it("returns the current profile", async () => {
    const { accessToken, profile } = await getUserWithProfile();

    const res = await request(app)
      .get("/profiles/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.publicId).toBe(profile.publicId);
    expect(res.body.followerCount).toBe(0);
    expect(res.body.followingCount).toBe(0);
  });
});

describe("GET /profiles/:profileId", () => {
  it("returns another user's profile by publicId", async () => {
    const viewer = await getUserWithProfile();
    const target = await getUserWithProfile({
      firstName: "Target",
      lastName: "User",
    });

    const res = await request(app)
      .get(`/profiles/${target.profile.publicId}`)
      .set("Authorization", `Bearer ${viewer.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.publicId).toBe(target.profile.publicId);
  });

  it("returns 400 for a malformed profileId", async () => {
    const { accessToken } = await getUserWithProfile();

    const res = await request(app)
      .get("/profiles/not-a-uuid")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
  });

  it("returns 404 for a well-formed but nonexistent profileId", async () => {
    const { accessToken } = await getUserWithProfile();

    const res = await request(app)
      .get("/profiles/018f4a4a-0000-7000-8000-000000000000")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });
});

describe("PATCH /profiles/me", () => {
  it("updates nickname and description", async () => {
    const { accessToken } = await getUserWithProfile();

    const res = await request(app)
      .patch("/profiles/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ nickname: "NewNick", description: "Hello world" });

    expect(res.status).toBe(200);
    expect(res.body.nickname).toBe("NewNick");
    expect(res.body.description).toBe("Hello world");
  });
});

describe("GET /profiles", () => {
  it("lists profiles filtered by nickname prefix", async () => {
    const viewer = await getUserWithProfile();
    await getUserWithProfile({ firstName: "Zed", lastName: "Zephyr" });

    const res = await request(app)
      .get("/profiles")
      .query({ nickname: "Zed" })
      .set("Authorization", `Bearer ${viewer.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].nickname).toBe("Zed Zephyr");
  });
});

describe("POST /profiles with an uploaded picture (Cloudinary mocked)", () => {
  beforeEach(() => {
    uploadStreamMock.mockReset();
    uploadStreamMock.mockImplementation((_options: any, callback: any) => ({
      end: () => {
        callback(undefined, {
          public_id: "fake_public_id",
          asset_id: "fake_asset_id",
          resource_type: "image",
          format: "jpg",
          secure_url: "https://example.com/fake.jpg",
          width: 500,
          height: 500,
          bytes: 12345,
        });
      },
    }));
  });

  it("uploads a picture and stores real Asset/Media rows", async () => {
    const { accessToken } = await getAuthenticatedUser();

    const res = await request(app)
      .post("/profiles")
      .set("Authorization", `Bearer ${accessToken}`)
      .attach("profilePicture", Buffer.from("fake-image-data"), {
        filename: "test.jpg",
        contentType: "image/jpeg",
      });
    if (res.status !== 201) console.log("ERROR BODY:", res.body);

    expect(res.status).toBe(201);
    expect(uploadStreamMock).toHaveBeenCalledOnce();

    const asset = await prisma.asset.findUnique({
      where: { publicId: res.body.picture.publicId },
      include: { media: true },
    });
    expect(asset?.media?.cloudinaryId).toBe("fake_public_id");
  });
});
