"use client";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-140px)] w-full gap-6">
      {children}
    </div>
  );
}
