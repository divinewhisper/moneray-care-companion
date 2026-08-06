import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  Brain,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Package,
  Phone,
  Pill,
  Search,
  CalendarCheck,
} from "lucide-react";

import { Logo } from "@/components/moneray/Logo";
import { PhoneShell } from "@/components/moneray/PhoneShell";
import { supabase } from "@/integrations/supabase/client";
import { thaiDate, thaiDateTime } from "@/lib/moneray";

export const Route = createFileRoute("/_authenticated/home")({
  component: HomePage,
});

const DIRECTORY = [
  { type: "doctor", name: "นพ. สมชาย ใจดี", detail: "อายุรกรรมทั่วไป • โรงพยาบาลรามา" },
  { type: "doctor", name: "พญ. รัตนา สุขใจ", detail: "จิตเวชศาสตร์ • โรงพยาบาลศิริราช" },
  { type: "doctor", name: "นพ. ธนกร พงษ์ทอง", detail: "กายภาพบำบัด • คลินิกสุขภาพดี" },
  { type: "doctor", name: "พญ. อรพิน วงศ์งาม", detail: "โรคหัวใจ • โรงพยาบาลจุฬาฯ" },
  { type: "article", name: "กินยาความดันให้ถูกเวลา", detail: "บทความสุขภาพกาย • อ่าน 4 นาที" },
  { type: "article", name: "5 ท่ากายภาพบำบัดสำหรับผู้สูงอายุ", detail: "บทความสุขภาพกาย • อ่าน 6 นาที" },
  { type: "article", name: "คลายความเหงาในวัยเกษียณ", detail: "บทความสุขภาพจิต • อ่าน 5 นาที" },
  { type: "article", name: "นอนหลับดีขึ้นด้วย 3 วิธีง่ายๆ", detail: "บทความสุขภาพจิต • อ่าน 3 นาที" },
];

function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const notified = useRef<Set<string>>(new Set());

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: meds = [] } = useQuery({
    queryKey: ["medications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medications")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: appointment } = useQuery({
    queryKey: ["next-appointment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ["shipments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile && profile.onboarded === false) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [profile, navigate]);

  // แจ้งเตือนเมื่อถึงเวลารับประทานยา / ทำกายภาพบำบัด
  useEffect(() => {
    if (meds.length === 0) return;
    const check = () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      for (const med of meds) {
        for (const time of med.times ?? []) {
          if (time !== hhmm) continue;
          const key = `${med.id}-${time}-${now.toDateString()}`;
          if (notified.current.has(key)) continue;
          notified.current.add(key);
          toast(`ถึงเวลา ${med.name}`, {
            description: `${med.dose || "ตามที่แพทย์สั่ง"} • เวลา ${time}`,
            duration: 20000,
          });
        }
      }
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [meds]);

  const results =
    query.trim().length > 0
      ? DIRECTORY.filter((d) => (d.name + d.detail).toLowerCase().includes(query.trim().toLowerCase()))
      : [];

  const showName = profile?.show_name !== false;
  const showContact = profile?.show_contact !== false;
  const fullName = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();

  async function toggleName() {
    if (!profile) return;
    await supabase.from("profiles").update({ show_name: !showName }).eq("id", profile.id);
    void navigate({ to: "/home" });
    window.location.reload();
  }

  return (
    <PhoneShell>
      {/* แถบบนสีน้ำเงิน: ข้อมูลผู้ใช้ + ค้นหา */}
      <header className="bg-topbar px-5 pt-6 pb-7 text-topbar-foreground">
        <div className="flex items-center justify-between gap-3">
          <Link to="/account" className="flex min-w-0 flex-1 items-center gap-3">
            <div className="min-w-0">
              <p className="text-lg opacity-80">สวัสดี</p>
              <p className="truncate text-3xl font-bold">
                {showName ? fullName || "ผู้ใช้ Moneray" : "ซ่อนชื่อไว้"}
              </p>
              {showContact && showName ? (
                <p className="truncate text-lg opacity-90">{profile?.phone}</p>
              ) : null}
            </div>
            <ChevronRight className="size-7 shrink-0 opacity-80" />
          </Link>
          <button
            onClick={toggleName}
            aria-label={showName ? "ปิดการแสดงชื่อ" : "แสดงชื่อ"}
            className="rounded-xl bg-white/20 p-3"
          >
            {showName ? <Eye className="size-7" /> : <EyeOff className="size-7" />}
          </button>
          <Logo className="h-12 w-12 shrink-0 bg-white" />
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
          <Search className="size-7 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาแพทย์ หรือบทความสุขภาพ"
            className="w-full bg-transparent text-xl text-foreground outline-none"
          />
        </div>
      </header>

      {results.length > 0 ? (
        <section className="mx-5 -mt-3 rounded-2xl border-2 border-input bg-card p-3 shadow-sm">
          {results.map((r) => (
            <div key={r.name} className="border-b border-border px-2 py-3 last:border-0">
              <p className="text-xl font-bold">{r.name}</p>
              <p className="text-lg text-muted-foreground">{r.detail}</p>
            </div>
          ))}
        </section>
      ) : null}

      <main className="space-y-5 px-5 pt-6">
        {/* การดูแลสุขภาพประจำวัน — แถบยาวเดี่ยว */}
        <Link
          to="/medications"
          className="block rounded-2xl border-4 border-primary bg-secondary p-5"
        >
          <div className="flex items-center gap-3">
            <Pill className="size-9 text-topbar" />
            <h2 className="text-3xl font-bold">การดูแลสุขภาพประจำวัน</h2>
          </div>
          {meds.length === 0 ? (
            <p className="mt-2 text-xl text-muted-foreground">
              ยังไม่มีรายการ กดที่นี่เพื่อเพิ่มยาหรือกิจกรรมกายภาพบำบัด
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {meds.slice(0, 3).map((m) => (
                <li key={m.id} className="text-xl">
                  <span className="font-bold">{m.name}</span>
                  {m.dose ? <span> — {m.dose}</span> : null}
                  <span className="block text-lg text-muted-foreground">
                    เวลา {(m.times ?? []).join(", ") || "ยังไม่กำหนด"}
                  </span>
                </li>
              ))}
              {meds.length > 3 ? (
                <li className="text-lg text-muted-foreground">และอีก {meds.length - 3} รายการ</li>
              ) : null}
            </ul>
          )}
        </Link>

        {/* เลือกบริการ — UI ใหญ่ที่สุด ซ้าย-ขวา */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            to="/health/$category"
            params={{ category: "body" }}
            className="flex flex-col items-center gap-3 rounded-2xl bg-body py-8 text-body-foreground"
          >
            <Activity className="size-16" strokeWidth={2.5} />
            <span className="text-3xl font-bold">สุขภาพกาย</span>
          </Link>
          <Link
            to="/health/$category"
            params={{ category: "mind" }}
            className="flex flex-col items-center gap-3 rounded-2xl bg-mind py-8 text-mind-foreground"
          >
            <Brain className="size-16" strokeWidth={2.5} />
            <span className="text-3xl font-bold">สุขภาพจิต</span>
          </Link>
        </div>

        {/* นัดพบแพทย์ครั้งถัดไป */}
        <section className="rounded-2xl border-2 border-input bg-card p-5">
          <div className="flex items-center gap-3">
            <CalendarCheck className="size-8 text-topbar" />
            <h2 className="text-2xl font-bold">นัดพบแพทย์ครั้งถัดไป</h2>
          </div>
          {appointment ? (
            <div className="mt-3 text-xl">
              <p className="font-bold">{appointment.doctor_name}</p>
              <p className="text-lg text-muted-foreground">
                {appointment.specialty} {appointment.location ? `• ${appointment.location}` : ""}
              </p>
              <p className="mt-1">{thaiDateTime(appointment.scheduled_at)}</p>
            </div>
          ) : (
            <p className="mt-2 text-xl text-muted-foreground">ยังไม่มีนัดหมาย</p>
          )}
        </section>

        {/* ติดตามพัสดุยา */}
        <section className="rounded-2xl border-2 border-input bg-card p-5">
          <div className="flex items-center gap-3">
            <Package className="size-8 text-topbar" />
            <h2 className="text-2xl font-bold">ติดตามพัสดุยา</h2>
          </div>
          {shipments.length === 0 ? (
            <p className="mt-2 text-xl text-muted-foreground">ไม่มีพัสดุที่กำลังจัดส่ง</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {shipments.map((s) => (
                <li key={s.id} className="rounded-xl bg-secondary p-4 text-xl">
                  <p className="font-bold">{s.item_summary || "พัสดุยารักษา"}</p>
                  <p className="text-lg">
                    {s.carrier} • เลขติดตาม {s.tracking_number}
                  </p>
                  <p className="text-lg text-muted-foreground">
                    สถานะ: {statusLabel(s.status)}
                    {s.eta ? ` • ถึงประมาณ ${thaiDate(s.eta)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {profile?.address && showContact ? (
            <p className="mt-3 text-lg text-muted-foreground">จัดส่งที่: {profile.address}</p>
          ) : null}
        </section>

        <Link
          to="/prescriptions"
          className="flex items-center justify-between rounded-2xl border-2 border-input bg-card p-5"
        >
          <span className="flex items-center gap-3 text-2xl font-bold">
            <FileText className="size-8 text-topbar" />
            ใบสั่งยาออนไลน์
          </span>
          <ChevronRight className="size-8" />
        </Link>

        {/* เบอร์ฉุกเฉิน */}
        <a
          href="tel:1669"
          className="flex items-center justify-center gap-3 rounded-2xl bg-destructive px-4 py-6 text-3xl font-bold text-destructive-foreground"
        >
          <Phone className="size-9" />
          โทรฉุกเฉิน 1669
        </a>
      </main>
    </PhoneShell>
  );
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    packing: "กำลังจัดยา",
    shipped: "กำลังจัดส่ง",
    out_for_delivery: "พนักงานกำลังนำส่ง",
    delivered: "จัดส่งสำเร็จ",
  };
  return map[status] ?? status;
}
