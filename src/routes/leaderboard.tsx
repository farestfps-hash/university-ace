import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Lock, Loader2, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Лидерборд абитуриентов — Join&Acquire" },
      {
        name: "description",
        content:
          "Рейтинг холистических баллов абитуриентов по США, Гонконгу, Казахстану и Европе. Открытые портфолио можно изучить целиком.",
      },
      { property: "og:title", content: "Лидерборд абитуриентов — Join&Acquire" },
      {
        property: "og:description",
        content: "Сравните свой холистический балл с другими абитуриентами по странам.",
      },
    ],
  }),
  component: LeaderboardPage,
});

const TABS = [
  { key: null, label: "Все" },
  { key: "USA", label: "США" },
  { key: "Hong Kong", label: "Гонконг" },
  { key: "Europe", label: "Европа" },
  { key: "Kazakhstan", label: "Казахстан" },
] as const;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Entry = any;

function medal(i: number) {
  return i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
}

function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [country, setCountry] = useState<string | null>(null);
  const [rows, setRows] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Entry | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)("get_leaderboard", {
      _country: country,
    });
    if (!error) setRows((data as Entry[]) ?? []);
    setLoading(false);
  }, [user, country]);

  useEffect(() => {
    void load();
  }, [load]);

  if (authLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Лидерборд доступен участникам</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Войдите, чтобы увидеть рейтинг холистических баллов.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/auth">Войти / Регистрация</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Trophy className="size-5" />
        </span>
        <div>
          <h1 className="text-4xl font-extrabold">Лидерборд</h1>
          <p className="text-sm text-muted-foreground">
            Топ-50 по холистическому баллу. Закрытые профили скрыты замком.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.label}
            onClick={() => setCountry(t.key)}
            className={
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors " +
              (country === t.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-secondary")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          Пока никто не прошёл ИИ-оценку для этого направления. Сделайте её первым на странице
          «ИИ-оценка».
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((r: Entry, i: number) => {
            const mine = r.user_id === user.id;
            return (
              <li
                key={r.user_id}
                className={
                  "surface-card flex items-center gap-4 p-4 " +
                  (mine ? "ring-2 ring-primary/40" : "")
                }
              >
                <span className="w-10 shrink-0 text-center text-lg font-bold">{medal(i)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">
                      {r.is_public ? (r.full_name ?? "Без имени") : "Скрытый профиль"}
                    </span>
                    {!r.is_public && <Lock className="size-3.5 text-muted-foreground" />}
                    {mine && <Badge className="rounded-full">Вы</Badge>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.is_public
                      ? [r.high_school, r.target_major].filter(Boolean).join(" · ") ||
                        "Портфолио открыто"
                      : "Портфолио закрыто владельцем"}
                  </p>
                </div>
                <span className="text-2xl font-extrabold text-primary">
                  {r.holistic_score ?? "—"}
                </span>
                <Button
                  size="sm"
                  variant={r.is_public ? "outline" : "ghost"}
                  className="rounded-full"
                  disabled={!r.is_public}
                  onClick={() => setActive(r)}
                >
                  {r.is_public ? "Профиль" : "Закрыт"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>{active.full_name ?? "Без имени"}</DialogTitle>
                <DialogDescription>
                  {[active.high_school, active.grade_level, active.target_major]
                    .filter(Boolean)
                    .join(" · ")}
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-primary">
                  {active.holistic_score ?? "—"}
                </span>
                <span className="text-sm text-muted-foreground">холистический балл</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                {[
                  ["GPA", active.gpa_unweighted],
                  ["SAT", active.sat_score],
                  ["ACT", active.act_score],
                  ["ЕНТ", active.unt_score],
                  ["NUET", active.nuet_score],
                ]
                  .filter(([, v]) => v !== null && v !== undefined)
                  .map(([k, v]) => (
                    <div key={String(k)} className="rounded-xl bg-secondary px-3 py-2">
                      <p className="text-xs text-muted-foreground">{String(k)}</p>
                      <p className="font-semibold">{String(v)}</p>
                    </div>
                  ))}
              </div>
              {(active.target_countries ?? []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(active.target_countries as string[]).map((c) => (
                    <Badge key={c} variant="secondary" className="rounded-full">
                      {c}
                    </Badge>
                  ))}
                </div>
              )}
              {active.summary && <p className="text-sm text-muted-foreground">{active.summary}</p>}
              {Array.isArray(active.strengths) && active.strengths.length > 0 && (
                <div>
                  <p className="text-sm font-semibold">Сильные стороны</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {(active.strengths as unknown[]).slice(0, 6).map((s, idx) => (
                      <li key={idx}>{typeof s === "string" ? s : JSON.stringify(s)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
