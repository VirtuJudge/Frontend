import { ReactNode } from "react";

export default function AuthContainer({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 w-full max-w-125 mx-auto mb-10">
      {children}
    </div>
  );
}
