import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { Socket } from "socket.io-client";
import { resetDb } from "../helpers/resetDb";
import { getUserWithProfile } from "../helpers/profile";
import { createChatAsUser } from "../helpers/chats";
import {
  sendMessage,
  replyToMessage,
  deleteMessage,
} from "../helpers/chatMessages";
import { makeUploadStreamImpl } from "../helpers/mockCloudinary";
import { startTestServer, stopTestServer } from "../helpers/socketTestServer";
import { connectSocket, waitForEvent } from "../helpers/socketClient";

const { uploadStreamMock } = vi.hoisted(() => ({ uploadStreamMock: vi.fn() }));

vi.mock("../../src/config/cloudinary", () => ({
  default: {
    uploader: { upload_stream: uploadStreamMock, upload_large_stream: vi.fn() },
    url: vi.fn(() => "https://example.com/thumb.jpg"),
  },
}));

let port: number;
const openSockets: Socket[] = [];

beforeAll(async () => {
  ({ port } = await startTestServer());
});

afterAll(async () => {
  await stopTestServer();
});

beforeEach(async () => {
  await resetDb();
  uploadStreamMock.mockReset();
  uploadStreamMock.mockImplementation(makeUploadStreamImpl());
});

afterEach(() => {
  for (const socket of openSockets) {
    if (socket.connected) socket.disconnect();
  }
  openSockets.length = 0;
});

async function connect(accessToken: string): Promise<Socket> {
  const socket = await connectSocket(port, accessToken);
  openSockets.push(socket);
  return socket;
}

describe("chat sockets", () => {
  it("delivers message:new to both members of an existing chat (eager room join)", async () => {
    const user1 = await getUserWithProfile();
    const user2 = await getUserWithProfile({
      firstName: "User",
      lastName: "Two",
    });

    const chatRes = await createChatAsUser(
      user1.accessToken,
      user2.profile.publicId,
    );
    const chatId = chatRes.body.publicId;

    const socket1 = await connect(user1.accessToken);
    const socket2 = await connect(user2.accessToken);

    const event1 = waitForEvent(socket1, "message:new");
    const event2 = waitForEvent(socket2, "message:new");

    await sendMessage(user1.accessToken, chatId, {
      type: "TEXT",
      text: "Hello there",
    });

    const [payload1, payload2] = await Promise.all([event1, event2]);
    expect(payload1.text).toBe("Hello there");
    expect(payload2.text).toBe("Hello there");
  });

  it("delivers message:new for a chat created after both sockets already connected", async () => {
    const user1 = await getUserWithProfile();
    const user2 = await getUserWithProfile({
      firstName: "User",
      lastName: "Two",
    });

    const socket1 = await connect(user1.accessToken);
    const socket2 = await connect(user2.accessToken);

    const chatNewEvent = waitForEvent(socket2, "chat:new");
    const chatRes = await createChatAsUser(
      user1.accessToken,
      user2.profile.publicId,
    );
    const chatId = chatRes.body.publicId;

    const chatNewPayload = await chatNewEvent;
    expect(chatNewPayload.publicId).toBe(chatId);

    const event1 = waitForEvent(socket1, "message:new");
    const event2 = waitForEvent(socket2, "message:new");

    await sendMessage(user1.accessToken, chatId, {
      type: "TEXT",
      text: "First message",
    });

    const [payload1, payload2] = await Promise.all([event1, event2]);
    expect(payload1.text).toBe("First message");
    expect(payload2.text).toBe("First message");
  });

  it("does not deliver message:new to an uninvolved third party", async () => {
    const user1 = await getUserWithProfile();
    const user2 = await getUserWithProfile({
      firstName: "User",
      lastName: "Two",
    });
    const outsider = await getUserWithProfile({
      firstName: "Third",
      lastName: "Party",
    });

    const chatRes = await createChatAsUser(
      user1.accessToken,
      user2.profile.publicId,
    );
    const chatId = chatRes.body.publicId;

    const outsiderSocket = await connect(outsider.accessToken);

    let received = false;
    outsiderSocket.once("message:new", () => {
      received = true;
    });

    await sendMessage(user1.accessToken, chatId, {
      type: "TEXT",
      text: "Private conversation",
    });

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(received).toBe(false);
  });

  it("delivers message:new for a reply", async () => {
    const user1 = await getUserWithProfile();
    const user2 = await getUserWithProfile({
      firstName: "User",
      lastName: "Two",
    });

    const chatRes = await createChatAsUser(
      user1.accessToken,
      user2.profile.publicId,
    );
    const chatId = chatRes.body.publicId;

    const socket1 = await connect(user1.accessToken);
    const socket2 = await connect(user2.accessToken);

    const original = await sendMessage(user1.accessToken, chatId, {
      type: "TEXT",
      text: "Original",
    });

    const event1 = waitForEvent(socket1, "message:new");
    const event2 = waitForEvent(socket2, "message:new");

    await replyToMessage(
      user2.accessToken,
      chatId,
      original.body.publicId,
      "A reply",
    );

    const [payload1, payload2] = await Promise.all([event1, event2]);
    expect(payload1.text).toBe("A reply");
    expect(payload1.replyTo.publicId).toBe(original.body.publicId);
    expect(payload2.text).toBe("A reply");
  });

  it("delivers message:delete:lite with the messageId when a message is deleted", async () => {
    const user1 = await getUserWithProfile();
    const user2 = await getUserWithProfile({
      firstName: "User",
      lastName: "Two",
    });

    const chatRes = await createChatAsUser(
      user1.accessToken,
      user2.profile.publicId,
    );
    const chatId = chatRes.body.publicId;

    const socket1 = await connect(user1.accessToken);
    const socket2 = await connect(user2.accessToken);

    const messageRes = await sendMessage(user1.accessToken, chatId, {
      type: "TEXT",
      text: "To be deleted",
    });

    const event1 = waitForEvent(socket1, "message:delete:lite");
    const event2 = waitForEvent(socket2, "message:delete:lite");

    await deleteMessage(user1.accessToken, chatId, messageRes.body.publicId);

    const [payload1, payload2] = await Promise.all([event1, event2]);
    expect(payload1.messageId).toBe(messageRes.body.publicId);
    expect(payload1.chatId).toBe(chatId);
    expect(payload2.messageId).toBe(messageRes.body.publicId);
  });
});
