import {
  CertificateStatus,
  CertificateSubmissionStatus,
  CertificateType,
  UserRole,
} from "@prisma/client";
import { getPrismaClient } from "@/server/db";
import {
  getCertificateLevel,
  getCertificateStatusLabel,
  getCertificateTypeLabel,
} from "@/server/certificates/utils";

export type CertificateActor = {
  userId: string;
  role: UserRole;
};

export type CertificateRequirement = {
  title: string;
  description: string;
  completed: boolean;
};

export type StudentCertificateCenterData = {
  course: {
    id: string;
    slug: string;
    title: string;
    description: string;
    author: {
      id: string;
      name: string;
    };
  };
  progress: {
    percent: number;
    completedLessons: number;
    totalLessons: number;
    bestQuizScore: number;
    eligibleForCompletion: boolean;
  };
  requirements: CertificateRequirement[];
  submission: {
    id: string;
    projectTitle: string;
    projectDescription: string;
    projectUrl: string;
    demoVideoUrl: string | null;
    repositoryUrl: string | null;
    files: unknown;
    status: CertificateSubmissionStatus;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  certificates: Array<{
    id: string;
    certificateId: string;
    type: CertificateType;
    typeLabel: string;
    title: string;
    description: string;
    status: CertificateStatus;
    statusLabel: string;
    score: number;
    level: string;
    issuedAt: Date;
    projectUrl: string | null;
    demoVideoUrl: string | null;
    repositoryUrl: string | null;
    latestFeedback: string | null;
  }>;
};

export type PublicCertificateData = {
  id: string;
  certificateId: string;
  type: CertificateType;
  typeLabel: string;
  track: string;
  title: string;
  description: string;
  skills: unknown;
  criteria: unknown;
  score: number;
  level: string;
  status: CertificateStatus;
  statusLabel: string;
  projectUrl: string | null;
  demoVideoUrl: string | null;
  repositoryUrl: string | null;
  issuedAt: Date;
  expiresAt: Date | null;
  student: {
    name: string;
    email: string;
  };
  course: {
    id: string;
    slug: string;
    title: string;
  };
  author: {
    name: string;
    email: string;
  };
  badges: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    level: string | null;
    metadata: unknown;
  }>;
  reviews: Array<{
    id: string;
    reviewerType: string;
    score: number;
    feedback: string;
    rubric: unknown;
    createdAt: Date;
  }>;
};

export type AuthorCertificateSubmissionRow = {
  id: string;
  status: CertificateSubmissionStatus;
  projectTitle: string;
  projectDescription: string;
  projectUrl: string;
  demoVideoUrl: string | null;
  repositoryUrl: string | null;
  files: unknown;
  createdAt: Date;
  updatedAt: Date;
  student: {
    id: string;
    name: string;
    email: string;
  };
  certificate: {
    id: string;
    certificateId: string;
    type: CertificateType;
    status: CertificateStatus;
    score: number;
    level: string;
    latestFeedback: string | null;
  } | null;
};

export type AuthorCourseCertificatesData = {
  course: {
    id: string;
    slug: string;
    title: string;
    authorId: string;
  };
  metrics: {
    totalSubmissions: number;
    pendingSubmissions: number;
    issuedCertificates: number;
    averageScore: number;
  };
  submissions: AuthorCertificateSubmissionRow[];
};

export type AdminCertificateRow = {
  id: string;
  certificateId: string;
  type: CertificateType;
  typeLabel: string;
  status: CertificateStatus;
  statusLabel: string;
  title: string;
  score: number;
  level: string;
  issuedAt: Date;
  student: {
    name: string;
    email: string;
  };
  course: {
    id: string;
    slug: string;
    title: string;
  };
  author: {
    name: string;
    email: string;
  };
};

function getBestQuizScore(
  progresses: Array<{
    score: number | null;
  }>,
) {
  return progresses.reduce(
    (max, progress) =>
      typeof progress.score === "number" ? Math.max(max, progress.score) : max,
    0,
  );
}

function mapCertificate(certificate: {
  id: string;
  certificateId: string;
  type: CertificateType;
  title: string;
  description: string;
  status: CertificateStatus;
  score: number;
  issuedAt: Date;
  projectUrl: string | null;
  demoVideoUrl: string | null;
  repositoryUrl: string | null;
  reviews: Array<{
    feedback: string;
    createdAt: Date;
  }>;
}) {
  const latestReview = certificate.reviews[0] ?? null;

  return {
    id: certificate.id,
    certificateId: certificate.certificateId,
    type: certificate.type,
    typeLabel: getCertificateTypeLabel(certificate.type),
    title: certificate.title,
    description: certificate.description,
    status: certificate.status,
    statusLabel: getCertificateStatusLabel(certificate.status),
    score: certificate.score,
    level: getCertificateLevel(certificate.score),
    issuedAt: certificate.issuedAt,
    projectUrl: certificate.projectUrl,
    demoVideoUrl: certificate.demoVideoUrl,
    repositoryUrl: certificate.repositoryUrl,
    latestFeedback: latestReview?.feedback ?? null,
  };
}

export async function getStudentCertificateCenterData(
  courseId: string,
  actor: CertificateActor,
): Promise<
  | { status: "ok"; data: StudentCertificateCenterData }
  | { status: "forbidden" }
  | { status: "not_found" }
> {
  const prisma = getPrismaClient();

  if (actor.role === UserRole.ADMIN) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        author: { select: { id: true, name: true } },
        modules: {
          select: {
            lessons: { select: { id: true } },
          },
        },
      },
    });

    if (!course) {
      return { status: "not_found" };
    }

    const totalLessons = course.modules.reduce(
      (sum, module) => sum + module.lessons.length,
      0,
    );

    return {
      status: "ok",
      data: {
        course,
        progress: {
          percent: 0,
          completedLessons: 0,
          totalLessons,
          bestQuizScore: 0,
          eligibleForCompletion: false,
        },
        requirements: [
          {
            title: "90% прогресса",
            description: "Ученик должен пройти почти весь learning path.",
            completed: false,
          },
          {
            title: "Финальный тест 80%+",
            description: "Подтверждаем понимание материала через quiz score.",
            completed: false,
          },
          {
            title: "Практический проект",
            description: "Verified Skill выдается только после отправки проекта.",
            completed: false,
          },
        ],
        submission: null,
        certificates: [],
      },
    };
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: actor.userId,
        courseId,
      },
    },
    select: {
      progressPercent: true,
      lessonProgresses: {
        select: {
          completed: true,
          score: true,
        },
      },
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          author: {
            select: {
              id: true,
              name: true,
            },
          },
          modules: {
            select: {
              lessons: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!enrollment) {
    const courseExists = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });

    return courseExists ? { status: "forbidden" } : { status: "not_found" };
  }

  const [submission, certificates] = await Promise.all([
    prisma.certificateSubmission.findUnique({
      where: {
        userId_courseId: {
          userId: actor.userId,
          courseId,
        },
      },
      select: {
        id: true,
        projectTitle: true,
        projectDescription: true,
        projectUrl: true,
        demoVideoUrl: true,
        repositoryUrl: true,
        files: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.certificate.findMany({
      where: {
        userId: actor.userId,
        courseId,
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        certificateId: true,
        type: true,
        title: true,
        description: true,
        status: true,
        score: true,
        issuedAt: true,
        projectUrl: true,
        demoVideoUrl: true,
        repositoryUrl: true,
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            feedback: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);

  const totalLessons = enrollment.course.modules.reduce(
    (sum, module) => sum + module.lessons.length,
    0,
  );
  const completedLessons = enrollment.lessonProgresses.filter(
    (progress) => progress.completed,
  ).length;
  const bestQuizScore = getBestQuizScore(enrollment.lessonProgresses);
  const hasProject = Boolean(
    submission &&
      submission.status !== CertificateSubmissionStatus.DRAFT &&
      submission.status !== CertificateSubmissionStatus.REJECTED,
  );
  const eligibleForCompletion =
    enrollment.progressPercent >= 90 && bestQuizScore >= 80;

  return {
    status: "ok",
    data: {
      course: enrollment.course,
      progress: {
        percent: enrollment.progressPercent,
        completedLessons,
        totalLessons,
        bestQuizScore,
        eligibleForCompletion,
      },
      requirements: [
        {
          title: "90% прогресса",
          description: `${completedLessons}/${totalLessons} уроков завершено.`,
          completed: enrollment.progressPercent >= 90,
        },
        {
          title: "Финальный тест 80%+",
          description: `Лучший quiz score: ${bestQuizScore}%.`,
          completed: bestQuizScore >= 80,
        },
        {
          title: "Практический проект",
          description: "Project URL, demo или repository для проверки навыка.",
          completed: hasProject,
        },
      ],
      submission,
      certificates: certificates.map(mapCertificate),
    },
  };
}

export async function getPublicCertificate(
  certificateId: string,
): Promise<PublicCertificateData | null> {
  const prisma = getPrismaClient();
  const certificate = await prisma.certificate.findUnique({
    where: { certificateId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
        },
      },
      author: {
        select: {
          name: true,
          email: true,
        },
      },
      badges: {
        select: {
          id: true,
          title: true,
          description: true,
          icon: true,
          level: true,
          metadata: true,
        },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          reviewerType: true,
          score: true,
          feedback: true,
          rubric: true,
          createdAt: true,
        },
      },
    },
  });

  if (!certificate) {
    return null;
  }

  return {
    id: certificate.id,
    certificateId: certificate.certificateId,
    type: certificate.type,
    typeLabel: getCertificateTypeLabel(certificate.type),
    track: certificate.track,
    title: certificate.title,
    description: certificate.description,
    skills: certificate.skills,
    criteria: certificate.criteria,
    score: certificate.score,
    level: getCertificateLevel(certificate.score),
    status: certificate.status,
    statusLabel: getCertificateStatusLabel(certificate.status),
    projectUrl: certificate.projectUrl,
    demoVideoUrl: certificate.demoVideoUrl,
    repositoryUrl: certificate.repositoryUrl,
    issuedAt: certificate.issuedAt,
    expiresAt: certificate.expiresAt,
    student: certificate.user,
    course: certificate.course,
    author: certificate.author,
    badges: certificate.badges,
    reviews: certificate.reviews.map((review) => ({
      ...review,
      reviewerType: review.reviewerType,
    })),
  };
}

export async function getAuthorCourseCertificatesData(
  courseId: string,
  actor: CertificateActor,
): Promise<
  | { status: "ok"; data: AuthorCourseCertificatesData }
  | { status: "forbidden" }
  | { status: "not_found" }
> {
  const prisma = getPrismaClient();
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      ...(actor.role === UserRole.ADMIN ? {} : { authorId: actor.userId }),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      authorId: true,
    },
  });

  if (!course) {
    const exists = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });

    return exists ? { status: "forbidden" } : { status: "not_found" };
  }

  const [submissions, issuedCertificates] = await Promise.all([
    prisma.certificateSubmission.findMany({
      where: { courseId },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.certificate.findMany({
      where: {
        courseId,
        status: CertificateStatus.ISSUED,
      },
      select: {
        score: true,
      },
    }),
  ]);

  const certificates = await prisma.certificate.findMany({
    where: {
      courseId,
      userId: {
        in: submissions.map((submission) => submission.userId),
      },
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      certificateId: true,
      userId: true,
      type: true,
      status: true,
      score: true,
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          feedback: true,
        },
      },
    },
  });

  const certificateMap = new Map(
    certificates.map((certificate) => [
      `${certificate.userId}:${certificate.type}`,
      certificate,
    ]),
  );

  return {
    status: "ok",
    data: {
      course,
      metrics: {
        totalSubmissions: submissions.length,
        pendingSubmissions: submissions.filter(
          (submission) =>
            submission.status === CertificateSubmissionStatus.SUBMITTED ||
            submission.status === CertificateSubmissionStatus.NEEDS_REVISION,
        ).length,
        issuedCertificates: issuedCertificates.length,
        averageScore: issuedCertificates.length
          ? Math.round(
              issuedCertificates.reduce(
                (sum, certificate) => sum + certificate.score,
                0,
              ) / issuedCertificates.length,
            )
          : 0,
      },
      submissions: submissions.map((submission) => {
        const certificate =
          certificateMap.get(`${submission.userId}:${CertificateType.VERIFIED_SKILL}`) ??
          certificateMap.get(`${submission.userId}:${CertificateType.EXPERT_REVIEWED}`) ??
          null;

        return {
          id: submission.id,
          status: submission.status,
          projectTitle: submission.projectTitle,
          projectDescription: submission.projectDescription,
          projectUrl: submission.projectUrl,
          demoVideoUrl: submission.demoVideoUrl,
          repositoryUrl: submission.repositoryUrl,
          files: submission.files,
          createdAt: submission.createdAt,
          updatedAt: submission.updatedAt,
          student: submission.user,
          certificate: certificate
            ? {
                id: certificate.id,
                certificateId: certificate.certificateId,
                type: certificate.type,
                status: certificate.status,
                score: certificate.score,
                level: getCertificateLevel(certificate.score),
                latestFeedback: certificate.reviews[0]?.feedback ?? null,
              }
            : null,
        };
      }),
    },
  };
}

export async function getAdminCertificates(): Promise<AdminCertificateRow[]> {
  const prisma = getPrismaClient();
  const certificates = await prisma.certificate.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
        },
      },
      author: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return certificates.map((certificate) => ({
    id: certificate.id,
    certificateId: certificate.certificateId,
    type: certificate.type,
    typeLabel: getCertificateTypeLabel(certificate.type),
    status: certificate.status,
    statusLabel: getCertificateStatusLabel(certificate.status),
    title: certificate.title,
    score: certificate.score,
    level: getCertificateLevel(certificate.score),
    issuedAt: certificate.issuedAt,
    student: certificate.user,
    course: certificate.course,
    author: certificate.author,
  }));
}
