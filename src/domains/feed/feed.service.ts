import { prisma } from "../../config/prisma";
import { UnauthorizedError } from "../../config/errors/errors";
import {
  ProfileIsNotBlocked,
  ProfileLazySelect,
} from "../profiles/profiles.validators";
import {
  PostLazyResponseSchema,
  PostLazySelect,
} from "../posts/posts.validators";
import {
  CollectionLazySelect,
  parseCollectionLazyRes,
} from "../collections/collections.validators";
import { ColPostLazySelect } from "../collections/collectionPosts/collectionPosts.validators";
import {
  HomeFeedItem,
  HomeFeedItemSchema,
  ExploreItem,
  ExploreItemSchema,
} from "./feed.validators";

async function getCurrentProfileId(currentUserId: string): Promise<number> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");
  return currentUser.profile!.id;
}

async function getFollowedProfileIds(profileId: number): Promise<number[]> {
  const follows = await prisma.follow.findMany({
    where: { followerId: profileId },
    select: { followingId: true },
  });
  return follows.map((f) => f.followingId);
}

function buildViewerScopedCollectionSelect(currentProfileId: number) {
  const notBlocked = ProfileIsNotBlocked(currentProfileId);
  return {
    ...CollectionLazySelect,
    posts: {
      where: { post: { author: notBlocked } },
      select: ColPostLazySelect,
    },
  };
}

// Home
export async function getHomeFeed(
  currentUserId: string,
  opts: { before?: Date | undefined; limit: number },
): Promise<HomeFeedItem[]> {
  const currentProfileId = await getCurrentProfileId(currentUserId);
  const followedIds = await getFollowedProfileIds(currentProfileId);

  if (followedIds.length === 0) return [];

  const notBlocked = ProfileIsNotBlocked(currentProfileId);
  const dateFilter = opts.before ? { createdAt: { lt: opts.before } } : {};
  const collectionSelect = buildViewerScopedCollectionSelect(currentProfileId);

  const [posts, reposts, collections] = await Promise.all([
    prisma.post.findMany({
      where: {
        authorId: { in: followedIds },
        private: false,
        author: notBlocked,
        ...dateFilter,
      },
      select: {
        ...PostLazySelect,
        id: true,
        createdAt: true,
        author: { select: ProfileLazySelect },
      },
      orderBy: { createdAt: "desc" },
      take: opts.limit,
    }),
    prisma.repost.findMany({
      where: {
        reposterId: { in: followedIds },
        post: { private: false, author: notBlocked },
        ...dateFilter,
      },
      select: {
        createdAt: true,
        reposter: { select: ProfileLazySelect },
        post: {
          select: {
            ...PostLazySelect,
            id: true,
            author: { select: ProfileLazySelect },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: opts.limit,
    }),
    prisma.collection.findMany({
      where: {
        ownerId: { in: followedIds },
        private: false,
        owner: notBlocked,
        ...dateFilter,
      },
      select: { ...collectionSelect, id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: opts.limit,
    }),
  ]);

  const items: HomeFeedItem[] = [
    ...posts.map((p) =>
      HomeFeedItemSchema.parse({
        type: "POST",
        createdAt: p.createdAt,
        post: { ...p, stats: p._count },
      }),
    ),
    ...reposts.map((r) =>
      HomeFeedItemSchema.parse({
        type: "REPOST",
        createdAt: r.createdAt,
        reposter: r.reposter,
        post: { ...r.post, stats: r.post._count },
      }),
    ),
    ...collections.map((c) =>
      HomeFeedItemSchema.parse({
        type: "COLLECTION",
        createdAt: c.createdAt,
        collection: parseCollectionLazyRes(c),
      }),
    ),
  ];

  return items
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, opts.limit);
}

// Explore
export async function getExploreFeed(
  currentUserId: string,
  opts: { limit: number },
): Promise<ExploreItem[]> {
  const currentProfileId = await getCurrentProfileId(currentUserId);
  const followedIds = await getFollowedProfileIds(currentProfileId);

  if (followedIds.length === 0) {
    return getRecentPublicFallback(currentProfileId, opts.limit);
  }

  const excludedAuthorIds = [...followedIds, currentProfileId];
  const notBlocked = ProfileIsNotBlocked(currentProfileId);

  const [likedPosts, likedCollections] = await Promise.all([
    prisma.postLike.groupBy({
      by: ["postId"],
      where: {
        ownerId: { in: followedIds },
        post: {
          private: false,
          authorId: { notIn: excludedAuthorIds },
          author: notBlocked,
        },
      },
      _count: { ownerId: true },
      orderBy: { _count: { ownerId: "desc" } },
      take: opts.limit,
    }),
    prisma.collectionLike.groupBy({
      by: ["collectionId"],
      where: {
        ownerId: { in: followedIds },
        collection: {
          private: false,
          ownerId: { notIn: excludedAuthorIds },
          owner: notBlocked,
        },
      },
      _count: { ownerId: true },
      orderBy: { _count: { ownerId: "desc" } },
      take: opts.limit,
    }),
  ]);

  if (likedPosts.length === 0 && likedCollections.length === 0) {
    return getRecentPublicFallback(currentProfileId, opts.limit);
  }

  const collectionSelect = buildViewerScopedCollectionSelect(currentProfileId);

  const [posts, collections] = await Promise.all([
    likedPosts.length
      ? prisma.post.findMany({
          where: { id: { in: likedPosts.map((g) => g.postId) } },
          select: {
            ...PostLazySelect,
            id: true,
            author: { select: ProfileLazySelect },
          },
        })
      : Promise.resolve([]),
    likedCollections.length
      ? prisma.collection.findMany({
          where: { id: { in: likedCollections.map((g) => g.collectionId) } },
          select: { ...collectionSelect, id: true },
        })
      : Promise.resolve([]),
  ]);

  const postsById = new Map(posts.map((p) => [p.id, p]));
  const collectionsById = new Map(collections.map((c) => [c.id, c]));

  const postItems: ExploreItem[] = likedPosts
    .map((g) => {
      const post = postsById.get(g.postId);
      if (!post) return null;
      return ExploreItemSchema.parse({
        type: "POST",
        post: PostLazyResponseSchema.parse({ ...post, stats: post._count }),
        convergence: g._count.ownerId,
      });
    })
    .filter((item): item is ExploreItem => item !== null);

  const collectionItems: ExploreItem[] = likedCollections
    .map((g) => {
      const collection = collectionsById.get(g.collectionId);
      if (!collection) return null;
      return ExploreItemSchema.parse({
        type: "COLLECTION",
        collection: parseCollectionLazyRes(collection),
        convergence: g._count.ownerId,
      });
    })
    .filter((item): item is ExploreItem => item !== null);

  return [...postItems, ...collectionItems]
    .sort((a, b) => b.convergence - a.convergence)
    .slice(0, opts.limit);
}

// Fallback
async function getRecentPublicFallback(
  currentProfileId: number,
  limit: number,
): Promise<ExploreItem[]> {
  const notBlocked = ProfileIsNotBlocked(currentProfileId);
  const collectionSelect = buildViewerScopedCollectionSelect(currentProfileId);

  const [posts, collections] = await Promise.all([
    prisma.post.findMany({
      where: {
        private: false,
        authorId: { not: currentProfileId },
        author: notBlocked,
      },
      select: {
        ...PostLazySelect,
        createdAt: true,
        author: { select: ProfileLazySelect },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.collection.findMany({
      where: {
        private: false,
        ownerId: { not: currentProfileId },
        owner: notBlocked,
      },
      select: { ...collectionSelect, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  const items: (ExploreItem & { createdAt: Date })[] = [
    ...posts.map((p) => ({
      ...ExploreItemSchema.parse({
        type: "POST" as const,
        post: PostLazyResponseSchema.parse({ ...p, stats: p._count }),
        convergence: 0,
      }),
      createdAt: p.createdAt,
    })),
    ...collections.map((c) => ({
      ...ExploreItemSchema.parse({
        type: "COLLECTION" as const,
        collection: parseCollectionLazyRes(c),
        convergence: 0,
      }),
      createdAt: c.createdAt,
    })),
  ];

  return items
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit)
    .map(({ createdAt, ...item }) => item);
}
