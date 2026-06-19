import { UserRole } from "@prisma/client";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Search, ShieldCheck, UserCog, Users } from "lucide-react";
import { Breadcrumbs } from "@/components/premium/breadcrumbs";
import { EmptyState } from "@/components/premium/empty-state";
import { PremiumCard } from "@/components/premium/premium-card";
import { SectionHeader } from "@/components/premium/section-header";
import { Badge } from "@/components/ui/badge";
import { updateAdminUserRole } from "@/server/admin/actions";
import { getAdminUsers } from "@/server/admin/queries";
import { getServerAuthSession } from "@/server/auth/session";

type AdminUsersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseUserRole(value: string | string[] | undefined) {
  const role = getParam(value);
  return role && Object.values(UserRole).includes(role as UserRole)
    ? (role as UserRole)
    : "ALL";
}

const controlClass =
  "h-[52px] rounded-full border border-black/10 bg-[#f8f8f8] px-5 text-sm text-black outline-none transition duration-200 focus:border-[#3d3bff]/40 focus:bg-white";

const actionButtonClass =
  "inline-flex h-10 items-center justify-center rounded-full bg-[#3d3bff] px-4 text-xs font-medium text-white transition duration-200 hover:bg-[#2f2de8] disabled:cursor-not-allowed disabled:bg-[#efefef] disabled:text-black/36";

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const session = await getServerAuthSession();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const query = getParam(resolvedSearchParams.q) ?? "";
  const role = parseUserRole(resolvedSearchParams.role);
  const users = await getAdminUsers({ query, role });

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Админка", href: "/admin" },
          { label: "Пользователи" },
        ]}
      />

      <SectionHeader
        eyebrow="Access control"
        title="Пользователи"
        description="Роли, регистрации и быстрый перевод между student и author без возможности создать admin через UI."
      />

      <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/92">
        <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-black/36" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Поиск по имени или email"
              className="h-[52px] w-full rounded-full border border-black/10 bg-[#f8f8f8] pl-11 pr-5 text-sm outline-none transition duration-200 placeholder:text-black/34 focus:border-[#3d3bff]/40 focus:bg-white"
            />
          </label>

          <select name="role" defaultValue={role} className={controlClass}>
            <option value="ALL">Все роли</option>
            <option value={UserRole.STUDENT}>Student</option>
            <option value={UserRole.AUTHOR}>Author</option>
            <option value={UserRole.ADMIN}>Admin</option>
          </select>

          <button className="h-[52px] rounded-full bg-[#3d3bff] px-6 text-sm font-medium text-white transition duration-200 hover:bg-[#2f2de8]">
            Применить
          </button>
        </form>
      </PremiumCard>

      <PremiumCard padding="lg" className="rounded-[2.3rem] bg-white/92">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-black/46">Найдено пользователей</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-black">
              {users.length}
            </p>
          </div>
          <Badge variant="subtle">No delete in MVP</Badge>
        </div>

        {users.length ? (
          <div className="mt-6 overflow-x-auto rounded-[1.6rem] border border-black/10">
            <table className="w-full min-w-[980px] text-left">
              <thead className="bg-[#f4f4f4] text-xs text-black/44">
                <tr>
                  <th className="px-5 py-4 font-medium">Пользователь</th>
                  <th className="px-5 py-4 font-medium">Роль</th>
                  <th className="px-5 py-4 font-medium">Создан</th>
                  <th className="px-5 py-4 font-medium">Курсы автора</th>
                  <th className="px-5 py-4 font-medium">Покупки ученика</th>
                  <th className="px-5 py-4 font-medium">Действие</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = session?.user?.id === user.id;
                  const isAdmin = user.role === UserRole.ADMIN;
                  const canChangeRole = !isSelf && !isAdmin;

                  return (
                    <tr
                      key={user.id}
                      className="border-t border-black/10 bg-white text-sm transition duration-200 hover:bg-[#fafafa]"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-black">{user.name}</p>
                        <p className="text-black/44">{user.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={user.role === UserRole.ADMIN ? "primary" : "subtle"}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-black/52">
                        {format(user.createdAt, "d MMM yyyy", { locale: ru })}
                      </td>
                      <td className="px-5 py-4 text-black">
                        {user.authoredCoursesCount}
                      </td>
                      <td className="px-5 py-4 text-black">
                        {user.enrollmentsCount}
                      </td>
                      <td className="px-5 py-4">
                        {canChangeRole ? (
                          <form
                            action={updateAdminUserRole.bind(null, user.id)}
                            className="flex items-center gap-2"
                          >
                            <select
                              name="role"
                              defaultValue={user.role}
                              className="h-10 rounded-full border border-black/10 bg-[#f8f8f8] px-3 text-xs text-black outline-none"
                            >
                              <option value={UserRole.STUDENT}>Student</option>
                              <option value={UserRole.AUTHOR}>Author</option>
                            </select>
                            <button className={actionButtonClass}>Сменить</button>
                          </form>
                        ) : (
                          <div className="inline-flex h-10 items-center rounded-full bg-[#f4f4f4] px-4 text-xs font-medium text-black/44">
                            {isSelf ? "Это ты" : "Admin locked"}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-6">
            <EmptyState
              icon={Users}
              title="Пользователей по фильтрам нет"
              description="Попробуй другой запрос или роль."
            />
          </div>
        )}
      </PremiumCard>

      <div className="grid gap-4 md:grid-cols-2">
        <PremiumCard padding="lg" className="rounded-[2rem] bg-[#f8f8f8]">
          <UserCog className="size-5 text-[#3d3bff]" />
          <p className="mt-3 text-sm text-black/52">
            Через UI доступны только роли STUDENT и AUTHOR.
          </p>
        </PremiumCard>
        <PremiumCard padding="lg" className="rounded-[2rem] bg-[#f8f8f8]">
          <ShieldCheck className="size-5 text-[#3d3bff]" />
          <p className="mt-3 text-sm text-black/52">
            Своя роль и admin-аккаунты защищены от изменения.
          </p>
        </PremiumCard>
      </div>
    </div>
  );
}
