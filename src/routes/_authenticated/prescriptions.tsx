import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Printer } from "lucide-react";

import { Logo } from "@/components/moneray/Logo";
import { PhoneShell, ZoneHeader } from "@/components/moneray/PhoneShell";
import { supabase } from "@/integrations/supabase/client";
import { thaiDate } from "@/lib/moneray";

export const Route = createFileRoute("/_authenticated/prescriptions")({
  component: PrescriptionsPage,
});

type Item = { name?: string; dose?: string; amount?: string };

function PrescriptionsPage() {
  const { data: prescriptions = [] } = useQuery({
    queryKey: ["prescriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("*")
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <PhoneShell className="zone-body-diagnose">
      <div className="no-print">
        <ZoneHeader
          title="ใบสั่งยาออนไลน์"
          subtitle="ตรวจสอบและพิมพ์เพื่อไปซื้อยาที่ร้านเภสัชกร"
          backTo="/home"
        />
      </div>

      <div className="space-y-5 px-5 pt-6">
        {prescriptions.length === 0 ? (
          <p className="text-xl text-muted-foreground">
            ยังไม่มีใบสั่งยา เมื่อแพทย์ออกใบสั่งยา รายการจะแสดงที่นี่
          </p>
        ) : null}

        {prescriptions.map((p) => (
          <article key={p.id} className="rounded-2xl border-2 border-input p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">ใบสั่งยาเลขที่ {p.code}</h2>
                <p className="text-lg text-muted-foreground">
                  {p.doctor_name} {p.hospital ? `• ${p.hospital}` : ""}
                </p>
                <p className="text-lg text-muted-foreground">
                  วันที่ออก {thaiDate(p.issued_at)}
                </p>
              </div>
              <Logo className="h-12 w-12" />
            </div>

            <div className="mt-3 border-t-2 border-border pt-3">
              <p className="text-lg text-muted-foreground">ผู้ป่วย</p>
              <p className="text-xl font-bold">
                {profile?.first_name} {profile?.last_name}
              </p>
            </div>

            <ul className="mt-3 space-y-2">
              {((p.items as Item[]) ?? []).map((it, i) => (
                <li key={i} className="rounded-xl bg-secondary p-4 text-xl">
                  <p className="font-bold">{it.name}</p>
                  <p className="text-lg">
                    {it.dose} {it.amount ? `• จำนวน ${it.amount}` : ""}
                  </p>
                </li>
              ))}
            </ul>

            <button
              onClick={() => window.print()}
              className="no-print mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--zone)] py-5 text-2xl font-bold text-[var(--zone-foreground)]"
            >
              <Printer className="size-8" /> พิมพ์ใบสั่งยา
            </button>
          </article>
        ))}
      </div>
    </PhoneShell>
  );
}
