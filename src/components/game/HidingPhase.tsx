// ============================================================
// HidingPhase — Wizard de la fase d'amagar (extret de GamePage)
// ============================================================
// Component de presentació: tot l'estat i els handlers viuen a
// GamePage (decisió documentada a useHidingFlowState) i arriben
// per props. Mateix patró que GameFinishedPhase.
// ============================================================
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CUSTOM_OBJECT_SENTINEL_ID, CUSTOM_OBJECT_MATERIALS, CUSTOM_OBJECT_SIZES, isSingleEmoji, type CustomObjectMaterial, type CustomObjectSize } from "@/lib/custom-object";
import { POSITIONS, POS_LABELS, type Position } from "@/lib/game-types";
import { MATERIAL_LABELS } from "@/lib/api/materials-api";
import { Tip } from "@/components/HelpButton";

interface Props { p: Record<string, any> }

export default function HidingPhase({ p }: Props) {
  const {
    hideSteps, hideStep, setHideStep, t,
    scenarios, items, objects, connectedScenarios,
    selectedScenario, selectedObject, selectedItem,
    handleSelectScenario, handleSelectObject, handleSelectCustomObject, handleSelectPosition,
    actionLoading,
    customObjectIcon, setCustomObjectIcon, customObjectName, setCustomObjectName,
    customObjectSize, setCustomObjectSize, customObjectMaterial, setCustomObjectMaterial,
    customObjectTrait1, setCustomObjectTrait1, customObjectTrait2, setCustomObjectTrait2,
    isPersonalGame, posLabel,
  } = p;
  return (

        <div>
          <div className="flex items-center gap-1 mb-5">
            {hideSteps.map((step, i) => (
              <div key={i} className={`flex-1 text-center text-[10px] py-1.5 rounded-full font-medium transition-all ${
                i === hideStep ? "gradient-primary text-primary-foreground shadow-md" :
                i < hideStep ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground"
              }`}>{step}</div>
            ))}
          </div>

          {hideStep === 0 && (() => {
            // Filter out the sentinel "__custom__" row from the regular lists
            const realObjects = objects.filter((o) => o.id !== CUSTOM_OBJECT_SENTINEL_ID);
            const specials = realObjects.filter((o) => o.is_special);
            const basics = realObjects.filter((o) => !o.is_special);
            const renderCard = (o: any) => (
              <Card key={o.id} className={`glass transition-all active:scale-[0.97] relative ${actionLoading ? "opacity-50 pointer-events-none" : "cursor-pointer hover:border-secondary/40"}`} onClick={() => !actionLoading && handleSelectObject(o.id)}>
                <CardContent className="py-3 text-center">
                  <div className="flex justify-center mb-1"><ObjectIcon name={o.name} emoji={o.icon} size={40} /></div>
                  <div className="text-[11px] font-medium">{o.name}</div>
                </CardContent>
              </Card>
            );
            const customIconValid = customObjectIcon === "" || isSingleEmoji(customObjectIcon);
            const customNameValid = customObjectName.trim().length > 0 && customObjectName.trim().length <= 20;
            const t1 = customObjectTrait1.trim();
            const t2 = customObjectTrait2.trim();
            const customTrait1Valid = t1.length > 0 && t1.length <= 60;
            const customTrait2Valid = t2.length > 0 && t2.length <= 60;
            const customReady = isSingleEmoji(customObjectIcon) && customNameValid && customTrait1Valid && customTrait2Valid;
            return (
              <div>
                <h2 className="text-lg font-bold mb-1">{t("game.hide.whatTitle")}</h2>
                <Tip>{t("game.hide.whatTip")}</Tip>
                <div className="h-3" />
                <Tabs defaultValue="specials" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-3">
                    <TabsTrigger value="specials">{t("game.hide.tabSpecials")}</TabsTrigger>
                    <TabsTrigger value="basics">{t("game.hide.tabBasics")}</TabsTrigger>
                    <TabsTrigger value="custom">{t("game.hide.tabCustom")}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="specials">
                    {specials.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">{specials.map(renderCard)}</div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">{t("game.hide.noSpecials")}</p>
                    )}
                  </TabsContent>
                  <TabsContent value="basics">
                    {basics.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">{basics.map(renderCard)}</div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">{t("game.hide.noBasics")}</p>
                    )}
                  </TabsContent>
                  <TabsContent value="custom">
                    <Card className="glass">
                      <CardContent className="py-4 space-y-3">
                        <p className="text-[11px] text-muted-foreground"><span dangerouslySetInnerHTML={{__html: t("game.hide.customDesc")}} /></p>
                        <div>
                          <label className="text-[11px] font-semibold mb-1 block">{t("game.hide.iconLabel")}</label>
                          <Input
                            value={customObjectIcon}
                            onChange={e => setCustomObjectIcon(e.target.value)}
                            placeholder="🦄"
                            maxLength={8}
                            className={customIconValid ? "" : "border-destructive"}
                          />
                          {!customIconValid && <p className="text-[10px] text-destructive mt-1">{t("game.hide.iconError")}</p>}
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold mb-1 block">{t("game.hide.nameLabel")}</label>
                          <Input
                            value={customObjectName}
                            onChange={e => setCustomObjectName(e.target.value.slice(0, 20))}
                            placeholder={t("game.hide.namePlaceholder")}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-semibold mb-1 block">{t("game.hide.sizeLabel")}</label>
                            <select
                              value={customObjectSize}
                              onChange={e => setCustomObjectSize(Number(e.target.value) as CustomObjectSize)}
                              className="w-full h-10 rounded-xl border border-border/50 bg-muted/30 px-2 text-sm"
                            >
                              {CUSTOM_OBJECT_SIZES.map(s => (
                                <option key={s} value={s}>{s === 1 ? t("game.hide.sizeSmall") : s === 2 ? t("game.hide.sizeMed") : t("game.hide.sizeLarge")}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold mb-1 block">{t("game.hide.materialLabel")}</label>
                            <select
                              value={customObjectMaterial}
                              onChange={e => setCustomObjectMaterial(e.target.value as CustomObjectMaterial)}
                              className="w-full h-10 rounded-xl border border-border/50 bg-muted/30 px-2 text-sm"
                            >
                              {CUSTOM_OBJECT_MATERIALS.map(m => (
                                <option key={m} value={m}>{t(MATERIAL_LABELS[m] ?? m, m)}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold mb-1 block">{t("game.hide.trait1Label")}</label>
                          <Input
                            value={customObjectTrait1}
                            onChange={e => setCustomObjectTrait1(e.target.value.slice(0, 60))}
                            placeholder={t("game.hide.trait1Placeholder")}
                            maxLength={60}
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">{customObjectTrait1.trim().length}/60</p>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold mb-1 block">{t("game.hide.trait2Label")}</label>
                          <Input
                            value={customObjectTrait2}
                            onChange={e => setCustomObjectTrait2(e.target.value.slice(0, 60))}
                            placeholder={t("game.hide.trait2Placeholder")}
                            maxLength={60}
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">{customObjectTrait2.trim().length}/60</p>
                        </div>
                        {customReady && (
                          <div className="flex items-center justify-center gap-2 py-2 bg-muted/30 rounded-lg">
                            <span className="text-2xl">{customObjectIcon}</span>
                            <span className="text-sm font-medium">{customObjectName}</span>
                          </div>
                        )}
                        <Button
                          className="w-full"
                          disabled={!customReady || actionLoading}
                          onClick={handleSelectCustomObject}
                        >
                          {t("game.hide.submitCustom")}
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            );
          })()}

          {hideStep === 1 && (
            <ScenarioPicker
              scenarios={scenarios}
              onSelect={handleSelectScenario}
              onBack={() => setHideStep(0)}
            />
          )}


          {hideStep === 2 && (
            <div>
              <h2 className="text-lg font-bold mb-1">{t("game.hide.whichItemTitle")}</h2>
              <Tip>{t("game.hide.whichItemTip")}</Tip>
              <div className="h-3" />
              <div className="grid grid-cols-2 gap-2.5">
                {items.map(item => {
                  const isCustom = selectedObject === CUSTOM_OBJECT_SENTINEL_ID && customObjectData;
                  const mat = isCustom
                    ? customObjectData!.custom_material
                    : ((objects.find((o) => o.id === selectedObject) as any)?.material ?? "generic");
                  const env = item?.environment ?? "generic";
                  const blockReason = getMaterialBlockReason(mat, env);
                  return (
                    <Card key={item.id}
                      className={`glass transition-all active:scale-[0.97] ${blockReason ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:border-accent/40"}`}
                      onClick={() => !blockReason && (() => { setSelectedItem(item.id); setHideStep(3); })()}>
                      <CardContent className="py-4 text-center">
                        <div className="text-3xl mb-1">{item.icon}</div>
                        <div className="text-sm font-medium">{item.name}</div>
                        {blockReason && <div className="text-[9px] text-destructive mt-1">🚫 {blockReason}</div>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setHideStep(1)}>{t("game.hide.backToScenario")}</Button>
            </div>
          )}

          {hideStep === 3 && (
            <div>
              <h2 className="text-lg font-bold mb-1">{t("game.hide.whichPosTitle")}</h2>
              <Tip>{t("game.hide.whichPosTip")}</Tip>
              <div className="h-3" />


              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {POSITIONS.map(pos => {
                  const isCustom = selectedObject === CUSTOM_OBJECT_SENTINEL_ID && customObjectData;
                  const objSize = isCustom
                    ? customObjectData!.custom_size
                    : ((objects.find((o) => o.id === selectedObject) as any)?.size ?? 2);
                  const itm = items.find((i) => i.id === selectedItem);
                  const blockedDins = pos.value === "dins" && objSize > (itm?.inner_capacity ?? 2);
                  const blockedDarrere = pos.value === "darrere" && itm?.can_behind === false;
                  const blocked = blockedDins || blockedDarrere;
                  const selected = selectedPosition === pos.value;
                  const blockReason = blockedDins ? t("game.hide.noFit") : blockedDarrere ? t("game.hide.cannot") : "";
                  return (
                    <Card key={pos.value}
                      className={`glass transition-all active:scale-[0.97] ${selected ? "border-primary glow-primary" : ""} ${blocked || actionLoading ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:border-primary/40"}`}
                      onClick={() => !blocked && !actionLoading && handleSelectPosition(pos.value)}>
                      <CardContent className="py-6 text-center">
                        <div className="text-4xl mb-2">{pos.icon}</div>
                        <div className="text-sm font-semibold">{posLabel(pos.value)}</div>
                        {blocked && <div className="text-[9px] text-destructive mt-1">{blockReason}</div>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setHideStep(2)}>{t("game.hide.backToItem")}</Button>
            </div>
          )}
        </div>
  );
}
