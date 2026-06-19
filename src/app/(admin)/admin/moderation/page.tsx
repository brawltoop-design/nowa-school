import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Breadcrumbs } from "@/components/premium/breadcrumbs";
import { EmptyState } from "@/components/premium/empty-state";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { Badge } from "@/components/ui/badge";
import { getAdminModerationQueue } from "@/server/sales-page/queries";

export default async function AdminModerationPage() {
  const queue = await getAdminModerationQueue();

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Админка", href: "/admin" },
          { label: "Модерация" },
        ]}
      />

      <SectionHeader
        eyebrow="Moderation queue"
        title="Sales page moderation"
        description="Очередь страниц, которые ждут review перед публикацией в каталог."
      />

      <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/92">
        {queue.length ? (
          <div className="overflow-x-auto rounded-[1.6rem] border border-black/10">
            <table className="w-full min-w-[960px] text-left">
              <thead className="bg-[#f4f4f4] text-xs text-black/44">
                <tr>
                  <th className="px-5 py-4 font-medium">Курс</th>
                  <th className="px-5 py-4 font-medium">Автор</th>
                  <th className="px-5 py-4 font-medium">Page status</th>
                  <th className="px-5 py-4 font-medium">Submission</th>
                  <th className="px-5 py-4 font-medium">Issues</th>
                  <th className="px-5 py-4 font-medium">Действие</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => (
                  <tr key={item.id} className="border-t border-black/10 text-sm">
                    <td className="px-5 py-4">
                      <p className="font-medium text-black">{item.courseTitle}</p>
                      <p className="text-black/44">{item.courseSlug}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-black">{item.author.name}</p>
                      <p className="text-black/44">{item.author.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={item.pageStatus === "APPROVED" ? "primary" : "subtle"}>
                        {item.pageStatus}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={item.submissionStatus === "APPROVED" ? "primary" : "subtle"}>
                        {item.submissionStatus}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-black/62">
                      {item.issuesCount} issues / {item.highSeverityIssuesCount} high
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/moderation/sales-pages/${item.salesPageId}`}
                        className="inline-flex rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-medium text-black/66 transition duration-200 hover:border-black/14 hover:bg-[#f7f7f7]"
                      >
                        Open review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={ShieldAlert}
            title="Очередь пуста"
            description="Сейчас нет sales pages, ожидающих модерацию."
          />
        )}
      </PremiumCard>
    </div>
  );
}
