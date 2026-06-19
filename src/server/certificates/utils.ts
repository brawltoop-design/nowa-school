import { randomBytes } from "crypto";
import {
  CertificateStatus,
  CertificateType,
  type Prisma,
} from "@prisma/client";
import { getPrismaClient } from "@/server/db";

export const VERIFIED_SKILL_CRITERIA = [
  {
    criterion: "Рабочий результат",
    description: "Проект открывается и демонстрирует заявленный сценарий.",
    points: 30,
  },
  {
    criterion: "Качество реализации",
    description: "Структура, UX и базовая надежность соответствуют уровню курса.",
    points: 25,
  },
  {
    criterion: "AI-first workflow",
    description: "В проекте видно осознанное применение AI-инструментов и prompts.",
    points: 20,
  },
  {
    criterion: "Документация и демонстрация",
    description: "Есть понятное описание, ссылка на demo или репозиторий.",
    points: 15,
  },
  {
    criterion: "Рефлексия и улучшения",
    description: "Ученик понимает ограничения проекта и следующий шаг развития.",
    points: 10,
  },
] satisfies Prisma.JsonArray;

export function buildCertificateSkills(course: {
  category: string;
  level: string;
  title: string;
}) {
  return [
    course.category,
    course.level,
    "AI-first product building",
    "Project delivery",
    `Course track: ${course.title}`,
  ];
}

export function buildOpenBadgeMetadata(args: {
  certificateId: string;
  verificationUrl: string;
  title: string;
  description: string;
  skills: unknown;
  criteria: unknown;
  issuedAt: Date;
}) {
  return {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    id: args.verificationUrl,
    name: args.title,
    description: args.description,
    issuer: {
      type: "Profile",
      name: "nowa school",
      url: process.env.NEXTAUTH_URL ?? "http://localhost:3001",
    },
    credentialSubject: {
      type: "AchievementSubject",
      achievement: {
        id: args.certificateId,
        type: "Achievement",
        name: args.title,
        description: args.description,
        criteria: args.criteria,
        alignment: args.skills,
      },
    },
    issuanceDate: args.issuedAt.toISOString(),
  };
}

export function getVerificationUrl(certificateId: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3001";
  return `${baseUrl.replace(/\/$/, "")}/cert/${encodeURIComponent(certificateId)}`;
}

export function getCertificateLevel(score: number) {
  if (score >= 95) {
    return "Distinction";
  }

  if (score >= 85) {
    return "Advanced";
  }

  if (score >= 70) {
    return "Verified";
  }

  return "Foundation";
}

export async function generateUniqueCertificateId() {
  const prisma = getPrismaClient();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const token = randomBytes(4).toString("hex").toUpperCase();
    const certificateId = `NSAI-${token.slice(0, 4)}-${token.slice(4, 8)}`;
    const existing = await prisma.certificate.findUnique({
      where: { certificateId },
      select: { id: true },
    });

    if (!existing) {
      return certificateId;
    }
  }

  throw new Error("CERTIFICATE_ID_GENERATION_FAILED");
}

export function getCertificateStatusLabel(status: CertificateStatus) {
  const labels = {
    [CertificateStatus.PENDING]: "На проверке",
    [CertificateStatus.ISSUED]: "Выдан",
    [CertificateStatus.REVOKED]: "Отозван",
    [CertificateStatus.EXPIRED]: "Истек",
  } satisfies Record<CertificateStatus, string>;

  return labels[status];
}

export function getCertificateTypeLabel(type: CertificateType) {
  const labels = {
    [CertificateType.COMPLETION]: "Completion",
    [CertificateType.VERIFIED_SKILL]: "Verified Skill",
    [CertificateType.EXPERT_REVIEWED]: "Expert Reviewed",
  } satisfies Record<CertificateType, string>;

  return labels[type];
}

export function parseFilesInput(value: string | undefined) {
  return (value ?? "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}
