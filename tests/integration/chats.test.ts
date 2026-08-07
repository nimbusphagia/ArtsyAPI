import { app } from "../../src/config/server";
import request from "supertest";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/resetDb";
import { getUserWithProfile } from "../helpers/profile";
import { makeUploadStreamImpl } from "../helpers/mockCloudinary";
import {
  createChatAsUser,
  getUserChats,
  getChat,
  archiveChat,
  unarchiveChat,
} from "../helpers/chats";

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

describe("POST /chats", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(app)
      .post("/chats")
      .send({ profileId: "00000000-0000-0000-0000-000000000000" });
    expect(res.status).toBe(401);
  });

  it("creates a new chat with another user's profile", async () => {
    const user1 = await getUserWithProfile();
    const user2 = await getUserWithProfile({
      firstName: "Target",
      lastName: "User",
    });

    const res = await createChatAsUser(
      user1.accessToken,
      user2.profile.publicId,
    );

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("publicId");
    expect(res.body.remoteMember.profile.publicId).toBe(user2.profile.publicId);
  });

  it("rejects invalid profileId format", async () => {
    const user = await getUserWithProfile();
    const res = await createChatAsUser(user.accessToken, "not-a-valid-uuid");

    expect(res.status).toBe(400);
  });
});

describe("GET /chats", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/chats");
    expect(res.status).toBe(401);
  });

  it("lists all chats for the authenticated user", async () => {
    const user1 = await getUserWithProfile();
    const user2 = await getUserWithProfile({
      firstName: "Bob",
      lastName: "Builder",
    });

    await createChatAsUser(user1.accessToken, user2.profile.publicId);

    const res = await getUserChats(user1.accessToken);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].remoteMember.profile.publicId).toBe(
      user2.profile.publicId,
    );
  });
});

describe("GET /chats/:chatId", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get(
      "/chats/00000000-0000-0000-0000-000000000000",
    );
    expect(res.status).toBe(401);
  });

  it("returns chat details including localMember, remoteMember, and messages", async () => {
    const user1 = await getUserWithProfile();
    const user2 = await getUserWithProfile({
      firstName: "Alice",
      lastName: "Smith",
    });

    const created = await createChatAsUser(
      user1.accessToken,
      user2.profile.publicId,
    );
    const chatId = created.body.publicId;

    const res = await getChat(user1.accessToken, chatId);

    expect(res.status).toBe(200);
    expect(res.body.publicId).toBe(chatId);
    expect(res.body.localMember.profile.publicId).toBe(user1.profile.publicId);
    expect(res.body.remoteMember.profile.publicId).toBe(user2.profile.publicId);
    expect(Array.isArray(res.body.messages)).toBe(true);
  });

  it("returns 400 for invalid chatId format", async () => {
    const user = await getUserWithProfile();
    const res = await getChat(user.accessToken, "invalid-chat-id");

    expect(res.status).toBe(400);
  });
});

describe("DELETE /chats/:chatMemberId/archive", () => {
  it("archives the chat member relationship and returns 204", async () => {
    const user1 = await getUserWithProfile();
    const user2 = await getUserWithProfile({
      firstName: "David",
      lastName: "Miller",
    });

    const created = await createChatAsUser(
      user1.accessToken,
      user2.profile.publicId,
    );
    const chatId = created.body.publicId;

    const chatDetail = await getChat(user1.accessToken, chatId);
    const localMemberId = chatDetail.body.localMember.publicId;

    const res = await archiveChat(user1.accessToken, localMemberId);
    expect(res.status).toBe(204);

    const memberInDb = await prisma.chatMember.findUnique({
      where: { publicId: localMemberId },
    });
    expect(memberInDb?.isArchived).toBe(true);
  });
});

describe("POST /chats/:chatMemberId/unarchive", () => {
  it("unarchives an archived chat member and returns 200", async () => {
    const user1 = await getUserWithProfile();
    const user2 = await getUserWithProfile({
      firstName: "Grace",
      lastName: "Hopper",
    });

    const created = await createChatAsUser(
      user1.accessToken,
      user2.profile.publicId,
    );
    const chatDetail = await getChat(user1.accessToken, created.body.publicId);
    const localMemberId = chatDetail.body.localMember.publicId;

    await archiveChat(user1.accessToken, localMemberId);

    const res = await unarchiveChat(user1.accessToken, localMemberId);
    expect(res.status).toBe(200);

    const memberInDb = await prisma.chatMember.findUnique({
      where: { publicId: localMemberId },
    });
    expect(memberInDb?.isArchived).toBe(false);
  });
});
