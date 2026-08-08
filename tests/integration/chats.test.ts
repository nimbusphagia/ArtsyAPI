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

  it("rejects creating a chat with yourself", async () => {
    const user = await getUserWithProfile();
    const res = await createChatAsUser(user.accessToken, user.profile.publicId);

    expect(res.status).toBe(401);
  });

  it("rejects creating a duplicate chat with the same profile", async () => {
    const user1 = await getUserWithProfile();
    const user2 = await getUserWithProfile({
      firstName: "User",
      lastName: "Two",
    });

    await createChatAsUser(user1.accessToken, user2.profile.publicId);
    const res = await createChatAsUser(
      user1.accessToken,
      user2.profile.publicId,
    );

    expect(res.status).toBe(404);
  });

  it("rejects creating a chat with someone who has blocked you", async () => {
    const blocker = await getUserWithProfile();
    const user = await getUserWithProfile({
      firstName: "User",
      lastName: "Two",
    });

    await prisma.block.create({
      data: {
        blocker: { connect: { publicId: blocker.profile.publicId } },
        blocked: { connect: { publicId: user.profile.publicId } },
      },
    });

    const res = await createChatAsUser(
      user.accessToken,
      blocker.profile.publicId,
    );
    expect(res.status).toBe(404);
  });

  it("rejects creating a chat with someone you've blocked", async () => {
    const blocker = await getUserWithProfile();
    const target = await getUserWithProfile({
      firstName: "Target",
      lastName: "User",
    });

    await prisma.block.create({
      data: {
        blocker: { connect: { publicId: blocker.profile.publicId } },
        blocked: { connect: { publicId: target.profile.publicId } },
      },
    });

    const res = await createChatAsUser(
      blocker.accessToken,
      target.profile.publicId,
    );
    expect(res.status).toBe(404);
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

  it("hides a chat from the list once the other member has blocked you", async () => {
    const user1 = await getUserWithProfile();
    const user2 = await getUserWithProfile({
      firstName: "User",
      lastName: "Two",
    });

    await createChatAsUser(user1.accessToken, user2.profile.publicId);

    await prisma.block.create({
      data: {
        blocker: { connect: { publicId: user2.profile.publicId } },
        blocked: { connect: { publicId: user1.profile.publicId } },
      },
    });

    const res = await getUserChats(user1.accessToken);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
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

  it("returns 404 for a chat the user is not a member of", async () => {
    const user1 = await getUserWithProfile();
    const user2 = await getUserWithProfile({
      firstName: "User",
      lastName: "Two",
    });
    const outsider = await getUserWithProfile({
      firstName: "Third",
      lastName: "Party",
    });

    const chat = await createChatAsUser(
      user1.accessToken,
      user2.profile.publicId,
    );
    const res = await getChat(outsider.accessToken, chat.body.publicId);

    expect(res.status).toBe(404);
  });

  it("returns 404 for a chat once the other member has blocked you", async () => {
    const user1 = await getUserWithProfile();
    const user2 = await getUserWithProfile({
      firstName: "User",
      lastName: "Two",
    });

    const chat = await createChatAsUser(
      user1.accessToken,
      user2.profile.publicId,
    );

    await prisma.block.create({
      data: {
        blocker: { connect: { publicId: user2.profile.publicId } },
        blocked: { connect: { publicId: user1.profile.publicId } },
      },
    });

    const res = await getChat(user1.accessToken, chat.body.publicId);
    expect(res.status).toBe(404);
  });
});

describe("DELETE /chats/:chatMemberId/archive", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await archiveChat("", "018f4a4a-0000-7000-8000-000000000000");
    expect(res.status).toBe(401);
  });

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

  it("returns 404 archiving a chat member that doesn't belong to you", async () => {
    const user1 = await getUserWithProfile();
    const user2 = await getUserWithProfile({
      firstName: "User",
      lastName: "Two",
    });

    const chat = await createChatAsUser(
      user1.accessToken,
      user2.profile.publicId,
    );
    const chatDetailForUser2 = await getChat(
      user2.accessToken,
      chat.body.publicId,
    );
    const user2MemberId = chatDetailForUser2.body.localMember.publicId;

    const res = await archiveChat(user1.accessToken, user2MemberId);
    expect(res.status).toBe(404);
  });

  it("returns 404 archiving a nonexistent chatMemberId", async () => {
    const user = await getUserWithProfile();
    const res = await archiveChat(
      user.accessToken,
      "018f4a4a-0000-7000-8000-000000000000",
    );
    expect(res.status).toBe(404);
  });
});

describe("POST /chats/:chatMemberId/unarchive", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await unarchiveChat("", "018f4a4a-0000-7000-8000-000000000000");
    expect(res.status).toBe(401);
  });

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

  it("returns 404 unarchiving a nonexistent chatMemberId", async () => {
    const user = await getUserWithProfile();
    const res = await unarchiveChat(
      user.accessToken,
      "018f4a4a-0000-7000-8000-000000000000",
    );
    expect(res.status).toBe(404);
  });
});
