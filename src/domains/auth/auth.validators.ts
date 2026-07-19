import z from "zod";

// PublicId
export const PublicIdSchema = z.uuidv7();

export type PublicId = z.infer<typeof PublicIdSchema>;

// JWT User
export const UserResponseSchema = z.object({
  publicId: z.uuidv7(),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  createdAt: z.coerce.date(),
});

export type UserRes = z.infer<typeof UserResponseSchema>;

// Rotate Token
export const TokenRotateReturnSchema = z.object({
  userId: z.number(),
  rawToken: z.string(),
});

export type TokenRotateReturn = z.infer<typeof TokenRotateReturnSchema>;

// Register
export const RegisterRequestSchema = z
  .object({
    email: z.email(),
    password: z.string().min(8).max(20),
    confirmPassword: z.string(),
    firstName: z.string().min(2).max(20).nonempty(),
    lastName: z.string(),
    createdAt: z.coerce.date(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterReq = z.infer<typeof RegisterRequestSchema>;

// Login
export const LoginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(20),
});

export type LoginReq = z.infer<typeof LoginRequestSchema>;

// Prisma select
export const omitUserPassword = {
  password: true,
  active: true,
};
