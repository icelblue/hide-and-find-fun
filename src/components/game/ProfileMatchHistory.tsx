import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, History, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getProfileMatchHistory, HISTORY_PAGE_SIZE, signedElo, type HistoryPeriod } from "@/lib/profile-match-history";

export function ProfileMatchHistory({ userId, canOpenGames = false }: { userId: string; canOpenGames?: boolean }) {
  const [period, setPeriod] = useState<HistoryPeriod>("30");
  const [page, setPage] = useState(0);
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: ["profile-match-history", userId, period, page],
    queryFn: () => getProfileMatchHistory(userId, period, page),
    staleTime: 30000,
  });
  const changePeriod = (value: string) => {
    if (value !== "7" && value !== "30" && value !== "all") return;
    setPeriod(value);
    setPage(0);
  };
  return (
    <section className="mb-6" aria-label="Partides recents">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-semibold flex items-center gap-2"><History className="h-4 w-4 text-primary" />Partides recents</h2>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Actualitzar historial" aria-label="Actualitzar historial" disabled={isFetching} onClick={() => void refetch()}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? "motion-safe:animate-spin" : ""}`} />
        </Button>
      </div>
      <Tabs value={period} onValueChange={changePeriod}>
        <TabsList className="grid grid-cols-3 w-full mb-4" aria-label="Període de partides">
          <TabsTrigger value="7">7 dies</TabsTrigger>
          <TabsTrigger value="30">30 dies</TabsTrigger>
          <TabsTrigger value="all">Totes</TabsTrigger>
        </TabsList>
      </Tabs>
      {isPending ? <div role="status" className="py-10 text-center text-sm text-muted-foreground">Carregant partides…</div> : error ? (
        <div role="alert" className="py-6 text-center space-y-3">
          <p className="text-sm text-destructive">No s’ha pogut carregar l’historial.</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}><RefreshCw className="h-4 w-4 mr-2" />Tornar-ho a provar</Button>
        </div>
      ) : data && (
        <>
          <div className="grid grid-cols-3 gap-2 py-3 border-y border-border mb-3">
            {[
              { label: "Guanyat", value: data.elo_gained, color: "text-success" },
              { label: "Perdut", value: data.elo_lost, color: "text-destructive" },
              { label: "Balanç", value: data.elo_net, color: "text-foreground" },
            ].map(stat => <div key={stat.label} className="text-center">
              <div className={`text-lg font-bold tabular-nums ${stat.color}`}>{data.recorded_matches ? signedElo(stat.value) : "—"}</div>
              <div className="text-[10px] text-muted-foreground">{stat.label} · Elo</div>
            </div>)}
          </div>
          {data.legacy_matches > 0 && <p className="text-xs text-muted-foreground mb-3">{data.legacy_matches} {data.legacy_matches === 1 ? "partida anterior sense registre" : "partides anteriors sense registre"} d’Elo.</p>}
          {data.total === 0 ? <div className="py-8 text-center text-muted-foreground"><History className="h-7 w-7 mx-auto mb-2" /><p className="text-sm">Cap partida finalitzada en aquest període.</p></div> : (
            <ul className="divide-y divide-border">
              {data.matches.map(match => {
                const result = match.result === "win" ? { label: "Victòria", className: "text-success" } : match.result === "loss" ? { label: "Derrota", className: "text-destructive" } : { label: "Empat", className: "text-muted-foreground" };
                return <li key={match.game_id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs font-semibold ${result.className}`}>{result.label}<span className="text-muted-foreground font-normal ml-2 font-mono">{match.game_code}</span></div>
                      <div className="text-sm mt-1 break-words">
                        <span className="text-muted-foreground">vs </span>
                        {match.opponent_id ? <Button asChild variant="link" className="inline h-auto p-0 text-sm whitespace-normal text-left"><Link to={`/player/${match.opponent_id}`}>{match.opponent_name}</Link></Button> : match.opponent_name}
                      </div>
                      <time dateTime={match.finished_at} className="text-[10px] text-muted-foreground">{new Date(match.finished_at).toLocaleString("ca", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-bold text-base tabular-nums ${match.elo_change == null ? "text-muted-foreground" : match.elo_change > 0 ? "text-success" : match.elo_change < 0 ? "text-destructive" : "text-foreground"}`}>
                        {match.elo_change == null ? "—" : <span className="inline-flex items-center gap-1">{match.elo_change > 0 ? <ArrowUpRight className="h-3 w-3" /> : match.elo_change < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}{signedElo(match.elo_change)}</span>}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{match.elo_before == null ? "Elo no registrat" : `${match.elo_before} → ${match.elo_after}`}</p>
                      {canOpenGames && match.game_exists && <Button asChild variant="ghost" size="icon" className="h-7 w-7 mt-1" title="Veure partida" aria-label={`Veure partida ${match.game_code}`}><Link to={`/game/${match.game_id}`}><ArrowUpRight className="h-4 w-4" /></Link></Button>}
                    </div>
                  </div>
                </li>;
              })}
            </ul>
          )}
          {data.total > HISTORY_PAGE_SIZE && <div className="flex justify-between items-center border-t border-border pt-3 mt-3">
            <Button variant="outline" size="icon" aria-label="Partides més recents" disabled={page === 0 || isFetching} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-xs text-muted-foreground">{page + 1} / {Math.ceil(data.total / HISTORY_PAGE_SIZE)}</span>
            <Button variant="outline" size="icon" aria-label="Partides més antigues" disabled={(page + 1) * HISTORY_PAGE_SIZE >= data.total || isFetching} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>}
        </>
      )}
    </section>
  );
}