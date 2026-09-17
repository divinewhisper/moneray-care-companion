import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const registerSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  licenseNumber: z.string().trim().min(1),
  specialty: z.string().trim().min(1),
  hospital: z.string().trim().min(1),
  licenseFilePath: z.string().trim().min(1),
});

/** ลงทะเบียนแพทย์: บันทึกข้อมูลวิชาชีพ + ให้บทบาท doctor (รออนุมัติ) */
export const registerDoctor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => registerSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: profileError } = await supabaseAdmin.from("doctor_profiles").upsert(
      {
        user_id: context.userId,
        email: (context.claims as { email?: string }).email ?? "",
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
        license_number: data.licenseNumber,
        specialty: data.specialty,
        hospital: data.hospital,
        license_file_path: data.licenseFilePath,
        status: "pending",
      },
      { onConflict: "user_id" },
    );
    if (profileError) throw new Error(profileError.message);

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "doctor" }, { onConflict: "user_id,role" });
    if (roleError) throw new Error(roleError.message);

    return { ok: true };
  });

/** ข้อมูลแพทย์ของผู้ใช้ที่ล็อกอิน (null หากยังไม่ได้ลงทะเบียนเป็นแพทย์) */
export const getMyDoctorProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("doctor_profiles")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
});

/** แพทย์เปลี่ยนชื่อ-นามสกุลของตนเอง */
export const updateDoctorName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ firstName: z.string().trim().min(1).max(100), lastName: z.string().trim().min(1).max(100) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("doctor_profiles")
      .update({ first_name: data.firstName, last_name: data.lastName })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** ยืนยันว่าผู้ใช้ที่ล็อกอินเป็นแพทย์ที่อนุมัติแล้ว */
async function requireApprovedDoctor(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("doctor_profiles")
    .select("status, first_name, last_name")
    .eq("user_id", context.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.status !== "approved") throw new Error("บัญชีแพทย์ยังไม่ได้รับการอนุมัติ");
  return data as { status: string; first_name: string; last_name: string };
}

/** รายการคำถามที่ยังไม่มีแพทย์รับ + ที่แพทย์คนนี้รับไว้แล้ว */
export const listPatientThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireApprovedDoctor(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: conversations, error } = await supabaseAdmin
      .from("conversations")
      .select(
        "id, user_id, title, category, mode, channel, created_at, updated_at, assigned_doctor_id, doctor_last_read_at",
      )
      .eq("channel", "doctor")
      .or(`assigned_doctor_id.is.null,assigned_doctor_id.eq.${context.userId}`)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    const list = conversations ?? [];
    if (list.length === 0) return [];

    const ids = list.map((c) => c.id);
    const userIds = [...new Set(list.map((c) => c.user_id))];

    const [{ data: messages }, { data: profiles }] = await Promise.all([
      supabaseAdmin
        .from("messages")
        .select("conversation_id, role, content, created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: true }),
      supabaseAdmin.from("profiles").select("id, first_name, last_name, phone").in("id", userIds),
    ]);

    const nameOf = new Map((profiles ?? []).map((p) => [p.id, p]));

    return list.map((c) => {
      const msgs = (messages ?? []).filter((m) => m.conversation_id === c.id);
      const userMsgs = msgs.filter((m) => m.role === "user");
      const last = msgs[msgs.length - 1];
      const p = nameOf.get(c.user_id);
      return {
        id: c.id,
        title: c.title,
        category: c.category,
        mode: c.mode,
        updatedAt: c.updated_at,
        mine: c.assigned_doctor_id === context.userId,
        patientName: p ? `${p.first_name} ${p.last_name}`.trim() || "ผู้ใช้" : "ผู้ใช้",
        patientPhone: p?.phone ?? "",
        questionCount: userMsgs.length,
        lastQuestion: userMsgs[userMsgs.length - 1]?.content ?? "",
        awaitingReply: last?.role === "user",
      };
    });
  });


/** ข้อความทั้งหมดในหนึ่งการสนทนา (มุมมองแพทย์) */
export const getPatientThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ threadId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requireApprovedDoctor(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: conversation, error } = await supabaseAdmin
      .from("conversations")
      .select("id, user_id, title, category, mode, channel, assigned_doctor_id")
      .eq("id", data.threadId)
      .eq("channel", "doctor")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!conversation) throw new Error("ไม่พบการสนทนานี้");
    if (conversation.assigned_doctor_id && conversation.assigned_doctor_id !== context.userId)
      throw new Error("การสนทนานี้มีแพทย์ท่านอื่นดูแลอยู่แล้ว");


    const [{ data: messages }, { data: profile }] = await Promise.all([
      supabaseAdmin
        .from("messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("profiles")
        .select("first_name, last_name, phone")
        .eq("id", conversation.user_id)
        .maybeSingle(),
    ]);

    return {
      id: conversation.id,
      title: conversation.title,
      category: conversation.category,
      mode: conversation.mode,
      mine: conversation.assigned_doctor_id === context.userId,
      patientName: profile
        ? `${profile.first_name} ${profile.last_name}`.trim() || "ผู้ใช้"
        : "ผู้ใช้",
      patientPhone: profile?.phone ?? "",
      messages: messages ?? [],
    };
  });


/** แพทย์ตอบกลับผู้ป่วย */
export const replyToPatient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ threadId: z.string().uuid(), content: z.string().trim().min(1).max(4000) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const doctor = await requireApprovedDoctor(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: conversation, error } = await supabaseAdmin
      .from("conversations")
      .select("id, user_id, assigned_doctor_id")
      .eq("id", data.threadId)
      .eq("channel", "doctor")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!conversation) throw new Error("ไม่พบการสนทนานี้");
    if (conversation.assigned_doctor_id && conversation.assigned_doctor_id !== context.userId)
      throw new Error("การสนทนานี้มีแพทย์ท่านอื่นดูแลอยู่แล้ว");

    // จับจองการสนทนาแบบกันชน: สำเร็จเฉพาะเมื่อยังว่างหรือเป็นของแพทย์คนนี้
    if (!conversation.assigned_doctor_id) {
      const { data: claimed, error: claimError } = await supabaseAdmin
        .from("conversations")
        .update({ assigned_doctor_id: context.userId })
        .eq("id", conversation.id)
        .is("assigned_doctor_id", null)
        .select("id")
        .maybeSingle();
      if (claimError) throw new Error(claimError.message);
      if (!claimed) throw new Error("การสนทนานี้มีแพทย์ท่านอื่นดูแลอยู่แล้ว");
    }

    const { error: insertError } = await supabaseAdmin.from("messages").insert({
      conversation_id: conversation.id,
      user_id: conversation.user_id,
      role: "assistant",
      content: `นพ. ${doctor.first_name} ${doctor.last_name}: ${data.content}`,
    });
    if (insertError) throw new Error(insertError.message);

    await supabaseAdmin
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation.id);


    return { ok: true };
  });
