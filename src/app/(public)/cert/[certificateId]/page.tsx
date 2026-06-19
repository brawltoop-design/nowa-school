import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  ArrowUpRight,
  BadgeCheck,
  Code2,
  Download,
  ExternalLink,
  ShieldCheck,
  Video,
} from "lucide-react";
import { notFound } from "next/navigation";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { Badge } from "@/components/ui/badge";
import { getPublicCertificate } from "@/server/certificates/queries";
import {
  getVerificationUrl,
} from "@/server/certificates/utils";

type PublicCertificatePageProps = {
  params: Promise<{ certificateId: string }>;
};

function asStringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asCriteria(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) => {
          if (typeof item !== "object" || item === null || Array.isArray(item)) {
            return null;
          }

          const record = item as Record<string, unknown>;
          const criterion =
            typeof record.criterion === "string"
              ? record.criterion
              : typeof record.title === "string"
                ? record.title
                : "Criteria";

          return {
            criterion,
            description:
              typeof record.description === "string"
                ? record.description
                : typeof record.value === "string"
                  ? record.value
                  : "",
            points:
              typeof record.points === "number" ? record.points : null,
          };
        })
        .filter((item): item is { criterion: string; description: string; points: number | null } =>
          Boolean(item),
        )
    : [];
}

export async function generateMetadata({
  params,
}: PublicCertificatePageProps): Promise<Metadata> {
  const { certificateId } = await params;
  const certificate = await getPublicCertificate(certificateId);

  return {
    title: certificate
      ? `${certificate.title} - ${certificate.student.name}`
      : "Certificate not found",
    description: certificate?.description,
  };
}

export default async function PublicCertificatePage({
  params,
}: PublicCertificatePageProps) {
  const { certificateId } = await params;
  const certificate = await getPublicCertificate(certificateId);

  if (!certificate) {
    notFound();
  }

  const verificationUrl = getVerificationUrl(certificate.certificateId);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=12&data=${encodeURIComponent(
    verificationUrl,
  )}`;
  const issueMonth = certificate.issuedAt.getMonth() + 1;
  const issueYear = certificate.issuedAt.getFullYear();
  const linkedInUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(
    certificate.title,
  )}&organizationName=${encodeURIComponent("nowa school")}&issueYear=${issueYear}&issueMonth=${issueMonth}&certUrl=${encodeURIComponent(
    verificationUrl,
  )}&certId=${encodeURIComponent(certificate.certificateId)}`;
  const skills = asStringList(certificate.skills);
  const criteria = asCriteria(certificate.criteria);
  const isVerified = certificate.status === "ISSUED";

  return (
    <div className="page-section">
      <div className="app-shell space-y-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <PremiumCard
            padding="lg"
            className="rounded-[2.8rem] bg-white/94 shadow-[0_30px_100px_rgba(15,23,42,0.08)]"
          >
            <div className="flex flex-wrap gap-2">
              <Badge variant={isVerified ? "primary" : "subtle"}>
                {certificate.statusLabel}
              </Badge>
              <Badge variant="subtle">{certificate.typeLabel}</Badge>
              <Badge variant="subtle">{certificate.level}</Badge>
            </div>

            <h1 className="mt-6 max-w-5xl text-5xl font-semibold leading-[0.98] tracking-tight text-black sm:text-6xl">
              {certificate.title}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-black/60">
              {certificate.description}
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.7rem] bg-[#f6f7fa] px-5 py-5">
                <p className="text-sm text-black/42">Student</p>
                <p className="mt-2 text-xl font-semibold text-black">
                  {certificate.student.name}
                </p>
              </div>
              <div className="rounded-[1.7rem] bg-[#f6f7fa] px-5 py-5">
                <p className="text-sm text-black/42">Score</p>
                <p className="mt-2 text-3xl font-semibold text-black">
                  {certificate.score}
                </p>
              </div>
              <div className="rounded-[1.7rem] bg-[#f6f7fa] px-5 py-5">
                <p className="text-sm text-black/42">Issued</p>
                <p className="mt-2 text-xl font-semibold text-black">
                  {format(certificate.issuedAt, "d MMM yyyy", { locale: ru })}
                </p>
              </div>
            </div>
          </PremiumCard>

          <PremiumCard
            padding="lg"
            className="rounded-[2.3rem] border-transparent bg-black text-white"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-white/10">
                <ShieldCheck className="size-6 text-[#9ea7ff]" />
              </div>
              <div>
                <p className="text-sm text-white/52">Credential ID</p>
                <p className="font-semibold tracking-tight">
                  {certificate.certificateId}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-[1.7rem] bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeUrl}
                alt={`QR code for ${certificate.certificateId}`}
                className="mx-auto size-48 rounded-2xl"
              />
            </div>

            <div className="mt-6 grid gap-3">
              <PremiumButton
                asChild
                className="h-12 bg-white text-black hover:bg-white/90"
              >
                <Link href={verificationUrl}>
                  Verify
                  <BadgeCheck className="ml-2 size-4" />
                </Link>
              </PremiumButton>
              <PremiumButton
                asChild
                tone="secondary"
                className="h-12 bg-white/10 text-white hover:bg-white/15"
              >
                <Link href={`/cert/${certificate.certificateId}/pdf`}>
                  Download PDF
                  <Download className="ml-2 size-4" />
                </Link>
              </PremiumButton>
              <PremiumButton
                asChild
                tone="secondary"
                className="h-12 bg-white/10 text-white hover:bg-white/15"
              >
                <Link href={linkedInUrl} target="_blank">
                  Add to LinkedIn
                  <ArrowUpRight className="ml-2 size-4" />
                </Link>
              </PremiumButton>
            </div>
          </PremiumCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/94">
            <SectionHeader
              eyebrow="Course"
              title={certificate.course.title}
              description={`Author: ${certificate.author.name}. Track: ${certificate.track}.`}
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <PremiumButton asChild tone="secondary" className="h-12 px-5">
                <Link href={`/courses/${certificate.course.slug}`}>
                  Course page
                  <ArrowUpRight className="ml-2 size-4" />
                </Link>
              </PremiumButton>
              {certificate.projectUrl ? (
                <PremiumButton asChild tone="secondary" className="h-12 px-5">
                  <Link href={certificate.projectUrl} target="_blank">
                    Project
                    <ExternalLink className="ml-2 size-4" />
                  </Link>
                </PremiumButton>
              ) : null}
              {certificate.demoVideoUrl ? (
                <PremiumButton asChild tone="secondary" className="h-12 px-5">
                  <Link href={certificate.demoVideoUrl} target="_blank">
                    Demo video
                    <Video className="ml-2 size-4" />
                  </Link>
                </PremiumButton>
              ) : null}
              {certificate.repositoryUrl ? (
                <PremiumButton asChild tone="secondary" className="h-12 px-5">
                  <Link href={certificate.repositoryUrl} target="_blank">
                    Repository
                    <Code2 className="ml-2 size-4" />
                  </Link>
                </PremiumButton>
              ) : null}
            </div>
          </PremiumCard>

          <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/94">
            <SectionHeader
              eyebrow="Skills"
              title="Проверенные навыки"
              description="Навыки и критерии хранятся в JSON, чтобы позже перейти к Open Badges 3.0."
            />
            <div className="mt-6 flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge key={skill} variant="subtle">
                  {skill}
                </Badge>
              ))}
            </div>
          </PremiumCard>
        </div>

        <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/94">
          <SectionHeader
            eyebrow="Rubric"
            title="Критерии проверки"
            description="Сертификат отражает практическую проверку проекта, а не факт просмотра уроков."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {criteria.map((item) => (
              <div
                key={item.criterion}
                className="rounded-[1.6rem] border border-black/8 bg-[#fbfbfc] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-semibold tracking-tight text-black">
                    {item.criterion}
                  </h3>
                  {item.points ? (
                    <Badge variant="subtle">{item.points} pts</Badge>
                  ) : null}
                </div>
                {item.description ? (
                  <p className="mt-3 text-sm leading-7 text-black/56">
                    {item.description}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </PremiumCard>

        {certificate.badges.length || certificate.reviews.length ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/94">
              <SectionHeader
                eyebrow="Badges"
                title="Open Badge metadata"
                description="Badge metadata уже хранится как JSON-структура для будущей совместимости."
              />
              <div className="mt-6 space-y-3">
                {certificate.badges.map((badge) => (
                  <div
                    key={badge.id}
                    className="rounded-[1.5rem] bg-[#f6f7fa] px-5 py-4"
                  >
                    <p className="font-medium text-black">{badge.title}</p>
                    <p className="mt-1 text-sm text-black/52">
                      {badge.description}
                    </p>
                  </div>
                ))}
              </div>
            </PremiumCard>

            <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/94">
              <SectionHeader
                eyebrow="Reviews"
                title="История проверки"
                description="Feedback автора, эксперта или администратора."
              />
              <div className="mt-6 space-y-3">
                {certificate.reviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-[1.5rem] bg-[#f6f7fa] px-5 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Badge variant="subtle">{review.reviewerType}</Badge>
                      <span className="text-sm text-black/42">
                        score {review.score}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-black/58">
                      {review.feedback}
                    </p>
                  </div>
                ))}
              </div>
            </PremiumCard>
          </div>
        ) : null}
      </div>
    </div>
  );
}
