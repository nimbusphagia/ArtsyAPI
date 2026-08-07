import { app } from "../../src/config/server";
import request from "supertest";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/resetDb";
import { getUserWithProfile } from "../helpers/profile";
import { createPostAsUser } from "../helpers/posts";
import { createCollectionAsUser } from "../helpers/collections";
import { createChatAsUser } from "../helpers/chats";
import {
  sendMessage,
  replyToMessage,
  deleteMessage,
} from "../helpers/chatMessages";
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

describe("POST /chats/:chatId/messages (Create Message)", () => {
  it("rejects unauthenticated requests", async () => {
    const user1 = await getUserWithProfile();
    const user2 = await getUserWithProfile({
      firstName: "Bob",
      lastName: "Builder",
    });
    const chatRes = await createChatAsUser(
      user1.accessToken,
      user2.profile.publicId,
    );
    const validChatId = chatRes.body.publicId;

    const res = await request(app)
      .post(`/chats/${validChatId}/messages`)
      .send({ type: "TEXT", text: "Hello" });

    expect(res.status).toBe(401);
  });

  it("sends a TEXT message successfully", async () => {
    const sender = await getUserWithProfile();
    const recipient = await getUserWithProfile({
      firstName: "Alice",
      lastName: "Smith",
    });

    const chatRes = await createChatAsUser(
      sender.accessToken,
      recipient.profile.publicId,
    );
    const chatId = chatRes.body.publicId;

    const res = await sendMessage(sender.accessToken, chatId, {
      type: "TEXT",
      text: "Hey there!",
    });

    expect(res.status).toBe(201);
    expect(res.body.text).toBe("Hey there!");
    expect(res.body.type).toBe("TEXT");
    expect(res.body.owner.publicId).toBe(sender.profile.publicId);
  });

  it("sends a POST message successfully", async () => {
    const sender = await getUserWithProfile();
    const recipient = await getUserWithProfile({
      firstName: "Bob",
      lastName: "Jones",
    });

    const post = await createPostAsUser(sender.accessToken);
    const chatRes = await createChatAsUser(
      sender.accessToken,
      recipient.profile.publicId,
    );
    const chatId = chatRes.body.publicId;

    const res = await sendMessage(sender.accessToken, chatId, {
      type: "POST",
      postId: post.publicId,
    });

    expect(res.status).toBe(201);
    expect(res.body.type).toBe("POST");
    expect(res.body.post.publicId).toBe(post.publicId);
  });

  it("sends a COLLECTION message successfully", async () => {
    const sender = await getUserWithProfile();
    const recipient = await getUserWithProfile({
      firstName: "Charlie",
      lastName: "Brown",
    });

    const post = await createPostAsUser(sender.accessToken);
    const collection = await createCollectionAsUser(sender.accessToken, [
      { publicId: post.publicId, position: 1 },
    ]);

    const chatRes = await createChatAsUser(
      sender.accessToken,
      recipient.profile.publicId,
    );
    const chatId = chatRes.body.publicId;

    const res = await sendMessage(sender.accessToken, chatId, {
      type: "COLLECTION",
      collectionId: collection.publicId,
    });

    expect(res.status).toBe(201);
    expect(res.body.type).toBe("COLLECTION");
    expect(res.body.collection.publicId).toBe(collection.publicId);
  });

  it("rejects sending a message to a chat the user is not part of", async () => {
    const user1 = await getUserWithProfile();
    const user2 = await getUserWithProfile({
      firstName: "User",
      lastName: "Two",
    });
    const outsider = await getUserWithProfile({
      firstName: "Eve",
      lastName: "Outsider",
    });

    const chatRes = await createChatAsUser(
      user1.accessToken,
      user2.profile.publicId,
    );
    const chatId = chatRes.body.publicId;

    const res = await sendMessage(outsider.accessToken, chatId, {
      type: "TEXT",
      text: "Uninvited text",
    });

    expect(res.status).toBe(404);
  });

  it("rejects message creation if user is blocked by recipient", async () => {
    const sender = await getUserWithProfile();
    const blocker = await getUserWithProfile({
      firstName: "Blocker",
      lastName: "User",
    });

    const chatRes = await createChatAsUser(
      sender.accessToken,
      blocker.profile.publicId,
    );
    const chatId = chatRes.body.publicId;

    await prisma.block.create({
      data: {
        blocker: { connect: { publicId: blocker.profile.publicId } },
        blocked: { connect: { publicId: sender.profile.publicId } },
      },
    });

    const res = await sendMessage(sender.accessToken, chatId, {
      type: "TEXT",
      text: "Should fail due to block",
    });

    expect(res.status).toBe(404);
  });
});

describe("POST /chats/:chatId/messages/:messageId (Reply to Message)", () => {
  it("replies to an existing message in the chat", async () => {
    const user1 = await getUserWithProfile();
    const user2 = await getUserWithProfile({
      firstName: "Reply",
      lastName: "Target",
    });

    const chatRes = await createChatAsUser(
      user1.accessToken,
      user2.profile.publicId,
    );
    const chatId = chatRes.body.publicId;

    const initialMessage = await sendMessage(user1.accessToken, chatId, {
      type: "TEXT",
      text: "Original message",
    });

    expect(initialMessage.status).toBe(201);

    const res = await replyToMessage(
      user2.accessToken,
      chatId,
      initialMessage.body.publicId,
      "This is a reply",
    );

    expect(res.status).toBe(201);
    expect(res.body.text).toBe("This is a reply");
    expect(res.body.replyTo.publicId).toBe(initialMessage.body.publicId);
  });
});

describe("DELETE /chats/:chatId/messages/:messageId (Deactivate Message)", () => {
  it("soft-deletes (deactivates) a message owned by the caller", async () => {
    const sender = await getUserWithProfile();
    const recipient = await getUserWithProfile({
      firstName: "Delete",
      lastName: "Tester",
    });

    const chatRes = await createChatAsUser(
      sender.accessToken,
      recipient.profile.publicId,
    );
    const chatId = chatRes.body.publicId;

    const messageRes = await sendMessage(sender.accessToken, chatId, {
      type: "TEXT",
      text: "Message to delete",
    });

    expect(messageRes.status).toBe(201);

    const res = await deleteMessage(
      sender.accessToken,
      chatId,
      messageRes.body.publicId,
    );

    expect(res.status).toBe(204);

    const messageInDb = await prisma.message.findFirst({
      where: { publicId: messageRes.body.publicId },
    });
    expect(messageInDb?.active).toBe(false);
  });

  it("prevents deleting someone else's message", async () => {
    const user1 = await getUserWithProfile();
    const user2 = await getUserWithProfile({
      firstName: "Attacker",
      lastName: "User",
    });

    const chatRes = await createChatAsUser(
      user1.accessToken,
      user2.profile.publicId,
    );
    const chatId = chatRes.body.publicId;

    const messageRes = await sendMessage(user1.accessToken, chatId, {
      type: "TEXT",
      text: "Protected message",
    });

    expect(messageRes.status).toBe(201);
    const messagePublicId = messageRes.body.publicId;

    const res = await deleteMessage(user2.accessToken, chatId, messagePublicId);

    expect(res.status).toBeGreaterThanOrEqual(400);

    const messageInDb = await prisma.message.findFirst({
      where: { publicId: messagePublicId },
    });
    expect(messageInDb?.active).toBe(true);
  });
});
