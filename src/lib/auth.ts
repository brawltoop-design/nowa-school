export const roleHomeMap = {
  STUDENT: "/learn",
  AUTHOR: "/author",
  ADMIN: "/admin",
} as const;

export const roleLabelMap = {
  STUDENT: "Ученик",
  AUTHOR: "Автор",
  ADMIN: "Администратор",
} as const;

export function getRoleHome(role: keyof typeof roleHomeMap) {
  return roleHomeMap[role];
}

export function getRoleLabel(role: keyof typeof roleLabelMap) {
  return roleLabelMap[role];
}
