// 🔒 Component v5 — Mode Història. Diari de descobertes.
import { useEffect, useState } from "react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger,
} from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { getJournal, type JournalSummary } from "@/lib/story-progression";

interface Props { userId: string; variant?: "card" | "icon"; }

/** Hint d'ús per objectes especials de la història (clau, mapa, etc.) */
function describeItemUse(id: string, name: string): string {
  const k = (id + " " + name).toLowerCase();
  if (/clau|key/.test(k)) return "Obre portes/cofres en escenes específiques";
  if (/mapa|map/.test(k)) return "Revela camins ocults i nodes nous";
  if (/torxa|torch|llanter|linterna/.test(k)) return "Il·lumina escenes fosques";
  if (/poci|elixir|tonic/.test(k)) return "Calma la por de la mascota";
  if (/manta|coixí|cama|llit/.test(k)) return "Acotxar — baixa son i por";
  if (/poma|pa\b|carn|peix|baia|menj|fruita/.test(k)) return "Donar de menjar — baixa la gana";
  if (/aigu|agua|beguda/.test(k)) return "Donar de beure — refresca";
  if (/jogui|peluix|pilota|joc/.test(k)) return "Jugar — puja vincle";
  if (/flor|regal|ram/.test(k)) return "Regal — puja vincle";
  if (/moned|gold|or\b/.test(k)) return "Moneda de canvi en alguns nodes";
  return "Es fa servir automàticament en escenes que el requereixin";
}

export function DiscoveryJournal({ userId }: Props) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<JournalSummary | null>(null);

  useEffect(() => {
    if (!open) return;
    getJournal(userId).then(setData).catch(() => setData(null));
  }, [open, userId]);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          📖 Diari de descobertes
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-w-md mx-auto bg-background">
        <DrawerHeader>
          <DrawerTitle>📖 Diari del Viatge</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6">
          {!data ? (
            <p className="text-sm text-muted-foreground text-center py-4">Carregant...</p>
          ) : (
            <Tabs defaultValue="items">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="items">🎒 {data.itemsFound.length}</TabsTrigger>
                <TabsTrigger value="recipes">🧪 {data.recipesDiscovered.length}/{data.totals.recipes}</TabsTrigger>
                <TabsTrigger value="endings">🏁 {data.endingsSeen.length}/{data.totals.endings}</TabsTrigger>
              </TabsList>
              <TabsContent value="items" className="mt-3 max-h-[50vh] overflow-y-auto">
                {data.itemsFound.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Encara no has trobat cap objecte.</p>
                ) : (
                  <>
                    <p className="text-[10px] text-muted-foreground mb-2 px-1">
                      Toca un objecte per veure'n l'ús. Els objectes s'usen automàticament quan tries
                      una opció a la història que els requereix (ex: 🗝️ obre portes, 🗺️ revela camins).
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {data.itemsFound.map((it) => (
                        <div key={it.id} className="glass rounded-lg p-2 text-center border border-border/30" title={describeItemUse(it.id, it.name)}>
                          <div className="text-2xl">{it.icon}</div>
                          <p className="text-[10px] font-medium leading-tight mt-1">{it.name}</p>
                          <p className="text-[9px] text-muted-foreground/80 leading-tight mt-0.5">
                            {describeItemUse(it.id, it.name)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>
              <TabsContent value="recipes" className="mt-3 max-h-[50vh] overflow-y-auto">
                {data.recipesDiscovered.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Encara no has descobert cap recepta.</p>
                ) : (
                  <div className="space-y-1.5">
                    {data.recipesDiscovered.map((r) => (
                      <div key={r.id} className="glass rounded-lg p-2 flex items-center gap-2 border border-border/30">
                        <span className="text-xl">{r.icon}</span>
                        <p className="text-sm font-medium">{r.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="endings" className="mt-3 max-h-[50vh] overflow-y-auto">
                {data.endingsSeen.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Encara no has acabat cap final.</p>
                ) : (
                  <div className="space-y-1.5">
                    {data.endingsSeen.map((e) => (
                      <div key={e.id} className="glass rounded-lg p-2 border border-border/30">
                        <p className="text-sm font-medium">{e.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
