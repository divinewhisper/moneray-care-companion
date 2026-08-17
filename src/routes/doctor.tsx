import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Stethoscope } from "lucide-react";

import { Logo } from "@/components/moneray/Logo";
import { PhoneShell } from "@/components/moneray/PhoneShell";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/doctor")({
  head: () => ({
    meta: [
      { title: "สำหรับแพทย์ — เข้าสู่ระบบ Moneray Doctor" },
      {
        name: "description",
        content:
          "พอร์ทัลสำหรับแพทย์ Moneray ลงทะเบียนด้วยการแนบใบประกอบวิชาชีพเวชกรรม เพื่อให้คำปรึกษาผู้ป่วยผ่านแชตและวิดีโอคอล",
      },
      { property: "og:title", content: "Moneray สำหรับแพทย์" },
      {
        property: "og:description",
        content: "ลงทะเบียนแพทย์พร้อมแนบใบประกอบวิชาชีพ แยกจากบัญชีผู้ใช้ทั่วไป",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DoctorAuthPage,
});

function DoctorAuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function goAfterAuth(userId: string) {
    const { data: profile } = await supabase
      .from("doctor_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    navigate({ to: profile ? "/doctor/dashboard" : "/doctor/register", replace: true });
  }

  // ถ้ากลับมาจาก Google/Apple แล้วมี session อยู่ ให้พาไปขั้นตอนถัดไป
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active && data.user) void goAfterAuth(data.user.id);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function socialSignIn(provider: "google" | "apple") {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: `${window.location.origin}/doctor`,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      const { data } = await supabase.auth.getUser();
      if (data.user) await goAfterAuth(data.user.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/doctor` },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          toast.success("ส่งอีเมลยืนยันแล้ว กรุณาเปิดอีเมลเพื่อยืนยันบัญชีแพทย์");
          return;
        }
        navigate({ to: "/doctor/register", replace: true });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { data: profile } = await supabase
          .from("doctor_profiles")
          .select("id")
          .eq("user_id", data.user.id)
          .maybeSingle();
        navigate({ to: profile ? "/doctor/dashboard" : "/doctor/register", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ดำเนินการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PhoneShell className="zone-body-diagnose">
      <div className="bg-[var(--zone)] px-5 pt-8 pb-10 text-[var(--zone-foreground)]">
        <div className="flex items-center gap-4">
          <Logo className="h-20 w-20 bg-white" />
          <div>
            <h1 className="text-4xl font-bold">Moneray</h1>
            <p className="text-xl opacity-90">พอร์ทัลสำหรับแพทย์</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-6">
        <div className="flex items-start gap-3 rounded-2xl bg-secondary p-4 text-xl">
          <Stethoscope className="mt-1 size-7 shrink-0" />
          <p>
            บัญชีแพทย์แยกจากบัญชีผู้ใช้ทั่วไป ต้องแนบไฟล์ใบประกอบวิชาชีพเวชกรรม
            และรอการอนุมัติก่อนเริ่มให้คำปรึกษา
          </p>
        </div>

        <div className="mt-6 flex overflow-hidden rounded-2xl border-2 border-input">
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 py-4 text-xl font-bold ${mode === "signup" ? "bg-[var(--zone)] text-[var(--zone-foreground)]" : "bg-background"}`}
          >
            ลงทะเบียนแพทย์
          </button>
          <button
            onClick={() => setMode("signin")}
            className={`flex-1 py-4 text-xl font-bold ${mode === "signin" ? "bg-[var(--zone)] text-[var(--zone-foreground)]" : "bg-background"}`}
          >
            เข้าสู่ระบบ
          </button>
        </div>

        {sent ? (
          <div className="mt-6 rounded-2xl bg-secondary p-5 text-xl">
            เราส่งอีเมลยืนยันไปที่ <strong>{email}</strong> แล้ว
            กรุณากดยืนยันในอีเมลแล้วกลับมาเข้าสู่ระบบเพื่อกรอกข้อมูลใบประกอบวิชาชีพ
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xl font-semibold">อีเมลแพทย์</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@hospital.com"
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
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--zone)] px-4 py-5 text-2xl font-bold text-[var(--zone-foreground)] disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-6 animate-spin" /> : null}
              {mode === "signup" ? "สร้างบัญชีแพทย์" : "เข้าสู่ระบบแพทย์"}
            </button>
          </form>
        )}

        <div className="mt-7 flex items-center gap-3">
          <span className="h-0.5 flex-1 bg-input" />
          <span className="text-lg text-muted-foreground">หรือ</span>
          <span className="h-0.5 flex-1 bg-input" />
        </div>

        <div className="mt-4 space-y-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => socialSignIn("google")}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-input bg-background px-4 py-5 text-xl font-bold disabled:opacity-60"
          >
            <svg viewBox="0 0 48 48" className="size-7" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.3 17.6 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.5 24.5c0-1.6-.1-2.8-.4-4.1H24v8.4h12.7c-.3 2.1-1.6 5.3-4.7 7.4l7.6 5.9c4.5-4.2 6.9-10.3 6.9-17.6z"
              />
              <path
                fill="#FBBC05"
                d="M10.4 28.7A14.6 14.6 0 019.6 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 000 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.5 0 11.9-2.1 15.6-5.8l-7.6-5.9c-2 1.4-4.8 2.4-8 2.4-6.4 0-11.7-3.8-13.6-9.9l-7.8 6.1C6.5 42.6 14.6 48 24 48z"
              />
            </svg>
            ดำเนินการต่อด้วย Google
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => socialSignIn("apple")}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-input bg-background px-4 py-5 text-xl font-bold disabled:opacity-60"
          >
            <svg viewBox="0 0 384 512" className="size-7 fill-foreground" aria-hidden="true">
              <path d="M318.7 268c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-36.6-2.8-76.6 21.4-91.2 21.4-15.5 0-51-20.3-78.6-20.3C61.4 141 12 184.6 12 271.7c0 26.9 4.9 54.7 14.8 83.3 13.2 37.6 46.3 106 90.9 104.6 23.3-.6 39.8-16.6 70.1-16.6 29.4 0 44.7 16.6 70.7 16.6 45-.6 75-62.5 88.3-100.2-59.9-28.2-58.1-83.1-58.1-91.4zM255.7 90.7c17.6-21.4 26.9-45.6 24.7-73.9-25.9 1.6-49.8 14.2-67.2 34.4-16.9 19.3-27 43.1-24.8 70.4 27.8 2.1 51.2-11.2 67.3-30.9z" />
            </svg>
            ดำเนินการต่อด้วย Apple
          </button>
        </div>

        <Link
          to="/"
          className="mt-8 block rounded-2xl border-2 border-input px-4 py-5 text-center text-xl font-bold"
        >
          ฉันเป็นผู้ใช้ทั่วไป
        </Link>
      </div>
    </PhoneShell>
  );
}
