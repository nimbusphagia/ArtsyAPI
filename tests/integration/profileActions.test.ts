import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/resetDb";
import { getUserWithProfile } from "../helpers/profile";
import {
  followProfile,
  unfollowProfile,
  getFollowers,
  getFollowed,
  blockProfile,
  unblockProfile,
  getBlockedProfiles,
} from "../helpers/profileActions";

beforeEach(async () => {
  await resetDb();
});

describe("POST /profiles/:profileId/follow", () => {
  it("rejects unauthenticated requests", async () => {
    const target = await getUserWithProfile();
    const res = await followProfile("", target.profile.publicId);
    expect(res.status).toBe(401);
  });

  it("follows another profile", async () => {
    const follower = await getUserWithProfile();
    const target = await getUserWithProfile({
      firstName: "Target",
      lastName: "User",
    });

    const res = await followProfile(
      follower.accessToken,
      target.profile.publicId,
    );
    expect(res.status).toBe(201);

    const dbFollow = await prisma.follow.findFirst({
      where: {
        follower: { publicId: follower.profile.publicId },
        following: { publicId: target.profile.publicId },
      },
    });
    expect(dbFollow).not.toBeNull();
  });

  it("rejects following yourself", async () => {
    const user = await getUserWithProfile();
    const res = await followProfile(user.accessToken, user.profile.publicId);
    expect(res.status).toBe(401);
  });

  it("rejects following the same profile twice (unique constraint -> 409)", async () => {
    const follower = await getUserWithProfile();
    const target = await getUserWithProfile({
      firstName: "Target",
      lastName: "User",
    });

    await followProfile(follower.accessToken, target.profile.publicId);
    const res = await followProfile(
      follower.accessToken,
      target.profile.publicId,
    );

    expect(res.status).toBe(409);
  });

  it("returns 404 when the target profile has blocked you", async () => {
    const follower = await getUserWithProfile();
    const target = await getUserWithProfile({
      firstName: "Target",
      lastName: "User",
    });

    await blockProfile(target.accessToken, follower.profile.publicId);

    const res = await followProfile(
      follower.accessToken,
      target.profile.publicId,
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when you have blocked the target profile", async () => {
    const follower = await getUserWithProfile();
    const target = await getUserWithProfile({
      firstName: "Target",
      lastName: "User",
    });

    await blockProfile(follower.accessToken, target.profile.publicId);

    const res = await followProfile(
      follower.accessToken,
      target.profile.publicId,
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 for a nonexistent profile", async () => {
    const { accessToken } = await getUserWithProfile();
    const res = await followProfile(
      accessToken,
      "018f4a4a-0000-7000-8000-000000000000",
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /profiles/:profileId/follow", () => {
  it("unfollows a previously followed profile", async () => {
    const follower = await getUserWithProfile();
    const target = await getUserWithProfile({
      firstName: "Target",
      lastName: "User",
    });

    await followProfile(follower.accessToken, target.profile.publicId);
    const res = await unfollowProfile(
      follower.accessToken,
      target.profile.publicId,
    );

    expect(res.status).toBe(204);

    const dbFollow = await prisma.follow.findFirst({
      where: {
        follower: { publicId: follower.profile.publicId },
        following: { publicId: target.profile.publicId },
      },
    });
    expect(dbFollow).toBeNull();
  });

  it("returns 404 when unfollowing a profile you don't follow", async () => {
    const user = await getUserWithProfile();
    const target = await getUserWithProfile({
      firstName: "Target",
      lastName: "User",
    });

    const res = await unfollowProfile(
      user.accessToken,
      target.profile.publicId,
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when trying to unfollow a target profile that has blocked you", async () => {
    const follower = await getUserWithProfile();
    const target = await getUserWithProfile({
      firstName: "Target",
      lastName: "User",
    });

    await followProfile(follower.accessToken, target.profile.publicId);
    await blockProfile(target.accessToken, follower.profile.publicId);

    const res = await unfollowProfile(
      follower.accessToken,
      target.profile.publicId,
    );

    expect(res.status).toBe(404);
  });
});

describe("GET /profiles/:profileId/followers and /followed", () => {
  it("lists a profile's followers", async () => {
    const target = await getUserWithProfile({
      firstName: "Target",
      lastName: "User",
    });
    const follower = await getUserWithProfile({
      firstName: "Follower",
      lastName: "Person",
    });

    await followProfile(follower.accessToken, target.profile.publicId);

    const res = await getFollowers(target.accessToken, target.profile.publicId);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].publicId).toBe(follower.profile.publicId);
  });

  it("lists profiles a user follows", async () => {
    const target = await getUserWithProfile({
      firstName: "Target",
      lastName: "User",
    });
    const follower = await getUserWithProfile({
      firstName: "Follower",
      lastName: "Person",
    });

    await followProfile(follower.accessToken, target.profile.publicId);

    const res = await getFollowed(
      follower.accessToken,
      follower.profile.publicId,
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].publicId).toBe(target.profile.publicId);
  });

  it("returns 404 for followers of a profile that has blocked you", async () => {
    const target = await getUserWithProfile({
      firstName: "Target",
      lastName: "User",
    });
    const viewer = await getUserWithProfile({
      firstName: "Viewer",
      lastName: "Person",
    });

    await blockProfile(target.accessToken, viewer.profile.publicId);

    const res = await getFollowers(viewer.accessToken, target.profile.publicId);
    expect(res.status).toBe(404);
  });
});

describe("POST /profiles/:profileId/block", () => {
  it("rejects unauthenticated requests", async () => {
    const target = await getUserWithProfile();
    const res = await blockProfile("", target.profile.publicId);
    expect(res.status).toBe(401);
  });

  it("blocks another profile", async () => {
    const blocker = await getUserWithProfile();
    const target = await getUserWithProfile({
      firstName: "Target",
      lastName: "User",
    });

    const res = await blockProfile(
      blocker.accessToken,
      target.profile.publicId,
    );
    expect(res.status).toBe(200);

    const dbBlock = await prisma.block.findFirst({
      where: {
        blocker: { publicId: blocker.profile.publicId },
        blocked: { publicId: target.profile.publicId },
      },
    });
    expect(dbBlock).not.toBeNull();
  });

  it("rejects blocking yourself", async () => {
    const user = await getUserWithProfile();
    const res = await blockProfile(user.accessToken, user.profile.publicId);
    expect(res.status).toBe(401);
  });

  it("rejects blocking the same profile twice (unique constraint -> 409)", async () => {
    const blocker = await getUserWithProfile();
    const target = await getUserWithProfile({
      firstName: "Target",
      lastName: "User",
    });

    await blockProfile(blocker.accessToken, target.profile.publicId);
    const res = await blockProfile(
      blocker.accessToken,
      target.profile.publicId,
    );

    expect(res.status).toBe(409);
  });

  it("removes an existing one-directional follow (blocker was following target) when blocking", async () => {
    const blocker = await getUserWithProfile();
    const target = await getUserWithProfile({
      firstName: "Target",
      lastName: "User",
    });

    await followProfile(blocker.accessToken, target.profile.publicId);
    const res = await blockProfile(
      blocker.accessToken,
      target.profile.publicId,
    );
    expect(res.status).toBe(200);

    const dbFollow = await prisma.follow.findFirst({
      where: {
        follower: { publicId: blocker.profile.publicId },
        following: { publicId: target.profile.publicId },
      },
    });
    expect(dbFollow).toBeNull();
  });

  it("removes an existing one-directional follow (target was following blocker) when blocking", async () => {
    const blocker = await getUserWithProfile();
    const target = await getUserWithProfile({
      firstName: "Target",
      lastName: "User",
    });

    await followProfile(target.accessToken, blocker.profile.publicId);
    const res = await blockProfile(
      blocker.accessToken,
      target.profile.publicId,
    );
    expect(res.status).toBe(200);

    const dbFollow = await prisma.follow.findFirst({
      where: {
        follower: { publicId: target.profile.publicId },
        following: { publicId: blocker.profile.publicId },
      },
    });
    expect(dbFollow).toBeNull();
  });

  it("removes mutual follows in both directions when blocking", async () => {
    const blocker = await getUserWithProfile();
    const target = await getUserWithProfile({
      firstName: "Target",
      lastName: "User",
    });

    await followProfile(blocker.accessToken, target.profile.publicId);
    await followProfile(target.accessToken, blocker.profile.publicId);

    const res = await blockProfile(
      blocker.accessToken,
      target.profile.publicId,
    );
    expect(res.status).toBe(200);

    const remainingFollows = await prisma.follow.findMany({
      where: {
        OR: [
          {
            follower: { publicId: blocker.profile.publicId },
            following: { publicId: target.profile.publicId },
          },
          {
            follower: { publicId: target.profile.publicId },
            following: { publicId: blocker.profile.publicId },
          },
        ],
      },
    });
    expect(remainingFollows).toHaveLength(0);
  });

  it("succeeds with no side effects when neither profile follows the other", async () => {
    const blocker = await getUserWithProfile();
    const target = await getUserWithProfile({
      firstName: "Target",
      lastName: "User",
    });

    const res = await blockProfile(
      blocker.accessToken,
      target.profile.publicId,
    );
    expect(res.status).toBe(200);
  });

  it("returns 404 when the target has already blocked you", async () => {
    const userA = await getUserWithProfile();
    const userB = await getUserWithProfile({
      firstName: "User",
      lastName: "B",
    });

    await blockProfile(userB.accessToken, userA.profile.publicId);

    const res = await blockProfile(userA.accessToken, userB.profile.publicId);
    expect(res.status).toBe(404);
  });
});

describe("DELETE /profiles/:profileId/block", () => {
  it("unblocks a previously blocked profile", async () => {
    const blocker = await getUserWithProfile();
    const target = await getUserWithProfile({
      firstName: "Target",
      lastName: "User",
    });

    await blockProfile(blocker.accessToken, target.profile.publicId);
    const res = await unblockProfile(
      blocker.accessToken,
      target.profile.publicId,
    );

    expect(res.status).toBe(200);

    const dbBlock = await prisma.block.findFirst({
      where: {
        blocker: { publicId: blocker.profile.publicId },
        blocked: { publicId: target.profile.publicId },
      },
    });
    expect(dbBlock).toBeNull();
  });

  it("returns 404 when unblocking a profile you never blocked", async () => {
    const user = await getUserWithProfile();
    const target = await getUserWithProfile({
      firstName: "Target",
      lastName: "User",
    });

    const res = await unblockProfile(user.accessToken, target.profile.publicId);
    expect(res.status).toBe(404);
  });

  it("does not restore a follow relationship that existed before the block", async () => {
    const blocker = await getUserWithProfile();
    const target = await getUserWithProfile({
      firstName: "Target",
      lastName: "User",
    });

    await followProfile(blocker.accessToken, target.profile.publicId);
    await blockProfile(blocker.accessToken, target.profile.publicId);
    await unblockProfile(blocker.accessToken, target.profile.publicId);

    const dbFollow = await prisma.follow.findFirst({
      where: {
        follower: { publicId: blocker.profile.publicId },
        following: { publicId: target.profile.publicId },
      },
    });
    expect(dbFollow).toBeNull();
  });
});

describe("GET /profiles/blocked", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await getBlockedProfiles("");
    expect(res.status).toBe(401);
  });

  it("lists profiles the current user has blocked", async () => {
    const blocker = await getUserWithProfile();
    const target = await getUserWithProfile({
      firstName: "Target",
      lastName: "User",
    });

    await blockProfile(blocker.accessToken, target.profile.publicId);

    const res = await getBlockedProfiles(blocker.accessToken);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].publicId).toBe(target.profile.publicId);
  });

  it("returns an empty array when nothing is blocked", async () => {
    const { accessToken } = await getUserWithProfile();
    const res = await getBlockedProfiles(accessToken);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
