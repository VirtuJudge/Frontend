export interface NavItem {
  label: string;
  href: string;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/home" },
  { label: "Pricing", href: "/pricing" },
];

export const COMPANY_NAV_ITEMS: NavItem[] = [
  { label: "Data privacy", href: "/company/data-privacy" },
  { label: "Terms and conditions", href: "/company/terms" },
  { label: "Contact us", href: "/company/contact-us" },
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
