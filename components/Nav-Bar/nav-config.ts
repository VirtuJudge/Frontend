export interface NavItem {
  label: string;
  href: string;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/home" },
  { label: "About", href: "/about" },
  { label: "Pricing", href: "/pricing" },
];

export const COMPANY_NAV_ITEMS: NavItem[] = [
  { label: "Our team", href: "/team" },
  { label: "Data privacy", href: "/data-privacy" },
  { label: "Terms and conditions", href: "/terms-and-conditions" },
  { label: "Contacts", href: "/contacts" },
];

export const CTA_NAV_ITEM: NavItem = {
  label: "Try Now!",
  href: "/auth/login",
};

export const NAV_CONTAINER_CLASS =
  "flex items-center justify-between fixed top-4 left-[50%] -translate-x-1/2 px-4 z-50 w-full max-w-360";

export function isRouteActive(currentPath: string, targetPath: string): boolean {
  return currentPath === targetPath;
}

export function isCompanyRouteActive(currentPath: string): boolean {
  return COMPANY_NAV_ITEMS.some((item) => item.href === currentPath);
}
