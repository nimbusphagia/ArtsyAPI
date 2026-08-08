import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/resetDb";
import { getUserWithProfile } from "../helpers/profile";
import { createPostAsUser } from "../helpers/posts";
import { makeUploadStreamImpl } from "../helpers/mockCloudinary";
import { likePost } from "../helpers/postLikes";
import { commentOnPost } from "../helpers/postComments";
import { followProfile } from "../helpers/profileActions";
import { repostPost } from "../helpers/reposts";
import { createCollectionAsUser } from "../helpers/collections";
import { likeCollection } from "../helpers/collectionLikes";
import {
  getNotifications,
  markNotificationRead,
} from "../helpers/notifications";

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

describe("GET /notifications", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await getNotifications("");
    expect(res.status).toBe(401);
  });

  it("returns an empty array when there are no notifications", async () => {
    const { accessToken } = await getUserWithProfile();
    const res = await getNotifications(accessToken);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("creates a LIKE_POST notification for the post author", async () => {
    const author = await getUserWithProfile();
    const liker = await getUserWithProfile({
      firstName: "Liker",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);

    await likePost(liker.accessToken, post.publicId);

    const res = await getNotifications(author.accessToken);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe("LIKE_POST");
    expect(res.body[0].actor.publicId).toBe(liker.profile.publicId);
    expect(res.body[0].postId).toBe(post.publicId);
    expect(res.body[0].read).toBe(false);
  });

  it("creates a COMMENT_POST notification for the post author", async () => {
    const author = await getUserWithProfile();
    const commenter = await getUserWithProfile({
      firstName: "Commenter",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);

    await commentOnPost(commenter.accessToken, post.publicId, "Nice!");

    const res = await getNotifications(author.accessToken);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe("COMMENT_POST");
    expect(res.body[0].commentId).toBeDefined();
  });

  it("creates a SHARE_POST notification for the original author", async () => {
    const author = await getUserWithProfile();
    const reposter = await getUserWithProfile({
      firstName: "Reposter",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);

    await repostPost(reposter.accessToken, post.publicId);

    const res = await getNotifications(author.accessToken);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe("SHARE_POST");
  });

  it("creates a FOLLOW_PROFILE notification for the followed profile", async () => {
    const target = await getUserWithProfile({
      firstName: "Target",
      lastName: "User",
    });
    const follower = await getUserWithProfile({
      firstName: "Follower",
      lastName: "Person",
    });

    await followProfile(follower.accessToken, target.profile.publicId);

    const res = await getNotifications(target.accessToken);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe("FOLLOW_PROFILE");
    expect(res.body[0].actor.publicId).toBe(follower.profile.publicId);
  });

  it("creates a LIKE_COLLECTION notification for the collection owner", async () => {
    const owner = await getUserWithProfile();
    const liker = await getUserWithProfile({
      firstName: "Liker",
      lastName: "Person",
    });
    const post = await createPostAsUser(owner.accessToken);
    const collection = await createCollectionAsUser(owner.accessToken, [
      { publicId: post.publicId, position: 1 },
    ]);

    await likeCollection(liker.accessToken, collection.publicId);

    const res = await getNotifications(owner.accessToken);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe("LIKE_COLLECTION");
    expect(res.body[0].collectionId).toBe(collection.publicId);
  });

  it("does not notify yourself for actions on your own content", async () => {
    const author = await getUserWithProfile();
    const post = await createPostAsUser(author.accessToken);

    await likePost(author.accessToken, post.publicId);

    const res = await getNotifications(author.accessToken);
    expect(res.body).toEqual([]);
  });

  it("fans out a NEW_POST notification to every follower", async () => {
    const author = await getUserWithProfile();
    const followerA = await getUserWithProfile({
      firstName: "Follower",
      lastName: "A",
    });
    const followerB = await getUserWithProfile({
      firstName: "Follower",
      lastName: "B",
    });
    const nonFollower = await getUserWithProfile({
      firstName: "Never",
      lastName: "Followed",
    });

    await followProfile(followerA.accessToken, author.profile.publicId);
    await followProfile(followerB.accessToken, author.profile.publicId);

    await createPostAsUser(author.accessToken);

    const resA = await getNotifications(followerA.accessToken);
    const resB = await getNotifications(followerB.accessToken);
    const resNon = await getNotifications(nonFollower.accessToken);

    expect(resA.body).toHaveLength(1);
    expect(resA.body[0].type).toBe("NEW_POST");
    expect(resB.body).toHaveLength(1);
    expect(resB.body[0].type).toBe("NEW_POST");
    expect(resNon.body).toEqual([]);
  });

  it("fans out a NEW_COLLECTION notification to every follower", async () => {
    const author = await getUserWithProfile();
    const post = await createPostAsUser(author.accessToken);

    const follower = await getUserWithProfile({
      firstName: "Follower",
      lastName: "Person",
    });
    await followProfile(follower.accessToken, author.profile.publicId);

    await createCollectionAsUser(author.accessToken, [
      { publicId: post.publicId, position: 1 },
    ]);

    const res = await getNotifications(follower.accessToken);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe("NEW_COLLECTION");
  });
  it("does not notify the author about their own new post", async () => {
    const author = await getUserWithProfile();
    await createPostAsUser(author.accessToken);

    const res = await getNotifications(author.accessToken);
    expect(res.body).toEqual([]);
  });

  it("returns notifications newest first", async () => {
    const author = await getUserWithProfile();
    const likerA = await getUserWithProfile({
      firstName: "Liker",
      lastName: "A",
    });
    const likerB = await getUserWithProfile({
      firstName: "Liker",
      lastName: "B",
    });
    const post = await createPostAsUser(author.accessToken);

    await likePost(likerA.accessToken, post.publicId);
    await likePost(likerB.accessToken, post.publicId);

    const res = await getNotifications(author.accessToken);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].actor.publicId).toBe(likerB.profile.publicId);
    expect(res.body[1].actor.publicId).toBe(likerA.profile.publicId);
  });

  it("paginates with cursor and limit", async () => {
    const author = await getUserWithProfile();
    const post = await createPostAsUser(author.accessToken);

    for (const name of ["A", "B", "C"]) {
      const liker = await getUserWithProfile({
        firstName: "Liker",
        lastName: name,
      });
      await likePost(liker.accessToken, post.publicId);
    }

    const firstPage = await getNotifications(author.accessToken, { limit: 2 });
    expect(firstPage.status).toBe(200);
    expect(firstPage.body).toHaveLength(2);

    const cursor = firstPage.body[firstPage.body.length - 1].publicId;
    const secondPage = await getNotifications(author.accessToken, {
      limit: 2,
      cursor,
    });

    expect(secondPage.status).toBe(200);
    expect(secondPage.body).toHaveLength(1);

    const allIds = [...firstPage.body, ...secondPage.body].map(
      (n: any) => n.publicId,
    );
    expect(new Set(allIds).size).toBe(3);
  });

  it("rejects a limit above the allowed max", async () => {
    const { accessToken } = await getUserWithProfile();
    const res = await getNotifications(accessToken, { limit: 999 });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /notifications/:notificationId/read", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await markNotificationRead(
      "",
      "018f4a4a-0000-7000-8000-000000000000",
    );
    expect(res.status).toBe(401);
  });

  it("marks a notification as read", async () => {
    const author = await getUserWithProfile();
    const liker = await getUserWithProfile({
      firstName: "Liker",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);
    await likePost(liker.accessToken, post.publicId);

    const list = await getNotifications(author.accessToken);
    const notificationId = list.body[0].publicId;

    const res = await markNotificationRead(author.accessToken, notificationId);
    expect(res.status).toBe(204);

    const updated = await prisma.notification.findUnique({
      where: { publicId: notificationId },
    });
    expect(updated?.read).toBe(true);
  });

  it("returns 404 when marking someone else's notification as read", async () => {
    const author = await getUserWithProfile();
    const liker = await getUserWithProfile({
      firstName: "Liker",
      lastName: "Person",
    });
    const outsider = await getUserWithProfile({
      firstName: "Outsider",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);
    await likePost(liker.accessToken, post.publicId);

    const list = await getNotifications(author.accessToken);
    const notificationId = list.body[0].publicId;

    const res = await markNotificationRead(
      outsider.accessToken,
      notificationId,
    );
    expect(res.status).toBe(404);

    const untouched = await prisma.notification.findUnique({
      where: { publicId: notificationId },
    });
    expect(untouched?.read).toBe(false);
  });

  it("returns 404 for a nonexistent notification", async () => {
    const { accessToken } = await getUserWithProfile();
    const res = await markNotificationRead(
      accessToken,
      "018f4a4a-0000-7000-8000-000000000000",
    );
    expect(res.status).toBe(404);
  });
});
