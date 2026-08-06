import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { Bot, MessageSquarePlus, Stethoscope } from "lucide-react";
import { toast } from "sonner";

import { PhoneShell, ZoneHeader } from "@/components/moneray/PhoneShell";
import { supabase } from "@/integrations/supabase/client";
import {
  categoryLabel,
  isCategory,
  isMode,
  modeLabel,
  thaiDateTime,
  zoneFor,
  type Category,
  type Mode,
} from "@/lib/moneray";

export const Route = createFileRoute("/_authenticated/health/$category/$mode")({
  component: ModePage,
});

function ModePage() {
  const params = Route.useParams();
  if (!isCategory(params.category) || !isMode(params.mode)) throw notFound();
  const category: Category = params.category;
  const mode: Mode = params.mode;


  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", category, mode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("category", category)
        .eq("mode", mode)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function startNew(channel: "bot" | "doctor") {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        category,
        mode,
        channel,
        title: `${modeLabel[mode]} • ${channel === "bot" ? "แชตบอต" : "แพทย์"}`,
      })
      .select("id")
      .single();
    if (error || !data) {
      toast.error("เริ่มการสนทนาไม่สำเร็จ");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    navigate({ to: "/chat/$threadId", params: { threadId: data.id } });
  }

  return (
    <PhoneShell className={zoneFor(category, mode)}>
      <ZoneHeader
        title={modeLabel[mode]}
        subtitle={`ด้าน${categoryLabel[category]}`}
        backTo="/health/$category"
      />
      <div className="space-y-5 px-5 pt-6">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => startNew("doctor")}
            className="flex flex-col items-center gap-3 rounded-2xl bg-[var(--zone)] py-8 text-[var(--zone-foreground)]"
          >
            <Stethoscope className="size-14" strokeWidth={2.5} />
            <span className="text-2xl font-bold">สนทนากับแพทย์</span>
          </button>
          <button
            onClick={() => startNew("bot")}
            className="flex flex-col items-center gap-3 rounded-2xl border-4 border-[var(--zone)] bg-[var(--zone-soft)] py-8"
          >
            <Bot className="size-14" strokeWidth={2.5} />
            <span className="text-2xl font-bold">สนทนากับแชตบอต</span>
          </button>
        </div>

        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <MessageSquarePlus className="size-7" /> ประวัติการสนทนา
        </h2>
        {conversations.length === 0 ? (
          <p className="text-xl text-muted-foreground">
            ยังไม่มีประวัติการสนทนาในหัวข้อนี้ กดปุ่มด้านบนเพื่อเริ่มใหม่
          </p>
        ) : (
          <ul className="space-y-3">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => navigate({ to: "/chat/$threadId", params: { threadId: c.id } })}
                  className="w-full rounded-2xl border-2 border-input p-5 text-left"
                >
                  <p className="text-xl font-bold">{c.title}</p>
                  <p className="text-lg text-muted-foreground">
                    คุยล่าสุด {thaiDateTime(c.updated_at)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PhoneShell>
  );
}
