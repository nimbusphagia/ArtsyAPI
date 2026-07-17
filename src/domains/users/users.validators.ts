import z from "zod";

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
