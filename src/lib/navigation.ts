export type PublicNavItem = {
  title: string;
  href: string;
};

export type DashboardIconKey =
  | "layout-dashboard"
  | "book-open"
  | "bot"
  | "compass"
  | "receipt"
  | "shopping-bag"
  | "square-pen"
  | "shield-check"
  | "users"
  | "award";

export type DashboardNavItem = {
  title: string;
  href: string;
  icon: DashboardIconKey;
};

export const publicNavigation: PublicNavItem[] = [
  { title: "Гайды", href: "/guides" },
  { title: "Стартовый набор", href: "/free" },
  { title: "Телеграм", href: "/telegram" },
  { title: "Буткемп", href: "/bootcamp" },
  { title: "Авторам", href: "/authors" },
  { title: "Цены", href: "/pricing" },
];

export const dashboardNavigation = {
  author: [
    { title: "Обзор", href: "/author", icon: "layout-dashboard" },
    { title: "Новый курс", href: "/author/courses/new", icon: "square-pen" },
    { title: "Витрина", href: "/courses", icon: "book-open" },
  ],
  student: [
    { title: "Обучение", href: "/learn", icon: "compass" },
    { title: "Курсы", href: "/courses", icon: "book-open" },
    { title: "Сообщество", href: "/learn", icon: "users" },
  ],
  admin: [
    { title: "Обзор", href: "/admin", icon: "layout-dashboard" },
    { title: "Курсы", href: "/admin/courses", icon: "book-open" },
    { title: "Модерация", href: "/admin/moderation", icon: "shield-check" },
    { title: "Пользователи", href: "/admin/users", icon: "users" },
    { title: "Заказы", href: "/admin/orders", icon: "receipt" },
    { title: "Сертификаты", href: "/admin/certificates", icon: "award" },
  ],
} as const;
