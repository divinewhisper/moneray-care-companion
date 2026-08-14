import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Stethoscope } from "lucide-react";

import { Logo } from "@/components/moneray/Logo";
import { PhoneShell } from "@/components/moneray/PhoneShell";
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
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/doctor/dashboard", replace: true });
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
