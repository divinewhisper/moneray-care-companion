import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { PhoneShell, ZoneHeader } from "@/components/moneray/PhoneShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/medications")({
  component: MedicationsPage,
});

type Draft = { id?: string; name: string; dose: string; times: string; kind: string; note: string };

const EMPTY: Draft = { name: "", dose: "", times: "08:00", kind: "medicine", note: "" };

function MedicationsPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

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

  async function save() {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error("กรุณากรอกชื่อยาหรือกิจกรรม");
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;
    const times = draft.times
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const payload = {
      user_id: user.id,
      name: draft.name.trim(),
      dose: draft.dose.trim(),
      times,
      kind: draft.kind,
      note: draft.note.trim(),
    };
    const { error } = draft.id
      ? await supabase.from("medications").update(payload).eq("id", draft.id)
      : await supabase.from("medications").insert(payload);
    if (error) {
      toast.error("บันทึกไม่สำเร็จ");
      return;
    }
    setDraft(null);
    await queryClient.invalidateQueries({ queryKey: ["medications"] });
    toast.success("บันทึกเรียบร้อย");
  }

  async function remove(id: string) {
    await supabase.from("medications").delete().eq("id", id);
    await queryClient.invalidateQueries({ queryKey: ["medications"] });
  }

  return (
    <PhoneShell className="zone-body-followup">
      <ZoneHeader
        title="การดูแลสุขภาพประจำวัน"
        subtitle="ยาที่ต้องรับประทาน และกิจกรรมกายภาพบำบัด"
        backTo="/home"
      />
      <div className="space-y-4 px-5 pt-6">
        {meds.map((m) => (
          <div key={m.id} className="rounded-2xl border-2 border-input p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-bold">{m.name}</p>
                <p className="text-xl">{m.dose || "ตามที่แพทย์สั่ง"}</p>
                <p className="text-lg text-muted-foreground">
                  {m.kind === "therapy" ? "กายภาพบำบัด" : "ยารักษา"} • เวลา{" "}
                  {(m.times ?? []).join(", ") || "ยังไม่กำหนด"}
                </p>
                {m.note ? <p className="mt-1 text-lg">{m.note}</p> : null}
              </div>
              <button
                onClick={() => remove(m.id)}
                aria-label="ลบรายการ"
                className="rounded-xl bg-secondary p-3"
              >
                <Trash2 className="size-6" />
              </button>
            </div>
            <button
              onClick={() =>
                setDraft({
                  id: m.id,
                  name: m.name,
                  dose: m.dose,
                  times: (m.times ?? []).join(", "),
                  kind: m.kind,
                  note: m.note,
                })
              }
              className="mt-3 w-full rounded-xl bg-[var(--zone)] py-3 text-xl font-bold text-[var(--zone-foreground)]"
            >
              แก้ไขข้อมูล
            </button>
          </div>
        ))}

        {draft ? (
          <div className="space-y-3 rounded-2xl border-4 border-[var(--zone)] p-5">
            <h2 className="text-2xl font-bold">{draft.id ? "แก้ไขรายการ" : "เพิ่มรายการใหม่"}</h2>
            <label className="block">
              <span className="text-xl font-semibold">ชื่อยา / กิจกรรม</span>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="mt-2 w-full rounded-2xl border-2 border-input px-4 py-4 text-xl"
              />
            </label>
            <label className="block">
              <span className="text-xl font-semibold">ขนาดที่รับประทานต่อครั้ง</span>
              <input
                value={draft.dose}
                placeholder="เช่น 1 เม็ด หลังอาหาร"
                onChange={(e) => setDraft({ ...draft, dose: e.target.value })}
                className="mt-2 w-full rounded-2xl border-2 border-input px-4 py-4 text-xl"
              />
            </label>
            <label className="block">
              <span className="text-xl font-semibold">ช่วงเวลา (คั่นด้วยเครื่องหมาย ,)</span>
              <input
                value={draft.times}
                placeholder="08:00, 12:00, 18:00"
                onChange={(e) => setDraft({ ...draft, times: e.target.value })}
                className="mt-2 w-full rounded-2xl border-2 border-input px-4 py-4 text-xl"
              />
            </label>
            <div className="flex gap-3">
              {(["medicine", "therapy"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setDraft({ ...draft, kind: k })}
                  className={`flex-1 rounded-2xl border-2 py-4 text-xl font-bold ${
                    draft.kind === k
                      ? "border-[var(--zone)] bg-[var(--zone)] text-[var(--zone-foreground)]"
                      : "border-input"
                  }`}
                >
                  {k === "medicine" ? "ยารักษา" : "กายภาพบำบัด"}
                </button>
              ))}
            </div>
            <label className="block">
              <span className="text-xl font-semibold">หมายเหตุ</span>
              <textarea
                rows={2}
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                className="mt-2 w-full rounded-2xl border-2 border-input px-4 py-4 text-xl"
              />
            </label>
            <div className="flex gap-3">
              <button
                onClick={save}
                className="flex-1 rounded-2xl bg-[var(--zone)] py-5 text-xl font-bold text-[var(--zone-foreground)]"
              >
                บันทึก
              </button>
              <button
                onClick={() => setDraft(null)}
                className="flex-1 rounded-2xl border-2 border-input py-5 text-xl font-bold"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setDraft({ ...EMPTY })}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--zone)] py-5 text-2xl font-bold text-[var(--zone-foreground)]"
          >
            <Plus className="size-8" /> เพิ่มรายการ
          </button>
        )}
      </div>
    </PhoneShell>
  );
}
