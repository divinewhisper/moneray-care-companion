import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

import { Logo } from "./Logo";

/** โครงหน้าแอปขนาดหน้าจอโทรศัพท์ พร้อมโลโก้มุมขวาบนทุกหน้า */
export function PhoneShell({
  children,
  className = "",
  fullHeight = false,
}: {
  children: ReactNode;
  className?: string;
  /** ใช้กับหน้าที่ต้องการความสูงพอดีจอ เช่น หน้าแชต (ไม่มีระยะห่างล่าง) */
  fullHeight?: boolean;
}) {
  return (
    <div
      className={`bg-background ${fullHeight ? "h-[100dvh] overflow-hidden" : "min-h-screen"} ${className}`}
    >
      <div
        className={`page-in relative mx-auto w-full max-w-[430px] ${fullHeight ? "h-full" : "pb-16"}`}
      >
        {children}
      </div>
    </div>
  );
}

export function ZoneHeader({
  title,
  subtitle,
  backTo,
}: {
  title: string;
  subtitle?: string;
  backTo: string;
}) {
  return (
    <header className="bg-[var(--zone)] px-4 pt-5 pb-6 text-[var(--zone-foreground)]">
      <div className="flex items-start justify-between gap-3">
        <Link
          to={backTo}
          className="flex items-center gap-1 rounded-xl bg-white/20 px-3 py-2 text-lg font-semibold"
        >
          <ChevronLeft className="size-6" />
          ย้อนกลับ
        </Link>
        <Logo className="h-12 w-12" />
      </div>
      <h1 className="mt-4 text-3xl font-bold">{title}</h1>
      {subtitle ? <p className="mt-1 text-xl opacity-90">{subtitle}</p> : null}
    </header>
  );
}
