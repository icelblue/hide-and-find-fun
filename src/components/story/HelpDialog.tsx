// 🔒 Component v5.1 — Mode Història. Tutorial persistent.
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/i18n/LanguageProvider";

export function HelpDialog({ trigger }: { trigger?: React.ReactNode }) {
  const t = useT();
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1">
            ❓ <span className="hidden sm:inline">{t("help.trigger")}</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("help.title")}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basics" className="mt-2">
          <TabsList className="grid grid-cols-5 w-full h-auto">
            <TabsTrigger value="basics" className="text-[10px] py-1.5">{t("help.tabBasics")}</TabsTrigger>
            <TabsTrigger value="needs" className="text-[10px] py-1.5">{t("help.tabNeeds")}</TabsTrigger>
            <TabsTrigger value="recipes" className="text-[10px] py-1.5">{t("help.tabRecipes")}</TabsTrigger>
            <TabsTrigger value="worlds" className="text-[10px] py-1.5">{t("help.tabWorlds")}</TabsTrigger>
            <TabsTrigger value="social" className="text-[10px] py-1.5">{t("help.tabSocial")}</TabsTrigger>
          </TabsList>

          <TabsContent value="basics" className="space-y-3 text-sm leading-relaxed mt-3">
            {(["basics1", "basics2", "basics3"] as const).map((k) => (
              <div key={k}>
                <p className="font-bold mb-1">{t(`help.${k}Title`)}</p>
                <p className="text-muted-foreground text-xs">{t(`help.${k}Body`)}</p>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="needs" className="space-y-3 text-sm leading-relaxed mt-3">
            <div>
              <p className="font-bold mb-1">{t("help.needsTitle")}</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>{t("help.needsHunger")}</li>
                <li>{t("help.needsSleep")}</li>
                <li>{t("help.needsFear")}</li>
                <li>{t("help.needsBond")}</li>
              </ul>
            </div>
            <div className="glass rounded-lg p-2 border border-border/30">
              <p className="text-[11px] font-semibold mb-1">{t("help.needsDecayTitle")}</p>
              <p className="text-[11px] text-muted-foreground">{t("help.needsDecayBody")}</p>
            </div>
            <div>
              <p className="font-bold mb-1">{t("help.needsSickTitle")}</p>
              <p className="text-muted-foreground text-xs">{t("help.needsSickBody")}</p>
            </div>
          </TabsContent>

          <TabsContent value="recipes" className="space-y-3 text-sm leading-relaxed mt-3">
            <div>
              <p className="font-bold mb-1">{t("help.recipesDiscoverTitle")}</p>
              <p className="text-muted-foreground text-xs">{t("help.recipesDiscoverBody")}</p>
            </div>
            <div>
              <p className="font-bold mb-1">{t("help.recipesBuildTitle")}</p>
              <p className="text-muted-foreground text-xs">{t("help.recipesBuildBody")}</p>
            </div>
            <div className="glass rounded-lg p-2 border border-border/30">
              <p className="text-[11px] text-muted-foreground">{t("help.recipesTipBody")}</p>
            </div>
          </TabsContent>

          <TabsContent value="worlds" className="space-y-3 text-sm leading-relaxed mt-3">
            <div>
              <p className="font-bold mb-1">{t("help.worldsTitle")}</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {["Home", "Street", "Forest", "Beach", "Castle", "Volcano", "Dreams"].map((w) => (
                  <li key={w}>{t(`help.worlds${w}`)}</li>
                ))}
              </ul>
            </div>
            <div className="glass rounded-lg p-2 border border-border/30">
              <p className="text-[11px] text-muted-foreground">{t("help.worldsTipBody")}</p>
            </div>
          </TabsContent>

          <TabsContent value="social" className="space-y-3 text-sm leading-relaxed mt-3">
            <div>
              <p className="font-bold mb-1">{t("help.socialVisitTitle")}</p>
              <p className="text-muted-foreground text-xs">{t("help.socialVisitBody")}</p>
            </div>
            <div>
              <p className="font-bold mb-1">{t("help.socialGiftTitle")}</p>
              <p className="text-muted-foreground text-xs">{t("help.socialGiftBody")}</p>
            </div>
            <div>
              <p className="font-bold mb-1">{t("help.socialFriendsTitle")}</p>
              <p className="text-muted-foreground text-xs">{t("help.socialFriendsBody")}</p>
            </div>
            <div className="glass rounded-lg p-2 border border-border/30">
              <p className="text-[11px] text-muted-foreground">{t("help.socialCooldownBody")}</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
