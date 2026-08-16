import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, Loader2, Send, Video } from "lucide-react";

import { Logo } from "@/components/moneray/Logo";
import { PhoneShell } from "@/components/moneray/PhoneShell";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabel, modeLabel, zoneFor, type Category, type Mode } from "@/lib/moneray";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  component: ChatPage,
});

function ChatPage() {
  const { threadId } = Route.useParams();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [inCall, setInCall] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversation, isLoading } = useQuery({
    queryKey: ["conversation", threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", threadId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", threadId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
  }, [messages, pending]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [threadId, pending]);

  if (!isLoading && !conversation) throw notFound();

  const category = (conversation?.category ?? "body") as Category;
  const mode = (conversation?.mode ?? "diagnose") as Mode;
  const isBot = conversation?.channel === "bot";

  async function send() {
    const text = input.trim();
    if (!text || !conversation) return;
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;
    setInput("");
    setPending(true);

    const { error } = await supabase.from("messages").insert({
      conversation_id: threadId,
      user_id: user.id,
      role: "user",
      content: text,
    });
    if (error) {
      toast.error("ส่งข้อความไม่สำเร็จ");
      setPending(false);
      return;
    }
    await supabase.from("conversations").update({ title: conversation.title }).eq("id", threadId);
    await queryClient.invalidateQueries({ queryKey: ["messages", threadId] });

    if (!isBot) {
      await supabase.from("messages").insert({
        conversation_id: threadId,
        user_id: user.id,
        role: "assistant",
        content:
          "ระบบได้ส่งข้อความถึงแพทย์เรียบร้อยแล้ว แพทย์จะตอบกลับในเวลาทำการ หากมีอาการรุนแรงกรุณาโทร 1669 ทันที",
      });
      await queryClient.invalidateQueries({ queryKey: ["messages", threadId] });
      setPending(false);
      return;
    }

    try {
      const history = [...messages.map((m) => ({ role: m.role, content: m.content })), {
        role: "user",
        content: text,
      }];
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, category, mode }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) throw new Error(data.error ?? "ตอบกลับไม่สำเร็จ");
      await supabase.from("messages").insert({
        conversation_id: threadId,
        user_id: user.id,
        role: "assistant",
        content: data.reply,
      });
      await queryClient.invalidateQueries({ queryKey: ["messages", threadId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ผู้ช่วยตอบไม่สำเร็จ");
    } finally {
      setPending(false);
    }
  }

  return (
    <PhoneShell fullHeight className={zoneFor(category, mode)}>
      <div className="flex h-full min-h-0 flex-col">
        <header className="shrink-0 bg-[var(--zone)] px-4 pt-5 pb-4 text-[var(--zone-foreground)]">
          <div className="flex items-start justify-between gap-3">
            <Link
              to="/health/$category/$mode"
              params={{ category, mode }}
              className="flex items-center gap-1 rounded-xl bg-white/20 px-3 py-2 text-lg font-semibold"
            >
              <ChevronLeft className="size-6" /> ย้อนกลับ
            </Link>
            {!isBot ? (
              <button
                onClick={() => setInCall(true)}
                className="flex items-center gap-2 rounded-xl bg-white/20 px-3 py-2 text-lg font-semibold"
              >
                <Video className="size-6" /> วิดีโอคอล
              </button>
            ) : null}
            <Logo className="h-11 w-11 bg-white" />
          </div>
          <h1 className="mt-3 text-2xl font-bold">
            {isBot ? "แชตบอต Moneray" : "สนทนากับแพทย์"}
          </h1>
          <p className="text-lg opacity-90">
            {modeLabel[mode]} • ด้าน{categoryLabel[category]}
          </p>
        </header>

        <div
          ref={boxRef}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-background px-4 py-5"
        >
          {messages.length === 0 ? (
            <p className="text-xl text-muted-foreground">
              {isBot
                ? "เล่าอาการหรือความรู้สึกของคุณได้เลย เราพร้อมรับฟัง"
                : "พิมพ์อาการของคุณเพื่อส่งถึงแพทย์ หรือกดวิดีโอคอลเพื่อพูดคุย"}
            </p>
          ) : null}
          {messages.map((m) => (
            <div
              key={m.id}
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-xl ${
                  m.role === "user"
                    ? "bg-[var(--zone)] text-[var(--zone-foreground)]"
                    : "bg-secondary text-foreground"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {pending ? (
            <div className="flex items-center gap-2 text-xl text-muted-foreground">
              <Loader2 className="size-6 animate-spin" /> กำลังพิมพ์...
            </div>
          ) : null}
        </div>

        <div className="flex items-end gap-2 border-t-2 border-border bg-card px-4 py-4">
          <textarea
            ref={inputRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="พิมพ์ข้อความ..."
            className="flex-1 rounded-2xl border-2 border-input px-4 py-3 text-xl"
          />
          <button
            onClick={() => void send()}
            disabled={pending || input.trim().length === 0}
            aria-label="ส่งข้อความ"
            className="rounded-2xl bg-[var(--zone)] p-4 text-[var(--zone-foreground)] disabled:opacity-50"
          >
            <Send className="size-7" />
          </button>
        </div>
      </div>

      {inCall ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[var(--zone)] px-6 text-center text-[var(--zone-foreground)]">
          <Logo className="h-24 w-24 bg-white" />
          <p className="text-3xl font-bold">กำลังเชื่อมต่อวิดีโอคอลกับแพทย์</p>
          <p className="text-xl opacity-90">
            กรุณารอสักครู่ แพทย์จะรับสายเมื่อพร้อม หากเป็นเหตุฉุกเฉินกรุณาโทร 1669
          </p>
          <button
            onClick={() => setInCall(false)}
            className="rounded-2xl bg-white px-8 py-5 text-2xl font-bold text-destructive"
          >
            วางสาย
          </button>
        </div>
      ) : null}
    </PhoneShell>
  );
}
