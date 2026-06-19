import { z } from "zod";

export const registerRoleSchema = z.enum(["student", "author"], {
  error: "Choose how you want to use nowa school.",
});

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must contain at least 8 characters."),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must contain at least 2 characters."),
  email: z.string().email("Enter a valid email address."),
  role: registerRoleSchema,
  password: z
    .string()
    .min(8, "Password must contain at least 8 characters.")
    .regex(/[A-Z]/, "Password must contain an uppercase letter.")
    .regex(/[0-9]/, "Password must contain a number."),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterRole = z.infer<typeof registerRoleSchema>;
