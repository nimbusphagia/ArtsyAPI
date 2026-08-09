import z from "zod";
import * as ProfileValidators from "../profiles/profiles.validators";
import * as PostValidators from "../posts/posts.validators";
import * as CollectionValidators from "../collections/collections.validators";

// Home feed
export const HomeFeedItemSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("POST"),
    createdAt: z.coerce.date(),
    post: z.lazy(() => PostValidators.PostLazyResponseSchema),
  }),
  z.object({
    type: z.literal("REPOST"),
    createdAt: z.coerce.date(),
    reposter: z.lazy(() => ProfileValidators.ProfileLazyResponseSchema),
    post: z.lazy(() => PostValidators.PostLazyResponseSchema),
  }),
  z.object({
    type: z.literal("COLLECTION"),
    createdAt: z.coerce.date(),
    collection: z.lazy(() => CollectionValidators.CollectionLazyResponseSchema),
  }),
]);
export type HomeFeedItem = z.infer<typeof HomeFeedItemSchema>;

export const HomeFeedQuerySchema = z.object({
  before: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type HomeFeedQuery = z.infer<typeof HomeFeedQuerySchema>;

// Explore feed
export const ExploreItemSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("POST"),
    post: z.lazy(() => PostValidators.PostLazyResponseSchema),
    convergence: z.number().nonnegative(),
  }),
  z.object({
    type: z.literal("COLLECTION"),
    collection: z.lazy(() => CollectionValidators.CollectionLazyResponseSchema),
    convergence: z.number().nonnegative(),
  }),
]);
export type ExploreItem = z.infer<typeof ExploreItemSchema>;

export const ExploreQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ExploreQuery = z.infer<typeof ExploreQuerySchema>;
