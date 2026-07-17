import z from "zod";
import { MediaResponseSchema } from "../media/media.validators";
import { PostLazyResponseSchema } from "../posts/posts.validators";
import { CollectionLazyResponseSchema } from "../collections/collections.validators";
import { RepostLazyResponseSchema } from "../reposts/reposts.validators";

// Register
export const RegisterResponseSchema = z
  .object({
    email: z.email(),
    password: z.string().min(8).max(20),
    confirmPassword: z.string(),
    birthdate: z.date(),
    firstName: z.string(),
    lastName: z.string(),
    createdAt: z.coerce.date(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type UserRegisterRes = z.infer<typeof RegisterResponseSchema>;

// Login
export const LoginResponseSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(20),
});
export type UserLoginRes = z.infer<typeof LoginResponseSchema>;

// Lazy
export const UserLazyResponseSchema = z.object({
  publicId: z.uuidv7(),
  firstName: z.string(),
  lastName: z.string(),
  nickname: z.string().optional(),
  profilePicture: MediaResponseSchema,
  createdAt: z.coerce.date(),
});
export type UserLazyRes = z.infer<typeof UserLazyResponseSchema>;

// User with all public fields
export const UserResponseSchema = UserLazyResponseSchema.extend({
  email: z.email(),
  birthdate: z.date(),
  // Loaded Lazily
  following: UserLazyResponseSchema.array(),
  followedBy: UserLazyResponseSchema.array(),
  blocking: UserLazyResponseSchema.array(),
  blockedBy: UserLazyResponseSchema.array(),
  posts: PostLazyResponseSchema.array(),
  reposts: RepostLazyResponseSchema.array(),
  collections: CollectionLazyResponseSchema.array(),
});
export type UserResponse = z.infer<typeof UserResponseSchema>;
