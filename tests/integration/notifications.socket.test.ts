import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { Socket } from "socket.io-client";
import { resetDb } from "../helpers/resetDb";
import { getUserWithProfile } from "../helpers/profile";
import { createPostAsUser } from "../helpers/posts";
import { likePost } from "../helpers/postLikes";
import { followProfile } from "../helpers/profileActions";
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

describe("notification sockets", () => {
  it("rejects a socket connection with no token", async () => {
    await expect(connectSocket(port, "")).rejects.toBeTruthy();
  });

  it("rejects a socket connection with an invalid token", async () => {
    await expect(connectSocket(port, "not-a-real-token")).rejects.toBeTruthy();
  });

  it("emits notification:new to the recipient when their post is liked", async () => {
    const author = await getUserWithProfile();
    const liker = await getUserWithProfile({ firstName: "Liker", lastName: "Person" });
    const post = await createPostAsUser(author.accessToken);

    const authorSocket = await connect(author.accessToken);
    const eventPromise = waitForEvent(authorSocket, "notification:new");

    await likePost(liker.accessToken, post.publicId);

    const payload = await eventPromise;
    expect(payload.type).toBe("LIKE_POST");
    expect(payload.actor.publicId).toBe(liker.profile.publicId);
    expect(payload.postId).toBe(post.publicId);
  });

  it("emits notification:new to the followed profile on FOLLOW", async () => {
    const target = await getUserWithProfile({ firstName: "Target", lastName: "User" });
    const follower = await getUserWithProfile({ firstName: "Follower", lastName: "Person" });

    const targetSocket = await connect(target.accessToken);
    const eventPromise = waitForEvent(targetSocket, "notification:new");

    await followProfile(follower.accessToken, target.profile.publicId);

    const payload = await eventPromise;
    expect(payload.type).toBe("FOLLOW");
    expect(payload.actor.publicId).toBe(follower.profile.publicId);
  });

  it("does not emit to the actor's own socket for their own action", async () => {
    const author = await getUserWithProfile();
    const post = await createPostAsUser(author.accessToken);

    const authorSocket = await connect(author.accessToken);

    let received = false;
    authorSocket.once("notification:new", () => {
      received = true;
    });

    await likePost(author.accessToken, post.publicId);

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(received).toBe(false);
  });

  it("does not emit to an unrelated, uninvolved socket", async () => {
    const author = await getUserWithProfile();
    const liker = await getUserWithProfile({ firstName: "Liker", lastName: "Person" });
    const bystander = await getUserWithProfile({ firstName: "By", lastName: "Stander" });
    const post = await createPostAsUser(author.accessToken);

    const bystanderSocket = await connect(bystander.accessToken);

    let received = false;
    bystanderSocket.once("notification:new", () => {
      received = true;
    });

    await likePost(liker.accessToken, post.publicId);

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(received).toBe(false);
  });

  it("emits notification:new:lite to every follower on a new post (fan-out)", async () => {
    const author = await getUserWithProfile();
    const followerA = await getUserWithProfile({ firstName: "Follower", lastName: "A" });
    const followerB = await getUserWithProfile({ firstName: "Follower", lastName: "B" });

    await followProfile(followerA.accessToken, author.profile.publicId);
    await followProfile(followerB.accessToken, author.profile.publicId);

    const socketA = await connect(followerA.accessToken);
    const socketB = await connect(followerB.accessToken);

    const eventA = waitForEvent(socketA, "notification:new:lite");
    const eventB = waitForEvent(socketB, "notification:new:lite");

    await createPostAsUser(author.accessToken);

    const [payloadA, payloadB] = await Promise.all([eventA, eventB]);
    expect(payloadA.type).toBe("NEW_POST");
    expect(payloadB.type).toBe("NEW_POST");
  });

  it("does not emit a fan-out notification to a non-follower", async () => {
    const author = await getUserWithProfile();
    const nonFollower = await getUserWithProfile({ firstName: "Never", lastName: "Followed" });

    const socket = await connect(nonFollower.accessToken);

    let received = false;
    socket.once("notification:new:lite", () => {
      received = true;
    });

    await createPostAsUser(author.accessToken);

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(received).toBe(false);
  });
});
