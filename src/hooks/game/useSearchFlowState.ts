// ============================================================
// useSearchFlowState — estat de la fase "search" agrupat
// ------------------------------------------------------------
// Només estat (no handlers): agrupa els useState de la fase de cerca.
// ============================================================
import { useState } from "react";
import { parseTools, type PlayerTools } from "@/lib/game-types";

export function useSearchFlowState() {
  const [sheetItemId, setSheetItemId] = useState<string | null>(null);
  const [connectedScenarios, setConnectedScenarios] = useState<Record<string, unknown>[]>([]);
  const [moveHistory, setMoveHistory] = useState<Record<string, unknown>[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [itemInteractions, setItemInteractions] = useState<Record<string, unknown>[]>([]);
  const [playerTools, setPlayerTools] = useState<PlayerTools>(parseTools(null));
  const [dirtyItems, setDirtyItems] = useState<Set<string>>(new Set());
  const [breakableItems, setBreakableItems] = useState<Set<string>>(new Set());
  const [gameBreaks, setGameBreaks] = useState<Set<string>>(new Set());
  const [illuminatedScenarios, setIlluminatedScenarios] = useState<Set<string>>(new Set());
  const [scenarioIsDarkState, setScenarioIsDarkState] = useState(false);

  return {
    sheetItemId, setSheetItemId,
    connectedScenarios, setConnectedScenarios,
    moveHistory, setMoveHistory,
    actionLoading, setActionLoading,
    itemInteractions, setItemInteractions,
    playerTools, setPlayerTools,
    dirtyItems, setDirtyItems,
    breakableItems, setBreakableItems,
    gameBreaks, setGameBreaks,
    illuminatedScenarios, setIlluminatedScenarios,
    scenarioIsDarkState, setScenarioIsDarkState,
  };
}
