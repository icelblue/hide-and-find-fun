// 🔒 CRITICAL: Component del Mode Història v4.
import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  getInventory, getAllRecipes, getDiscoveredRecipeIds, hasItems, combineRecipe,
  type InventoryItem, type Recipe,
} from "@/lib/story-state";
import { toast } from "sonner";

interface Props {
  userId: string;
  petName: string;
  onChange?: () => void;
  triggerCount: number;
}

export function InventoryDrawer({ userId, petName, onChange, triggerCount }: Props) {
  const [open, setOpen] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [inv, recs, known] = await Promise.all([
      getInventory(userId), getAllRecipes(), getDiscoveredRecipeIds(userId),
    ]);
    setInventory(inv);
    setRecipes(recs);
    setKnownIds(known);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId, triggerCount]);

  const handleCombine = async (recipe: Recipe) => {
    setBusy(true);
    try {
      const result = await combineRecipe(userId, recipe, inventory);
      if (!result) { toast.error("No tens tots els ingredients!"); return; }
      toast.success(`${result.item_icon} Has creat ${result.item_name}!`);
      await load();
      onChange?.();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const knownRecipes = recipes.filter((r) => knownIds.has(r.id));

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-8 px-2">
          <span className="text-xl">🎒</span>
          {inventory.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {inventory.length}
            </span>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle>🎒 Motxilla de {petName}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-y-auto space-y-5">
          {/* Items */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Objectes</h3>
            {inventory.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Encara no tens cap objecte. Explora i descobreix!</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {inventory.map((it) => (
                  <div key={it.item_id} className="glass rounded-lg p-2 text-center border border-border/30">
                    <div className="text-2xl mb-1">{it.item_icon}</div>
                    <p className="text-[10px] font-medium truncate">{it.item_name}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recipes */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">📜 Receptes descobertes</h3>
            {knownRecipes.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Trobaràs receptes durant l'aventura.</p>
            ) : (
              <div className="space-y-2">
                {knownRecipes.map((r) => {
                  const canCombine = hasItems(inventory, r.requires_items);
                  return (
                    <div key={r.id} className={`glass rounded-lg p-3 border ${canCombine ? "border-accent/40" : "border-border/30"}`}>
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-2xl">{r.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold">{r.name}</p>
                          {r.description && <p className="text-[10px] text-muted-foreground">{r.description.split("{pet}").join(petName)}</p>}
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-2">
                        Necessites: {r.requires_items.map((id) => {
                          const has = inventory.some((i) => i.item_id === id);
                          const it = inventory.find((i) => i.item_id === id);
                          return (
                            <span key={id} className={`mx-0.5 ${has ? "text-accent" : "text-destructive/70"}`}>
                              {has ? `${it!.item_icon} ${it!.item_name}` : `❓ ${id}`}
                            </span>
                          );
                        })}
                      </p>
                      <Button size="sm" disabled={!canCombine || busy} onClick={() => handleCombine(r)} className="w-full h-8 text-xs">
                        {canCombine ? `✨ Combinar → ${r.result_item_icon} ${r.result_item_name}` : "Falten ingredients"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
