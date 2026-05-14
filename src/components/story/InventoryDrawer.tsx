// 🔒 Component v5.1 — Motxilla amb pestanyes (Objectes/Receptes/Ajuda).
import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getInventory, getAllRecipes, getDiscoveredRecipeIds, hasItems, combineRecipe,
  getItemEffect, useItemOnPet,
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

  // Group inventory by item_id with counts (so duplicates show as ×N)
  const grouped = Object.values(
    inventory.reduce<Record<string, { item: InventoryItem; count: number }>>((acc, it) => {
      const k = it.item_id;
      if (!acc[k]) acc[k] = { item: it, count: 0 };
      acc[k].count += 1;
      return acc;
    }, {})
  );

  const load = async () => {
    const [inv, recs, known] = await Promise.all([
      getInventory(userId), getAllRecipes(), getDiscoveredRecipeIds(userId),
    ]);
    setInventory(inv);
    setRecipes(recs);
    setKnownIds(known);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId, triggerCount]);

  const handleUseItem = async (item: InventoryItem) => {
    setBusy(true);
    try {
      const result = await useItemOnPet(userId, item);
      if (!result) { toast.error("Aquest objecte no es pot fer servir directament. Prova de combinar-lo!"); return; }
      toast.success(`${item.item_icon} ${petName} ${result.effect.verb} ${item.item_name}!`);
      await load();
      onChange?.();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const handleCombine = async (recipe: Recipe) => {
    setBusy(true);
    try {
      const result = await combineRecipe(userId, recipe, inventory);
      if (!result) { toast.error("No tens tots els ingredients!"); return; }
      toast.success(`✨ Has creat ${result.item_icon} ${result.item_name}!`);
      await load();
      onChange?.();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const knownRecipes = recipes.filter((r) => knownIds.has(r.id));
  const unknownCount = recipes.length - knownRecipes.length;

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
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle>🎒 Motxilla de {petName}</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-6 overflow-y-auto">
          <Tabs defaultValue="items" className="w-full">
            <TabsList className="grid grid-cols-3 w-full h-auto mb-3">
              <TabsTrigger value="items" className="text-xs py-2">
                Objectes {inventory.length > 0 && <span className="ml-1 text-accent">({inventory.length})</span>}
              </TabsTrigger>
              <TabsTrigger value="recipes" className="text-xs py-2">
                Receptes {knownRecipes.length > 0 && <span className="ml-1 text-accent">({knownRecipes.length})</span>}
              </TabsTrigger>
              <TabsTrigger value="help" className="text-xs py-2">❓ Ajuda</TabsTrigger>
            </TabsList>

            {/* OBJECTES */}
            <TabsContent value="items" className="mt-0 space-y-2">
              {grouped.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground italic">
                  Encara no tens cap objecte.<br />
                  Explora la història per trobar-ne!
                </div>
              ) : (
                grouped.map(({ item, count }) => {
                  const effect = getItemEffect(item);
                  return (
                    <div key={item.item_id} className="glass rounded-lg p-3 border border-border/30 flex items-center gap-3">
                      <div className="relative">
                        <span className="text-3xl">{item.item_icon}</span>
                        {count > 1 && (
                          <span className="absolute -bottom-1 -right-1 bg-accent text-accent-foreground text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                            {count}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{item.item_name}</p>
                        {effect ? (
                          <p className="text-[10px] text-muted-foreground">
                            {Object.entries(effect.delta).map(([k, v]) => {
                              const isGood = (k === "bond" && v! > 0) || (k !== "bond" && v! < 0);
                              const labels: any = { hunger: "Gana", sleep: "Son", fear: "Por", bond: "Vincle" };
                              return (
                                <span key={k} className={`mr-1.5 ${isGood ? "text-accent" : "text-amber-500"}`}>
                                  {labels[k]} {v! > 0 ? "+" : ""}{v}
                                </span>
                              );
                            })}
                          </p>
                        ) : (
                          <p className="text-[10px] text-muted-foreground italic">Material per combinar</p>
                        )}
                      </div>
                      {effect && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => handleUseItem(item)}
                          className="h-8 text-[11px] px-2 shrink-0"
                        >
                          {effect.label}
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </TabsContent>

            {/* RECEPTES */}
            <TabsContent value="recipes" className="mt-0 space-y-2">
              {knownRecipes.length === 0 && unknownCount === 0 && (
                <p className="text-xs text-muted-foreground italic text-center py-4">
                  Encara no hi ha receptes definides.
                </p>
              )}

              {/* Receptes descobertes */}
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
                    <div className="text-[10px] text-muted-foreground mb-2 flex flex-wrap gap-1 items-center">
                      <span>Necessites:</span>
                      {r.requires_items.map((id) => {
                        const it = inventory.find((i) => i.item_id === id);
                        const has = !!it;
                        return (
                          <span key={id} className={`px-1.5 py-0.5 rounded ${has ? "bg-accent/20 text-accent" : "bg-muted/50 text-destructive/80"}`}>
                            {has ? `${it!.item_icon} ${it!.item_name}` : `❓ ${id}`}
                          </span>
                        );
                      })}
                    </div>
                    <Button size="sm" disabled={!canCombine || busy} onClick={() => handleCombine(r)} className="w-full h-8 text-xs">
                      {canCombine ? `✨ Combinar → ${r.result_item_icon} ${r.result_item_name}` : "Falten ingredients"}
                    </Button>
                  </div>
                );
              })}

              {/* Receptes no descobertes (siluetes) */}
              {unknownCount > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                    {unknownCount} receptes per descobrir
                  </p>
                  {Array.from({ length: Math.min(unknownCount, 5) }).map((_, i) => (
                    <div key={i} className="glass rounded-lg p-3 border border-border/20 opacity-60">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl grayscale">❓</span>
                        <div>
                          <p className="text-sm font-bold text-muted-foreground">Recepta secreta</p>
                          <p className="text-[10px] text-muted-foreground italic">
                            Acumula els ingredients adequats i es revelarà sola.
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* AJUDA */}
            <TabsContent value="help" className="mt-0 space-y-3 text-xs">
              <div className="glass rounded-lg p-3 border border-border/30">
                <p className="font-bold mb-1">🎒 Què és la motxilla?</p>
                <p className="text-muted-foreground">
                  Aquí guardes els objectes que trobes durant la història. Pots <b>donar-los</b> a {petName}
                  per cuidar les seves necessitats, o <b>combinar-los</b> seguint receptes per crear-ne de més potents.
                </p>
              </div>
              <div className="glass rounded-lg p-3 border border-border/30">
                <p className="font-bold mb-1">🍖 Donar objectes</p>
                <p className="text-muted-foreground">
                  Cada objecte mostra <b>què afecta</b> (Gana, Son, Por, Vincle). Prem el botó de la dreta
                  per donar-lo. Es consumeix i es modifiquen les barres de necessitats.
                </p>
              </div>
              <div className="glass rounded-lg p-3 border border-border/30">
                <p className="font-bold mb-1">🧪 Combinar</p>
                <p className="text-muted-foreground">
                  A la pestanya <b>Receptes</b>, si tens els ingredients d'una recepta es marca verda i pots
                  prémer "Combinar". Les receptes es <b>descobreixen automàticament</b> quan acumules els
                  ingredients a la motxilla.
                </p>
              </div>
              <div className="glass rounded-lg p-3 border border-border/30">
                <p className="font-bold mb-1">⏰ Necessitats decauen</p>
                <p className="text-muted-foreground">
                  Cada 6h sense jugar, la <b>Gana</b> i el <b>Son</b> pugen i el <b>Vincle</b> baixa una mica.
                  Torna i dona-li el que necessita per mantenir-la feliç!
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
