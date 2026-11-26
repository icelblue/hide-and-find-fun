import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface DailyQuestion { id: string; question: string; options: string[] | null; answered: boolean; my_answer: string | null }

/** One question per day; answering it gives +1 bonus token (validated on the server). */
export function DailyQuestionCard({ onRewarded }: { onRewarded?: () => void }) {
  const [q, setQ] = useState<DailyQuestion | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => supabase.rpc("get_daily_question").then(({ data }) => setQ((data as unknown as DailyQuestion) ?? null));
  useEffect(() => { load(); }, []);
  if (!q) return null;

  const submit = async (answer: string) => {
    if (busy || !answer.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc("answer_daily_question", { _question_id: q.id, _answer: answer });
    setBusy(false);
    if (error) { toast.error(error.message); await load(); return; }
    toast.success("Gràcies! +1 🪙 token extra");
    setQ({ ...q, answered: true, my_answer: answer.trim() });
    onRewarded?.();
  };

  return (
    <Card className="mb-4 glass border-accent/40" aria-label="Pregunta del dia">
      <CardContent className="py-3">
        <p className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">❓ Pregunta del dia · +1 🪙</p>
        <p className="text-sm font-semibold mb-2">{q.question}</p>
        {q.answered ? (
          <p className="text-xs text-muted-foreground">✅ Has respost: <span className="text-foreground">{q.my_answer}</span>. Torna demà per a una altra pregunta!</p>
        ) : q.options ? (
          <div className="flex flex-wrap gap-1.5">
            {q.options.map((o) => (
              <Button key={o} size="sm" variant="outline" className="text-xs h-8" disabled={busy} onClick={() => submit(o)}>{o}</Button>
            ))}
          </div>
        ) : (
          <div className="flex gap-2">
            <Input value={text} maxLength={300} onChange={(e) => setText(e.target.value)} placeholder="La teva resposta..." className="text-sm bg-muted/50" />
            <Button size="sm" disabled={busy || !text.trim()} onClick={() => submit(text)}>Enviar</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
