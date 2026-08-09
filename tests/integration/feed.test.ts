import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "../../src/config/prisma";
import { resetDb } from "../helpers/resetDb";
import { getUserWithProfile } from "../helpers/profile";
import { createPostAsUser } from "../helpers/posts";
import { createCollectionAsUser } from "../helpers/collections";
import { followProfile, blockProfile } from "../helpers/profileActions";
import { repostPost } from "../helpers/reposts";
import { likePost } from "../helpers/postLikes";
import { likeCollection } from "../helpers/collectionLikes";
import { makeUploadStreamImpl } from "../helpers/mockCloudinary";
import { getHomeFeed, getExploreFeed } from "../helpers/feed";

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

describe("GET /feed/home", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await getHomeFeed("");
    expect(res.status).toBe(401);
  });

  it("returns an empty array when following nobody", async () => {
    const { accessToken } = await getUserWithProfile();
    const res = await getHomeFeed(accessToken);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("includes a post from someone you follow", async () => {
    const viewer = await getUserWithProfile();
    const author = await getUserWithProfile({
      firstName: "Author",
      lastName: "Person",
    });
    await followProfile(viewer.accessToken, author.profile.publicId);
    const post = await createPostAsUser(author.accessToken);

    const res = await getHomeFeed(viewer.accessToken);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe("POST");
    expect(res.body[0].post.publicId).toBe(post.publicId);
  });

  it("includes a repost from someone you follow", async () => {
    const viewer = await getUserWithProfile();
    const author = await getUserWithProfile({
      firstName: "Author",
      lastName: "Person",
    });
    const reposter = await getUserWithProfile({
      firstName: "Reposter",
      lastName: "Person",
    });
    await followProfile(viewer.accessToken, reposter.profile.publicId);

    const post = await createPostAsUser(author.accessToken);
    await repostPost(reposter.accessToken, post.publicId);

    const res = await getHomeFeed(viewer.accessToken);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe("REPOST");
    expect(res.body[0].reposter.publicId).toBe(reposter.profile.publicId);
    expect(res.body[0].post.publicId).toBe(post.publicId);
  });

  it("includes both a post and the collection it belongs to, from someone you follow", async () => {
    const viewer = await getUserWithProfile();
    const author = await getUserWithProfile({
      firstName: "Author",
      lastName: "Person",
    });
    await followProfile(viewer.accessToken, author.profile.publicId);

    const post = await createPostAsUser(author.accessToken);
    const collection = await createCollectionAsUser(author.accessToken, [
      { publicId: post.publicId, position: 1 },
    ]);

    const res = await getHomeFeed(viewer.accessToken);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);

    const postItem = res.body.find((i: any) => i.type === "POST");
    const collectionItem = res.body.find((i: any) => i.type === "COLLECTION");
    expect(postItem.post.publicId).toBe(post.publicId);
    expect(collectionItem.collection.publicId).toBe(collection.publicId);
  });

  it("merges posts, reposts, and collections in chronological order", async () => {
    const viewer = await getUserWithProfile();
    const author = await getUserWithProfile({
      firstName: "Author",
      lastName: "Person",
    });
    await followProfile(viewer.accessToken, author.profile.publicId);

    const post1 = await createPostAsUser(author.accessToken);
    const collection = await createCollectionAsUser(author.accessToken, [
      { publicId: post1.publicId, position: 1 },
    ]);
    const post2 = await createPostAsUser(author.accessToken);

    const res = await getHomeFeed(viewer.accessToken);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);

    // newest first: post2, collection, post1
    expect(res.body[0].type).toBe("POST");
    expect(res.body[0].post.publicId).toBe(post2.publicId);
    expect(res.body[1].type).toBe("COLLECTION");
    expect(res.body[2].type).toBe("POST");
    expect(res.body[2].post.publicId).toBe(post1.publicId);
  });

  it("excludes a private post from someone you follow", async () => {
    const viewer = await getUserWithProfile();
    const author = await getUserWithProfile({
      firstName: "Author",
      lastName: "Person",
    });
    await followProfile(viewer.accessToken, author.profile.publicId);

    const post = await createPostAsUser(author.accessToken);
    await prisma.post.update({
      where: { publicId: post.publicId },
      data: { private: true },
    });

    const res = await getHomeFeed(viewer.accessToken);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("excludes a private collection from someone you follow", async () => {
    const viewer = await getUserWithProfile();
    const author = await getUserWithProfile({
      firstName: "Author",
      lastName: "Person",
    });
    await followProfile(viewer.accessToken, author.profile.publicId);

    const post = await createPostAsUser(author.accessToken);
    const collection = await createCollectionAsUser(author.accessToken, [
      { publicId: post.publicId, position: 1 },
    ]);
    await prisma.collection.update({
      where: { publicId: collection.publicId },
      data: { private: true },
    });

    const res = await getHomeFeed(viewer.accessToken);
    expect(res.status).toBe(200);
    // the underlying post is still public and still shows standalone
    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe("POST");
    expect(res.body.some((i: any) => i.type === "COLLECTION")).toBe(false);
  });

  it("excludes a repost of a private post", async () => {
    const viewer = await getUserWithProfile();
    const author = await getUserWithProfile({
      firstName: "Author",
      lastName: "Person",
    });
    const reposter = await getUserWithProfile({
      firstName: "Reposter",
      lastName: "Person",
    });
    await followProfile(viewer.accessToken, reposter.profile.publicId);

    const post = await createPostAsUser(author.accessToken);
    await prisma.post.update({
      where: { publicId: post.publicId },
      data: { private: true },
    });
    await repostPost(reposter.accessToken, post.publicId);

    const res = await getHomeFeed(viewer.accessToken);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("excludes content from a followed profile that has blocked you", async () => {
    const viewer = await getUserWithProfile();
    const author = await getUserWithProfile({
      firstName: "Author",
      lastName: "Person",
    });
    await followProfile(viewer.accessToken, author.profile.publicId);
    await createPostAsUser(author.accessToken);

    await blockProfile(author.accessToken, viewer.profile.publicId);

    const res = await getHomeFeed(viewer.accessToken);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("excludes a collection from a followed profile that has blocked you", async () => {
    const viewer = await getUserWithProfile();
    const author = await getUserWithProfile({
      firstName: "Author",
      lastName: "Person",
    });
    await followProfile(viewer.accessToken, author.profile.publicId);

    const post = await createPostAsUser(author.accessToken);
    await createCollectionAsUser(author.accessToken, [
      { publicId: post.publicId, position: 1 },
    ]);

    await blockProfile(author.accessToken, viewer.profile.publicId);

    const res = await getHomeFeed(viewer.accessToken);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("does not include a post from someone you don't follow", async () => {
    const viewer = await getUserWithProfile();
    const author = await getUserWithProfile({
      firstName: "Author",
      lastName: "Person",
    });
    await createPostAsUser(author.accessToken);

    const res = await getHomeFeed(viewer.accessToken);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("paginates using the before cursor", async () => {
    const viewer = await getUserWithProfile();
    const author = await getUserWithProfile({
      firstName: "Author",
      lastName: "Person",
    });
    await followProfile(viewer.accessToken, author.profile.publicId);

    const post1 = await createPostAsUser(author.accessToken);
    const post2 = await createPostAsUser(author.accessToken);
    const post3 = await createPostAsUser(author.accessToken);

    const firstPage = await getHomeFeed(viewer.accessToken, { limit: 2 });
    expect(firstPage.body).toHaveLength(2);
    expect(firstPage.body[0].post.publicId).toBe(post3.publicId);
    expect(firstPage.body[1].post.publicId).toBe(post2.publicId);

    const cursor = firstPage.body[firstPage.body.length - 1].createdAt;
    const secondPage = await getHomeFeed(viewer.accessToken, {
      before: cursor,
      limit: 2,
    });

    expect(secondPage.body.length).toBeGreaterThanOrEqual(1);
    expect(secondPage.body[0].post.publicId).toBe(post1.publicId);
  });

  it("truncates the merged feed to the requested limit, newest first, across mixed types", async () => {
    const viewer = await getUserWithProfile();
    const author = await getUserWithProfile({
      firstName: "Author",
      lastName: "Person",
    });
    await followProfile(viewer.accessToken, author.profile.publicId);

    const post1 = await createPostAsUser(author.accessToken);
    const collection = await createCollectionAsUser(author.accessToken, [
      { publicId: post1.publicId, position: 1 },
    ]);
    const post2 = await createPostAsUser(author.accessToken);
    const post3 = await createPostAsUser(author.accessToken);

    const res = await getHomeFeed(viewer.accessToken, { limit: 2 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].post.publicId).toBe(post3.publicId);
    expect(res.body[1].post.publicId).toBe(post2.publicId);
  });
});

describe("GET /feed/explore", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await getExploreFeed("");
    expect(res.status).toBe(401);
  });

  it("falls back to recent public posts and collections when following nobody", async () => {
    const viewer = await getUserWithProfile();
    const author = await getUserWithProfile({
      firstName: "Author",
      lastName: "Person",
    });
    const post = await createPostAsUser(author.accessToken);
    await createCollectionAsUser(author.accessToken, [
      { publicId: post.publicId, position: 1 },
    ]);

    const res = await getExploreFeed(viewer.accessToken);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((item: any) => item.convergence === 0)).toBe(true);
  });

  it("falls back to recent public content when follows exist but have no likes", async () => {
    const viewer = await getUserWithProfile();
    const followed = await getUserWithProfile({
      firstName: "Followed",
      lastName: "Person",
    });
    const stranger = await getUserWithProfile({
      firstName: "Stranger",
      lastName: "Person",
    });
    await followProfile(viewer.accessToken, followed.profile.publicId);
    await createPostAsUser(stranger.accessToken);

    const res = await getExploreFeed(viewer.accessToken);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].convergence).toBe(0);
  });

  it("excludes a post authored by a followed profile from the fallback, even when other liked content forces the ranked branch", async () => {
    const viewer = await getUserWithProfile();
    const followedNoLikes = await getUserWithProfile({
      firstName: "Followed",
      lastName: "NoLikes",
    });
    const followedLiker = await getUserWithProfile({
      firstName: "Followed",
      lastName: "Liker",
    });
    const stranger = await getUserWithProfile({
      firstName: "Stranger",
      lastName: "Person",
    });
    await followProfile(viewer.accessToken, followedNoLikes.profile.publicId);
    await followProfile(viewer.accessToken, followedLiker.profile.publicId);

    // this post has zero likes, so it can only ever surface via the fallback path
    const unlikedFollowedPost = await createPostAsUser(
      followedNoLikes.accessToken,
    );
    // this gives likedPosts.length > 0, forcing the ranked branch to run instead of full fallback
    const strangerPost = await createPostAsUser(stranger.accessToken);
    await likePost(followedLiker.accessToken, strangerPost.publicId);

    const res = await getExploreFeed(viewer.accessToken);
    expect(res.status).toBe(200);
    const item = res.body.find(
      (i: any) => i.post?.publicId === unlikedFollowedPost.publicId,
    );
    expect(item).toBeUndefined();
  });

  it("ranks a post higher when more followed profiles liked it", async () => {
    const viewer = await getUserWithProfile();
    const author = await getUserWithProfile({
      firstName: "Author",
      lastName: "Person",
    });
    const followedA = await getUserWithProfile({
      firstName: "Followed",
      lastName: "A",
    });
    const followedB = await getUserWithProfile({
      firstName: "Followed",
      lastName: "B",
    });
    await followProfile(viewer.accessToken, followedA.profile.publicId);
    await followProfile(viewer.accessToken, followedB.profile.publicId);

    const popularPost = await createPostAsUser(author.accessToken);
    const lessPopularPost = await createPostAsUser(author.accessToken);

    await likePost(followedA.accessToken, popularPost.publicId);
    await likePost(followedB.accessToken, popularPost.publicId);
    await likePost(followedA.accessToken, lessPopularPost.publicId);

    const res = await getExploreFeed(viewer.accessToken);
    expect(res.status).toBe(200);

    const popularItem = res.body.find(
      (i: any) => i.post?.publicId === popularPost.publicId,
    );
    const lessPopularItem = res.body.find(
      (i: any) => i.post?.publicId === lessPopularPost.publicId,
    );

    expect(popularItem.convergence).toBe(2);
    expect(lessPopularItem.convergence).toBe(1);
    expect(res.body.indexOf(popularItem)).toBeLessThan(
      res.body.indexOf(lessPopularItem),
    );
  });

  it("ranks a collection higher when more followed profiles liked it", async () => {
    const viewer = await getUserWithProfile();
    const author = await getUserWithProfile({
      firstName: "Author",
      lastName: "Person",
    });
    const followedA = await getUserWithProfile({
      firstName: "Followed",
      lastName: "A",
    });
    const followedB = await getUserWithProfile({
      firstName: "Followed",
      lastName: "B",
    });
    await followProfile(viewer.accessToken, followedA.profile.publicId);
    await followProfile(viewer.accessToken, followedB.profile.publicId);

    const post1 = await createPostAsUser(author.accessToken);
    const post2 = await createPostAsUser(author.accessToken);
    const popularCollection = await createCollectionAsUser(author.accessToken, [
      { publicId: post1.publicId, position: 1 },
    ]);
    const lessPopularCollection = await createCollectionAsUser(
      author.accessToken,
      [{ publicId: post2.publicId, position: 1 }],
    );

    await likeCollection(followedA.accessToken, popularCollection.publicId);
    await likeCollection(followedB.accessToken, popularCollection.publicId);
    await likeCollection(followedA.accessToken, lessPopularCollection.publicId);

    const res = await getExploreFeed(viewer.accessToken);
    expect(res.status).toBe(200);

    const popularItem = res.body.find(
      (i: any) => i.collection?.publicId === popularCollection.publicId,
    );
    const lessPopularItem = res.body.find(
      (i: any) => i.collection?.publicId === lessPopularCollection.publicId,
    );

    expect(popularItem.convergence).toBe(2);
    expect(lessPopularItem.convergence).toBe(1);
    expect(res.body.indexOf(popularItem)).toBeLessThan(
      res.body.indexOf(lessPopularItem),
    );
  });

  it("includes a collection liked by a followed profile", async () => {
    const viewer = await getUserWithProfile();
    const author = await getUserWithProfile({
      firstName: "Author",
      lastName: "Person",
    });
    const followed = await getUserWithProfile({
      firstName: "Followed",
      lastName: "Person",
    });
    await followProfile(viewer.accessToken, followed.profile.publicId);

    const post = await createPostAsUser(author.accessToken);
    const collection = await createCollectionAsUser(author.accessToken, [
      { publicId: post.publicId, position: 1 },
    ]);
    await likeCollection(followed.accessToken, collection.publicId);

    const res = await getExploreFeed(viewer.accessToken);
    expect(res.status).toBe(200);
    const item = res.body.find(
      (i: any) => i.collection?.publicId === collection.publicId,
    );
    expect(item).toBeDefined();
    expect(item.type).toBe("COLLECTION");
    expect(item.convergence).toBe(1);
  });

  it("excludes a post authored by someone you already follow", async () => {
    const viewer = await getUserWithProfile();
    const author = await getUserWithProfile({
      firstName: "Author",
      lastName: "Person",
    });
    const followed = await getUserWithProfile({
      firstName: "Followed",
      lastName: "Person",
    });
    await followProfile(viewer.accessToken, author.profile.publicId);
    await followProfile(viewer.accessToken, followed.profile.publicId);

    const post = await createPostAsUser(author.accessToken);
    await likePost(followed.accessToken, post.publicId);

    const res = await getExploreFeed(viewer.accessToken);
    expect(res.status).toBe(200);
    const item = res.body.find((i: any) => i.post?.publicId === post.publicId);
    expect(item).toBeUndefined();
  });

  it("does not count the author's own like toward convergence", async () => {
    const viewer = await getUserWithProfile();
    const author = await getUserWithProfile({
      firstName: "Author",
      lastName: "Person",
    });
    const followedA = await getUserWithProfile({
      firstName: "Followed",
      lastName: "A",
    });
    await followProfile(viewer.accessToken, followedA.profile.publicId);

    const post = await createPostAsUser(author.accessToken);
    await likePost(author.accessToken, post.publicId);
    await likePost(followedA.accessToken, post.publicId);

    const res = await getExploreFeed(viewer.accessToken);
    expect(res.status).toBe(200);
    const item = res.body.find((i: any) => i.post?.publicId === post.publicId);
    expect(item).toBeDefined();
    expect(item.convergence).toBe(1);
  });

  it("excludes a private post from Explore even if liked by a followed profile", async () => {
    const viewer = await getUserWithProfile();
    const author = await getUserWithProfile({
      firstName: "Author",
      lastName: "Person",
    });
    const followed = await getUserWithProfile({
      firstName: "Followed",
      lastName: "Person",
    });
    await followProfile(viewer.accessToken, followed.profile.publicId);

    const post = await createPostAsUser(author.accessToken);
    await likePost(followed.accessToken, post.publicId);
    await prisma.post.update({
      where: { publicId: post.publicId },
      data: { private: true },
    });

    const res = await getExploreFeed(viewer.accessToken);
    const item = res.body.find((i: any) => i.post?.publicId === post.publicId);
    expect(item).toBeUndefined();
  });

  it("excludes a private collection from Explore even if liked by a followed profile", async () => {
    const viewer = await getUserWithProfile();
    const author = await getUserWithProfile({
      firstName: "Author",
      lastName: "Person",
    });
    const followed = await getUserWithProfile({
      firstName: "Followed",
      lastName: "Person",
    });
    await followProfile(viewer.accessToken, followed.profile.publicId);

    const post = await createPostAsUser(author.accessToken);
    const collection = await createCollectionAsUser(author.accessToken, [
      { publicId: post.publicId, position: 1 },
    ]);
    await likeCollection(followed.accessToken, collection.publicId);
    await prisma.collection.update({
      where: { publicId: collection.publicId },
      data: { private: true },
    });

    const res = await getExploreFeed(viewer.accessToken);
    const item = res.body.find(
      (i: any) => i.collection?.publicId === collection.publicId,
    );
    expect(item).toBeUndefined();
  });

  it("excludes a post entirely if its author has blocked you", async () => {
    const viewer = await getUserWithProfile();
    const author = await getUserWithProfile({
      firstName: "Author",
      lastName: "Person",
    });
    const followed = await getUserWithProfile({
      firstName: "Followed",
      lastName: "Person",
    });
    await followProfile(viewer.accessToken, followed.profile.publicId);

    const post = await createPostAsUser(author.accessToken);
    await likePost(followed.accessToken, post.publicId);
    await blockProfile(author.accessToken, viewer.profile.publicId);

    const res = await getExploreFeed(viewer.accessToken);
    const item = res.body.find((i: any) => i.post?.publicId === post.publicId);
    expect(item).toBeUndefined();
  });

  it("excludes a collection entirely if its owner has blocked you", async () => {
    const viewer = await getUserWithProfile();
    const owner = await getUserWithProfile({
      firstName: "Owner",
      lastName: "Person",
    });
    const followed = await getUserWithProfile({
      firstName: "Followed",
      lastName: "Person",
    });
    await followProfile(viewer.accessToken, followed.profile.publicId);

    const post = await createPostAsUser(owner.accessToken);
    const collection = await createCollectionAsUser(owner.accessToken, [
      { publicId: post.publicId, position: 1 },
    ]);
    await likeCollection(followed.accessToken, collection.publicId);
    await blockProfile(owner.accessToken, viewer.profile.publicId);

    const res = await getExploreFeed(viewer.accessToken);
    const item = res.body.find(
      (i: any) => i.collection?.publicId === collection.publicId,
    );
    expect(item).toBeUndefined();
  });

  it("shows a collection but filters out a post from a blocking author inside it", async () => {
    const viewer = await getUserWithProfile();
    const owner = await getUserWithProfile({
      firstName: "Owner",
      lastName: "Person",
    });
    const blockingAuthor = await getUserWithProfile({
      firstName: "Blocking",
      lastName: "Author",
    });
    const followed = await getUserWithProfile({
      firstName: "Followed",
      lastName: "Person",
    });
    await followProfile(viewer.accessToken, followed.profile.publicId);

    const ownPost = await createPostAsUser(owner.accessToken);
    const blockingAuthorPost = await createPostAsUser(
      blockingAuthor.accessToken,
    );

    const collection = await createCollectionAsUser(owner.accessToken, [
      { publicId: ownPost.publicId, position: 1 },
      { publicId: blockingAuthorPost.publicId, position: 2 },
    ]);
    await likeCollection(followed.accessToken, collection.publicId);

    await blockProfile(blockingAuthor.accessToken, viewer.profile.publicId);

    const res = await getExploreFeed(viewer.accessToken);
    const item = res.body.find(
      (i: any) => i.collection?.publicId === collection.publicId,
    );

    expect(item).toBeDefined();
    expect(item.collection.slides.length).toBeGreaterThan(0);
    expect(
      item.collection.slides.some(
        (s: any) => s.publicId === blockingAuthorPost.slides[0].publicId,
      ),
    ).toBe(false);
  });
});
