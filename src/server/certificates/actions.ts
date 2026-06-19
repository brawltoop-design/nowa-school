"use server";

import {
  CertificateReviewerType,
  CertificateStatus,
  CertificateSubmissionStatus,
  CertificateType,
  Prisma,
  UserRole,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  certificateReviewSchema,
  certificateSubmissionSchema,
} from "@/lib/validators/certificate";
import { getServerAuthSession } from "@/server/auth/session";
import { getPrismaClient } from "@/server/db";
import {
  buildCertificateSkills,
  buildOpenBadgeMetadata,
  generateUniqueCertificateId,
  getCertificateLevel,
  getVerificationUrl,
  parseFilesInput,
  VERIFIED_SKILL_CRITERIA,
} from "@/server/certificates/utils";

async function requireStudentActor(courseId: string) {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/learn/${courseId}/certificate`)}`);
  }

  if (session.user.role !== UserRole.STUDENT) {
    redirect("/forbidden");
  }

  return session.user;
}

async function requireReviewerActor() {
  const session = await getServerAuthSession();

  if (
    !session?.user ||
    (session.user.role !== UserRole.AUTHOR && session.user.role !== UserRole.ADMIN)
  ) {
    redirect("/forbidden");
  }

  return session.user;
}

async function assertCourseReviewerAccess(courseId: string, actor: { id: string; role: UserRole }) {
  const prisma = getPrismaClient();
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      ...(actor.role === UserRole.ADMIN ? {} : { authorId: actor.id }),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      category: true,
      level: true,
      authorId: true,
    },
  });

  if (!course) {
    redirect("/forbidden");
  }

  return course;
}

function revalidateCertificateSurfaces(courseId: string, certificateId?: string) {
  revalidatePath("/learn");
  revalidatePath(`/learn/${courseId}`);
  revalidatePath(`/learn/${courseId}/certificate`);
  revalidatePath(`/author/courses/${courseId}/certificates`);
  revalidatePath("/admin/certificates");

  if (certificateId) {
    revalidatePath(`/cert/${certificateId}`);
  }
}

async function getCompletionEligibility(userId: string, courseId: string) {
  const prisma = getPrismaClient();
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    select: {
      progressPercent: true,
      lessonProgresses: {
        select: {
          score: true,
        },
      },
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          category: true,
          level: true,
          authorId: true,
        },
      },
    },
  });

  if (!enrollment) {
    return null;
  }

  const bestQuizScore = enrollment.lessonProgresses.reduce(
    (max, progress) =>
      typeof progress.score === "number" ? Math.max(max, progress.score) : max,
    0,
  );

  return {
    course: enrollment.course,
    progressPercent: enrollment.progressPercent,
    bestQuizScore,
    eligible: enrollment.progressPercent >= 90 && bestQuizScore >= 80,
  };
}

export async function issueCompletionCertificate(courseId: string) {
  const actor = await requireStudentActor(courseId);
  const prisma = getPrismaClient();
  const eligibility = await getCompletionEligibility(actor.id, courseId);

  if (!eligibility?.eligible) {
    revalidateCertificateSurfaces(courseId);
    return;
  }

  const existing = await prisma.certificate.findFirst({
    where: {
      userId: actor.id,
      courseId,
      type: CertificateType.COMPLETION,
      status: CertificateStatus.ISSUED,
    },
    select: {
      certificateId: true,
    },
  });

  if (existing) {
    redirect(`/cert/${existing.certificateId}`);
  }

  const certificateId = await generateUniqueCertificateId();
  const issuedAt = new Date();
  const skills = buildCertificateSkills(eligibility.course);
  const criteria = [
    {
      criterion: "Course progress",
      value: `${eligibility.progressPercent}%`,
      required: "90%+",
    },
    {
      criterion: "Quiz score",
      value: `${eligibility.bestQuizScore}%`,
      required: "80%+",
    },
  ];

  const certificate = await prisma.certificate.create({
    data: {
      certificateId,
      userId: actor.id,
      courseId,
      authorId: eligibility.course.authorId,
      type: CertificateType.COMPLETION,
      track: eligibility.course.category,
      title: `nowa school Completion: ${eligibility.course.title}`,
      description:
        "Issued for completing the learning path and passing the required knowledge check.",
      skills,
      criteria,
      score: eligibility.bestQuizScore,
      status: CertificateStatus.ISSUED,
      issuedAt,
    },
    select: {
      id: true,
      certificateId: true,
      title: true,
      description: true,
      skills: true,
      criteria: true,
      issuedAt: true,
    },
  });

  await prisma.badge.create({
    data: {
      certificateId: certificate.id,
      title: "Completion Verified",
      description: "Course progress and knowledge check completed.",
      icon: "check-circle",
      level: getCertificateLevel(eligibility.bestQuizScore),
      metadata: buildOpenBadgeMetadata({
        certificateId: certificate.certificateId,
        verificationUrl: getVerificationUrl(certificate.certificateId),
        title: certificate.title,
        description: certificate.description,
        skills: certificate.skills,
        criteria: certificate.criteria,
        issuedAt: certificate.issuedAt,
      }) as Prisma.InputJsonValue,
    },
  });

  revalidateCertificateSurfaces(courseId, certificate.certificateId);
  redirect(`/cert/${certificate.certificateId}`);
}

export async function submitCertificateProject(courseId: string, formData: FormData) {
  const actor = await requireStudentActor(courseId);
  const prisma = getPrismaClient();
  const parsed = certificateSubmissionSchema.safeParse({
    projectTitle: formData.get("projectTitle"),
    projectDescription: formData.get("projectDescription"),
    projectUrl: formData.get("projectUrl"),
    demoVideoUrl: formData.get("demoVideoUrl"),
    repositoryUrl: formData.get("repositoryUrl"),
    files: formData.get("files"),
  });

  if (!parsed.success) {
    revalidateCertificateSurfaces(courseId);
    return;
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: actor.id,
        courseId,
      },
    },
    select: {
      course: {
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          level: true,
          authorId: true,
        },
      },
    },
  });

  if (!enrollment) {
    redirect("/forbidden");
  }

  const files = parseFilesInput(parsed.data.files);
  const demoVideoUrl = parsed.data.demoVideoUrl || null;
  const repositoryUrl = parsed.data.repositoryUrl || null;

  await prisma.certificateSubmission.upsert({
    where: {
      userId_courseId: {
        userId: actor.id,
        courseId,
      },
    },
    create: {
      userId: actor.id,
      courseId,
      projectTitle: parsed.data.projectTitle,
      projectDescription: parsed.data.projectDescription,
      projectUrl: parsed.data.projectUrl,
      demoVideoUrl,
      repositoryUrl,
      files,
      status: CertificateSubmissionStatus.SUBMITTED,
    },
    update: {
      projectTitle: parsed.data.projectTitle,
      projectDescription: parsed.data.projectDescription,
      projectUrl: parsed.data.projectUrl,
      demoVideoUrl,
      repositoryUrl,
      files,
      status: CertificateSubmissionStatus.SUBMITTED,
    },
  });

  const existingCertificate = await prisma.certificate.findFirst({
    where: {
      userId: actor.id,
      courseId,
      type: {
        in: [CertificateType.VERIFIED_SKILL, CertificateType.EXPERT_REVIEWED],
      },
    },
    select: {
      id: true,
    },
  });

  if (existingCertificate) {
    await prisma.certificate.update({
      where: { id: existingCertificate.id },
      data: {
        projectUrl: parsed.data.projectUrl,
        demoVideoUrl,
        repositoryUrl,
        status: CertificateStatus.PENDING,
      },
    });
  } else {
    await prisma.certificate.create({
      data: {
        certificateId: await generateUniqueCertificateId(),
        userId: actor.id,
        courseId,
        authorId: enrollment.course.authorId,
        type: CertificateType.VERIFIED_SKILL,
        track: enrollment.course.category,
        title: `nowa school Verified Skill: ${enrollment.course.title}`,
        description:
          "Pending verification for a practical project submitted by the learner.",
        skills: buildCertificateSkills(enrollment.course),
        criteria: VERIFIED_SKILL_CRITERIA,
        score: 0,
        status: CertificateStatus.PENDING,
        projectUrl: parsed.data.projectUrl,
        demoVideoUrl,
        repositoryUrl,
        issuedAt: new Date(),
      },
    });
  }

  revalidateCertificateSurfaces(courseId);
  redirect(`/learn/${courseId}/certificate`);
}

export async function reviewCertificateSubmission(
  courseId: string,
  submissionId: string,
  decision: "approve" | "reject" | "revision",
  formData: FormData,
) {
  const actor = await requireReviewerActor();
  const course = await assertCourseReviewerAccess(courseId, actor);
  const prisma = getPrismaClient();
  const parsed = certificateReviewSchema.safeParse({
    score: formData.get("score"),
    feedback: formData.get("feedback"),
  });

  if (!parsed.success) {
    revalidateCertificateSurfaces(courseId);
    return;
  }

  const submission = await prisma.certificateSubmission.findFirst({
    where: {
      id: submissionId,
      courseId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!submission) {
    redirect("/forbidden");
  }

  const certificateType =
    actor.role === UserRole.ADMIN
      ? CertificateType.EXPERT_REVIEWED
      : CertificateType.VERIFIED_SKILL;
  const status =
    decision === "approve"
      ? CertificateStatus.ISSUED
      : CertificateStatus.PENDING;
  const submissionStatus =
    decision === "approve"
      ? CertificateSubmissionStatus.APPROVED
      : decision === "reject"
        ? CertificateSubmissionStatus.REJECTED
        : CertificateSubmissionStatus.NEEDS_REVISION;

  let certificate = await prisma.certificate.findFirst({
    where: {
      userId: submission.userId,
      courseId,
      type: {
        in: [CertificateType.VERIFIED_SKILL, CertificateType.EXPERT_REVIEWED],
      },
    },
  });

  if (!certificate) {
    certificate = await prisma.certificate.create({
      data: {
        certificateId: await generateUniqueCertificateId(),
        userId: submission.userId,
        courseId,
        authorId: course.authorId,
        type: certificateType,
        track: course.category,
        title: `nowa school Verified Skill: ${course.title}`,
        description:
          "Verification record for a practical project submitted by the learner.",
        skills: buildCertificateSkills(course),
        criteria: VERIFIED_SKILL_CRITERIA,
        score: parsed.data.score,
        status,
        projectUrl: submission.projectUrl,
        demoVideoUrl: submission.demoVideoUrl,
        repositoryUrl: submission.repositoryUrl,
        issuedAt: new Date(),
      },
    });
  } else {
    certificate = await prisma.certificate.update({
      where: { id: certificate.id },
      data: {
        type: decision === "approve" ? certificateType : certificate.type,
        score: parsed.data.score,
        status,
        projectUrl: submission.projectUrl,
        demoVideoUrl: submission.demoVideoUrl,
        repositoryUrl: submission.repositoryUrl,
        issuedAt: decision === "approve" ? new Date() : certificate.issuedAt,
      },
    });
  }

  await prisma.$transaction([
    prisma.certificateSubmission.update({
      where: { id: submission.id },
      data: { status: submissionStatus },
    }),
    prisma.certificateReview.create({
      data: {
        certificateId: certificate.id,
        reviewerId: actor.id,
        reviewerType:
          actor.role === UserRole.ADMIN
            ? CertificateReviewerType.ADMIN
            : CertificateReviewerType.AUTHOR,
        score: parsed.data.score,
        feedback: parsed.data.feedback,
        rubric: VERIFIED_SKILL_CRITERIA,
      },
    }),
  ]);

  if (decision === "approve") {
    await prisma.badge.upsert({
      where: {
        id:
          (
            await prisma.badge.findFirst({
              where: { certificateId: certificate.id },
              select: { id: true },
            })
          )?.id ?? "__new_badge__",
      },
      create: {
        certificateId: certificate.id,
        title:
          certificateType === CertificateType.EXPERT_REVIEWED
            ? "Expert Reviewed Skill"
            : "Verified Skill",
        description: "Practical project reviewed against nowa school criteria.",
        icon: "shield-check",
        level: getCertificateLevel(parsed.data.score),
        metadata: buildOpenBadgeMetadata({
          certificateId: certificate.certificateId,
          verificationUrl: getVerificationUrl(certificate.certificateId),
          title: certificate.title,
          description: certificate.description,
          skills: certificate.skills,
          criteria: certificate.criteria,
          issuedAt: new Date(),
        }) as Prisma.InputJsonValue,
      },
      update: {
        level: getCertificateLevel(parsed.data.score),
        metadata: buildOpenBadgeMetadata({
          certificateId: certificate.certificateId,
          verificationUrl: getVerificationUrl(certificate.certificateId),
          title: certificate.title,
          description: certificate.description,
          skills: certificate.skills,
          criteria: certificate.criteria,
          issuedAt: new Date(),
        }) as Prisma.InputJsonValue,
      },
    });
  }

  revalidateCertificateSurfaces(courseId, certificate.certificateId);
  redirect(`/author/courses/${courseId}/certificates`);
}

export async function updateCertificateStatus(
  certificateId: string,
  status: CertificateStatus,
) {
  const session = await getServerAuthSession();

  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    redirect("/forbidden");
  }

  if (status !== CertificateStatus.ISSUED && status !== CertificateStatus.REVOKED) {
    return;
  }

  const prisma = getPrismaClient();
  const certificate = await prisma.certificate.update({
    where: { id: certificateId },
    data: { status },
    select: {
      certificateId: true,
      courseId: true,
    },
  });

  revalidateCertificateSurfaces(certificate.courseId, certificate.certificateId);
}
