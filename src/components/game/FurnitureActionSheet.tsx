// ============================================================
// FurnitureActionSheet — Popover amb accions d'un moble (PvP)
// ============================================================
// Substitueix el `<Select>` clàssic quan l'usuari fa clic en un moble
// del PixelRoomGrid. Reutilitza el component ItemActions ja existent
// per no duplicar lògica de tokens/accions/interaccions.
// ============================================================
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ItemActions from "@/components/game/ItemActions";
import type { PlayerTools, Position } from "@/lib/game-types";

interface Props {
  item: {
    id: string;
    name: string;
    icon: string;
    [k: string]: unknown;
  } | null;
  open: boolean;
  onClose: () => void;
  positions: readonly { value: Position; label: string; icon: string }[];
  onLook: (id: string, pos: Position) => void;
  disabled: boolean;
  tokensRemaining: number;
  lookedSpots: Set<string>;
  bananaBlockedSpot: string | null;
  revealedSpecials?: Map<string, { type: "curse" | "bonus"; value: number }>;
  interactions?: unknown[];
  onInteraction?: (interaction: unknown) => void;
  moveHistory?: unknown[];
  playerTools?: PlayerTools;
  gameBreaks?: Set<string>;
  onTagAction?: (itemId: string, actionKey: string) => void;
  dirtyItems?: Set<string>;
  breakableItems?: Set<string>;
}

export default function FurnitureActionSheet(props: Props) {
  const { item, open, onClose, ...rest } = props;
  return (
    <Sheet open={open && !!item} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="text-2xl">{item?.icon}</span>
            <span>{item?.name}</span>
          </SheetTitle>
        </SheetHeader>
        {item && (
          <div className="mt-3">
            {/* Reutilitzem ItemActions però forçant expanded=true (a través d'un wrapper). */}
            <ItemActions
              item={item}
              positions={rest.positions}
              onLook={(id, pos) => { rest.onLook(id, pos); onClose(); }}
              disabled={rest.disabled}
              tokensRemaining={rest.tokensRemaining}
              lookedSpots={rest.lookedSpots}
              bananaBlockedSpot={rest.bananaBlockedSpot}
              revealedSpecials={rest.revealedSpecials}
              interactions={rest.interactions as never}
              onInteraction={rest.onInteraction as never}
              moveHistory={rest.moveHistory as never}
              playerTools={rest.playerTools}
              gameBreaks={rest.gameBreaks}
              onTagAction={rest.onTagAction ? (id, ak) => { rest.onTagAction?.(id, ak); onClose(); } : undefined}
              dirtyItems={rest.dirtyItems}
              breakableItems={rest.breakableItems}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
