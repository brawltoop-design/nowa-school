import Link from "next/link";
import { CertificateStatus } from "@prisma/client";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  ArrowUpRight,
  Award,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Breadcrumbs } from "@/components/premium/breadcrumbs";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { StatCard } from "@/components/premium/stat-card";
import { Badge } from "@/components/ui/badge";
import { updateCertificateStatus } from "@/server/certificates/actions";
import { getAdminCertificates } from "@/server/certificates/queries";

function statusTone(status: CertificateStatus) {
  return status === CertificateStatus.ISSUED ? "primary" : "subtle";
}

export default async function AdminCertificatesPage() {
  const certificates = await getAdminCertificates();
  const issued = certificates.filter(
    (certificate) => certificate.status === CertificateStatus.ISSUED,
  ).length;
  const pending = certificates.filter(
    (certificate) => certificate.status === CertificateStatus.PENDING,
  ).length;
  const revoked = certificates.filter(
    (certificate) => certificate.status === CertificateStatus.REVOKED,
  ).length;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Админка", href: "/admin" },
          { label: "Сертификаты" },
        ]}
      />

      <SectionHeader
        eyebrow="Certificates"
        title="nowa school Verified Skills registry"
        description="Все certificates, статусы, публичные verification pages и действия revoke/restore."
      />

      <div className="grid gap-5 md:grid-cols-4">
        <StatCard
          icon={Award}
          label="Всего"
          value={String(certificates.length)}
          description="records в registry"
        />
        <StatCard
          icon={ShieldCheck}
          label="Issued"
          value={String(issued)}
          description="активные credentials"
        />
        <StatCard
          icon={RotateCcw}
          label="Pending"
          value={String(pending)}
          description="ждут проверки"
        />
        <StatCard
          icon={ShieldAlert}
          label="Revoked"
          value={String(revoked)}
          description="отозванные"
        />
      </div>

      <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/94">
        <div className="overflow-x-auto rounded-[1.5rem] border border-black/10">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-[#f4f4f4] text-xs text-black/44">
              <tr>
                <th className="px-5 py-4 font-medium">Certificate</th>
                <th className="px-5 py-4 font-medium">Student</th>
                <th className="px-5 py-4 font-medium">Course</th>
                <th className="px-5 py-4 font-medium">Score</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium">Issued</th>
                <th className="px-5 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((certificate) => (
                <tr
                  key={certificate.id}
                  className="border-t border-black/10 bg-white text-sm transition hover:bg-[#fafafa]"
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-black">{certificate.title}</p>
                    <p className="text-black/46">{certificate.certificateId}</p>
                    <p className="mt-1 text-xs text-black/40">
                      {certificate.typeLabel}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-black">
                      {certificate.student.name}
                    </p>
                    <p className="text-black/46">{certificate.student.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-black">
                      {certificate.course.title}
                    </p>
                    <p className="text-black/46">{certificate.author.name}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-2xl font-semibold tracking-tight text-black">
                      {certificate.score}
                    </p>
                    <p className="text-black/46">{certificate.level}</p>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={statusTone(certificate.status)}>
                      {certificate.statusLabel}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-black/46">
                    {format(certificate.issuedAt, "d MMM yyyy", { locale: ru })}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <PremiumButton asChild tone="secondary" className="h-10 px-4">
                        <Link href={`/cert/${certificate.certificateId}`}>
                          Verify
                          <ArrowUpRight className="ml-2 size-4" />
                        </Link>
                      </PremiumButton>
                      {certificate.status === CertificateStatus.REVOKED ? (
                        <form
                          action={updateCertificateStatus.bind(
                            null,
                            certificate.id,
                            CertificateStatus.ISSUED,
                          )}
                        >
                          <PremiumButton type="submit" className="h-10 px-4">
                            Restore
                          </PremiumButton>
                        </form>
                      ) : (
                        <form
                          action={updateCertificateStatus.bind(
                            null,
                            certificate.id,
                            CertificateStatus.REVOKED,
                          )}
                        >
                          <PremiumButton
                            type="submit"
                            tone="secondary"
                            className="h-10 px-4"
                          >
                            Revoke
                          </PremiumButton>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PremiumCard>
    </div>
  );
}
