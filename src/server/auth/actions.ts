"use server";

import { Prisma, UserRole } from "@prisma/client";
import type { RegisterInput } from "@/lib/validators/auth";
import { registerSchema } from "@/lib/validators/auth";
import { getPrismaClient } from "@/server/db";
import { hashPassword } from "@/server/password";

export type AuthActionResult = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export async function registerUser(
  values: RegisterInput,
): Promise<AuthActionResult> {
  const prisma = getPrismaClient();
  const parsed = registerSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Please check the form fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const email = parsed.data.email.toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        success: false,
        message: "This email is already in use.",
        fieldErrors: {
          email: ["An account with this email already exists."],
        },
      };
    }

    const passwordHash = await hashPassword(parsed.data.password);

    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash,
        role:
          parsed.data.role === "author" ? UserRole.AUTHOR : UserRole.STUDENT,
      },
    });

    return {
      success: true,
      message: "Account created. Redirecting...",
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return {
        success: false,
        message: "Database is not reachable yet. Check DATABASE_URL and try again.",
      };
    }

    return {
      success: false,
      message: "Something went wrong while creating the account.",
    };
  }
}
