import { createFileRoute } from "@tanstack/react-router";

import { isCategory, isMode, categoryLabel, modeLabel } from "@/lib/moneray";

type Body = {
  messages?: { role: string; content: string }[];
  category?: string;
  mode?: string;
};

function systemPrompt(category: string, mode: string) {
  const base =
    "คุณคือผู้ช่วยสุขภาพของแอปพลิเคชัน Moneray ตอบเป็นภาษาไทยที่สุภาพ อ่านง่าย เหมาะกับผู้สูงอายุ ใช้ประโยคสั้น " +
    "ไม่ใช้ศัพท์แพทย์ที่ยาก ถามอาการเพิ่มทีละ 1-2 ข้อ และย้ำเสมอว่าคำแนะนำนี้ไม่ใช่การวินิจฉัยแทนแพทย์ " +
    "หากพบอาการรุนแรงหรือฉุกเฉิน ให้แนะนำโทร 1669 ทันที";
  const ctx = `ขณะนี้ผู้ใช้อยู่ในบริการด้าน ${categoryLabel[category as "body"]} หัวข้อ ${modeLabel[mode as "diagnose"]}`;
  const mind =
    category === "mind"
      ? " แทรกคำชมและคำให้กำลังใจอย่างเป็นธรรมชาติในบทสนทนาทุกครั้ง เช่น ชื่นชมที่ผู้ใช้กล้าเล่าความรู้สึก และให้กำลังใจว่าเขาทำได้ดีแล้ว"
      : "";
  return `${base} ${ctx}.${mind}`;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as Body;
        const category = body.category ?? "body";
        const mode = body.mode ?? "diagnose";
        if (!isCategory(category) || !isMode(mode) || !Array.isArray(body.messages)) {
          return new Response(JSON.stringify({ error: "คำขอไม่ถูกต้อง" }), { status: 400 });
        }
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) {
          return new Response(JSON.stringify({ error: "ระบบผู้ช่วยยังไม่พร้อมใช้งาน" }), {
            status: 500,
          });
        }

        const history = body.messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(-24)
          .map((m) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3.5-flash",
            messages: [{ role: "system", content: systemPrompt(category, mode) }, ...history],
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          console.error(`AI gateway error [${res.status}]: ${text}`);
          return new Response(JSON.stringify({ error: "ผู้ช่วยตอบไม่สำเร็จ กรุณาลองอีกครั้ง" }), {
            status: 502,
          });
        }
        const data = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const reply = data.choices?.[0]?.message?.content ?? "ขออภัย ยังไม่สามารถตอบได้ในขณะนี้";
        return Response.json({ reply });
      },
    },
  },
});
