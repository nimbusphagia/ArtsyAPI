import z from "zod";

export const LikeResponseSchema = z.object({
  createdAt: z.coerce.date(),
});
export type LikeRes = z.infer<typeof LikeResponseSchema>;
