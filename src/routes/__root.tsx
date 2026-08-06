import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-5xl font-bold text-foreground">ไม่พบหน้านี้</h1>
        <p className="mt-3 text-xl text-muted-foreground">
          หน้าที่คุณกำลังค้นหาไม่มีอยู่ หรือถูกย้ายไปแล้ว
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-4 text-xl font-bold text-primary-foreground"
          >
            กลับหน้าแรก
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-foreground">โหลดหน้านี้ไม่สำเร็จ</h1>
        <p className="mt-2 text-xl text-muted-foreground">
          เกิดข้อผิดพลาดบางอย่าง ลองใหม่อีกครั้งได้เลย
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-4 text-xl font-bold text-primary-foreground"
          >
            ลองอีกครั้ง
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-2xl border-2 border-input bg-background px-6 py-4 text-xl font-bold"
          >
            กลับหน้าแรก
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Moneray — แอปดูแลสุขภาพกายและสุขภาพจิต" },
      {
        name: "description",
        content:
          "Moneray ช่วยดูแลสุขภาพประจำวัน เตือนกินยา นัดพบแพทย์ ปรึกษาแพทย์และแชตบอต พร้อมพิมพ์ใบสั่งยาออนไลน์",
      },
      { name: "author", content: "Moneray" },
      { property: "og:title", content: "Moneray — แอปดูแลสุขภาพกายและสุขภาพจิต" },
      {
        property: "og:description",
        content: "ดูแลสุขภาพประจำวัน ปรึกษาแพทย์ ติดตามยา และพิมพ์ใบสั่งยาได้เอง",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient, router]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
