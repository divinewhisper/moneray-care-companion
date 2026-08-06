import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";

import { Logo } from "@/components/moneray/Logo";
import { PhoneShell } from "@/components/moneray/PhoneShell";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบ Moneray — ดูแลสุขภาพกายและสุขภาพจิต" },
      {
        name: "description",
        content:
          "ลงทะเบียนหรือเข้าสู่ระบบ Moneray ด้วยอีเมล Google หรือ Apple เพื่อดูแลสุขภาพประจำวันของคุณ",
      },
      { property: "og:title", content: "เข้าสู่ระบบ Moneray" },
      {
        property: "og:description",
        content: "ลงทะเบียนด้วยอีเมล Google หรือ Apple เพื่อเริ่มดูแลสุขภาพกับ Moneray",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          toast.success("ส่งอีเมลแจ้งเตือนการลงทะเบียนแล้ว กรุณาเปิดอีเมลเพื่อยืนยัน");
          return;
        }
        navigate({ to: "/onboarding", replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/home", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ดำเนินการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function social(provider: "google" | "apple") {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/home", replace: true });
  }

  return (
    <PhoneShell>
      <div className="bg-topbar px-5 pt-8 pb-10 text-topbar-foreground">
        <div className="flex items-center gap-4">
          <Logo className="h-20 w-20 bg-white" />
          <div>
            <h1 className="text-4xl font-bold">Moneray</h1>
            <p className="text-xl opacity-90">ดูแลสุขภาพกายและสุขภาพจิต</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-6">
        <div className="flex overflow-hidden rounded-2xl border-2 border-input">
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 py-4 text-xl font-bold ${mode === "signup" ? "bg-primary text-primary-foreground" : "bg-background"}`}
          >
            ลงทะเบียน
          </button>
          <button
            onClick={() => setMode("signin")}
            className={`flex-1 py-4 text-xl font-bold ${mode === "signin" ? "bg-primary text-primary-foreground" : "bg-background"}`}
          >
            เข้าสู่ระบบ
          </button>
        </div>

        {sent ? (
          <div className="mt-6 rounded-2xl bg-secondary p-5 text-xl">
            เราส่งอีเมลแจ้งเตือนการลงทะเบียนไปที่ <strong>{email}</strong> แล้ว
            กรุณาเปิดอีเมลและกดยืนยันเพื่อเข้าใช้งาน
          </div>
        ) : (
          <form onSubmit={handleEmail} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xl font-semibold">อีเมล</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="mt-2 w-full rounded-2xl border-2 border-input bg-background px-4 py-4 text-xl"
              />
            </label>
            <label className="block">
              <span className="text-xl font-semibold">รหัสผ่าน</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                className="mt-2 w-full rounded-2xl border-2 border-input bg-background px-4 py-4 text-xl"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-topbar px-4 py-5 text-2xl font-bold text-topbar-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-6 animate-spin" /> : <Mail className="size-6" />}
              {mode === "signup" ? "ลงทะเบียนด้วยอีเมล" : "เข้าสู่ระบบ"}
            </button>
          </form>
        )}

        <p className="mt-7 text-center text-xl text-muted-foreground">หรือใช้บัญชีอื่น</p>
        <div className="mt-3 space-y-3">
          <button
            onClick={() => social("google")}
            disabled={busy}
            className="w-full rounded-2xl border-2 border-input bg-background px-4 py-5 text-xl font-bold disabled:opacity-60"
          >
            ดำเนินการต่อด้วย Google
          </button>
          <button
            onClick={() => social("apple")}
            disabled={busy}
            className="w-full rounded-2xl border-2 border-input bg-background px-4 py-5 text-xl font-bold disabled:opacity-60"
          >
            ดำเนินการต่อด้วย Apple ID
          </button>
        </div>

        <a
          href="tel:1669"
          className="mt-8 block rounded-2xl bg-mind px-4 py-5 text-center text-2xl font-bold text-mind-foreground"
        >
          โทรฉุกเฉิน 1669
        </a>
      </div>
    </PhoneShell>
  );
}
