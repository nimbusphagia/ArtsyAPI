import z from "zod";
import { MediaResponseSchema } from "../media/media.validators";
import { PostResponseSchema } from "../posts/posts.validators";
import { CommentResponseSchema } from "../comments/comments.validators";
import { CollectionResponseSchema } from "../collections/collections.validators";
import { RepostResponseSchema } from "../reposts/reposts.validators";

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

// User without relations
export const UserLazyResponseSchema = z.object({
  publicId: z.uuidv7(),
  email: z.email(),
  password: z.string(),
  birthdate: z.date(),
  firstName: z.string(),
  lastName: z.string(),
  nickname: z.string().optional(),
  profilePicture: MediaResponseSchema,
  createdAt: z.coerce.date(),
});
export type UserLazyRes = z.infer<typeof UserLazyResponseSchema>;

// User with all public fields
export const UserResponseSchema = UserLazyResponseSchema.extend({
  following: UserLazyResponseSchema.array(),
  followedBy: UserLazyResponseSchema.array(),
  blocking: UserLazyResponseSchema.array(),
  blockedBy: UserLazyResponseSchema.array(),
  posts: PostResponseSchema.array(),
  reposts: RepostResponseSchema.array(),
  comments: CommentResponseSchema.array(),
  collections: CollectionResponseSchema.array(),
});
export type UserResponse = z.infer<typeof UserResponseSchema>;
