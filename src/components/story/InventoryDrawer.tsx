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
import { getMyAccessories } from "@/lib/story-helpers";
import { getJournal, type JournalSummary } from "@/lib/story-progression";
import { toast } from "sonner";
import { useT } from "@/i18n/LanguageProvider";

interface Props {
  userId: string;
  petName: string;
  onChange?: () => void;
  triggerCount: number;
}

export function InventoryDrawer({ userId, petName, onChange, triggerCount }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set());
  const [accessories, setAccessories] = useState<any[]>([]);
  const [journal, setJournal] = useState<JournalSummary | null>(null);
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
    const [inv, recs, known, accs, jour] = await Promise.all([
      getInventory(userId), getAllRecipes(), getDiscoveredRecipeIds(userId), getMyAccessories(userId), getJournal(userId),
    ]);
    setInventory(inv);
    setRecipes(recs);
    setKnownIds(known);
    setAccessories(accs);
    setJournal(jour);
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
      <DrawerContent className="max-h-[85vh] flex flex-col">
        <DrawerHeader className="pb-2">
          <DrawerTitle>🎒 {t("inventory.backpackOf", { name: petName })}</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-6 overflow-y-auto flex-1 min-h-0">
          <Tabs defaultValue="items" className="w-full">
            <TabsList className="grid grid-cols-5 w-full h-auto mb-3">
              <TabsTrigger value="items" className="text-[10px] py-2">
                🎒 {inventory.length > 0 && <span className="ml-0.5 text-accent">({inventory.length})</span>}
              </TabsTrigger>
              <TabsTrigger value="recipes" className="text-[10px] py-2">
                🧪 {knownRecipes.length > 0 && <span className="ml-0.5 text-accent">({knownRecipes.length})</span>}
              </TabsTrigger>
              <TabsTrigger value="accessories" className="text-[10px] py-2">
                ✨ {accessories.length > 0 && <span className="ml-0.5 text-accent">({accessories.length})</span>}
              </TabsTrigger>
              <TabsTrigger value="endings" className="text-[10px] py-2">
                🏁 {journal && journal.endingsSeen.length > 0 && <span className="ml-0.5 text-accent">({journal.endingsSeen.length})</span>}
              </TabsTrigger>
              <TabsTrigger value="help" className="text-[10px] py-2">❓</TabsTrigger>
            </TabsList>

            {/* OBJECTES */}
            <TabsContent value="items" className="mt-0 space-y-2">
              {grouped.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground italic">
                  {t("inventory.emptyItems")}<br />
                  {t("inventory.emptyItemsHint")}
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
                              const statKey = k === "fear" ? "stats.fear" : k === "hunger" ? "stats.hunger" : k === "sleep" ? "stats.sleep" : "stats.bond";
                              return (
                                <span key={k} className={`mr-1.5 ${isGood ? "text-accent" : "text-amber-500"}`}>
                                  {t(statKey)} {v! > 0 ? "+" : ""}{v}
                                </span>
                              );
                            })}
                          </p>
                        ) : (
                          <p className="text-[10px] text-muted-foreground italic">{t("inventory.materialOnly")}</p>
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
                  {t("inventory.noRecipes")}
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

            {/* ACCESSORIS */}
            <TabsContent value="accessories" className="mt-0 space-y-2">
              {accessories.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground italic">
                  Encara no tens cap accessori per a {petName}.<br />
                  Es desbloquegen completant capítols i reptes especials.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {accessories.map((a: any) => (
                    <div key={a.id} className="glass rounded-lg p-3 border border-accent/30 flex items-center gap-2">
                      <span className="text-2xl">{a.accessory_icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{a.accessory_name}</p>
                        <p className="text-[9px] text-muted-foreground">Equipat sempre</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground/70 italic text-center pt-2">
                Els accessoris són permanents i es veuen al perfil públic de {petName}.
              </p>
            </TabsContent>

            {/* FINALS DESCOBERTS */}
            <TabsContent value="endings" className="mt-0 space-y-2">
              {!journal ? (
                <p className="text-xs text-muted-foreground text-center py-4">Carregant...</p>
              ) : journal.endingsSeen.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground italic">
                  Encara no has arribat a cap final.<br />
                  Continua jugant per descobrir-los! ({journal.totals.endings} totals)
                </div>
              ) : (
                <>
                  <p className="text-[10px] text-muted-foreground/70 px-1">
                    Has descobert {journal.endingsSeen.length} de {journal.totals.endings} finals possibles.
                  </p>
                  {journal.endingsSeen.map((e) => (
                    <div key={e.id} className="glass rounded-lg p-3 border border-accent/30 flex items-center gap-2">
                      <span className="text-2xl">🏁</span>
                      <p className="text-sm font-medium">{e.title}</p>
                    </div>
                  ))}
                </>
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
                <p className="font-bold mb-1">📊 Barres = més plenes, millor</p>
                <p className="text-muted-foreground">
                  <b>Sacietat</b>, <b>Descans</b>, <b>Calma</b> i <b>Vincle</b>: com més plenes, més feliç està {petName}.
                  Els objectes amb números en verd milloren l'estat; els grocs el desgasten.
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
                <p className="font-bold mb-1">⏰ Necessitats canvien soles</p>
                <p className="text-muted-foreground">
                  Cada 12h sense jugar, la <b>Sacietat</b>, el <b>Descans</b> i el <b>Vincle</b> baixen una mica.
                  Torna i dona-li el que necessita per mantenir-la feliç!
                </p>
              </div>
              <div className="glass rounded-lg p-3 border border-border/30">
                <p className="font-bold mb-1">🐾 Visites i regals</p>
                <p className="text-muted-foreground">
                  Des del perfil d'un altre jugador pots <b>enviar la teva mascota a jugar</b> amb la seva
                  (cooldown 4h) o <b>regalar-li un objecte</b> de la teva motxilla.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
