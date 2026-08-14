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
