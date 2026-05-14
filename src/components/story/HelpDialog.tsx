// 🔒 Component v5.1 — Mode Història. Tutorial persistent.
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function HelpDialog({ trigger }: { trigger?: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1">
            ❓ <span className="hidden sm:inline">Com funciona</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📖 Com es juga el Mode Història</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basics" className="mt-2">
          <TabsList className="grid grid-cols-4 w-full h-auto">
            <TabsTrigger value="basics" className="text-[11px] py-1.5">🎮 Bàsic</TabsTrigger>
            <TabsTrigger value="needs" className="text-[11px] py-1.5">🍖 Necess.</TabsTrigger>
            <TabsTrigger value="recipes" className="text-[11px] py-1.5">🧪 Receptes</TabsTrigger>
            <TabsTrigger value="worlds" className="text-[11px] py-1.5">🗺️ Mons</TabsTrigger>
          </TabsList>

          <TabsContent value="basics" className="space-y-3 text-sm leading-relaxed mt-3">
            <div>
              <p className="font-bold mb-1">🎮 L'aventura</p>
              <p className="text-muted-foreground text-xs">
                A cada escena trobes una situació i tries què fa la teva mascota. Cada decisió pot donar
                <b> XP</b>, <b>objectes</b>, <b>receptes</b> o canviar les seves <b>necessitats</b>.
              </p>
            </div>
            <div>
              <p className="font-bold mb-1">⭐ Nivells i evolució</p>
              <p className="text-muted-foreground text-xs">
                Acumulant XP la mascota puja de nivell (1→10). Cada cert nivell desbloqueja una habilitat
                (👃 Olfacte, 💪 Força, ✨ Empatia, 🔥 Coratge, 👑 Llegenda) que obre <b>noves opcions</b> a la història.
              </p>
            </div>
            <div>
              <p className="font-bold mb-1">🔁 Rejugar</p>
              <p className="text-muted-foreground text-xs">
                Cada cop que jugues un capítol descobreixes branques noves. Mira el subtítol "Visita #N":
                segons les visites apareixen opcions diferents.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="needs" className="space-y-3 text-sm leading-relaxed mt-3">
            <div>
              <p className="font-bold mb-1">🍖 Les 4 necessitats</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>😋 <b>Gana</b> — puja amb el temps. Donar-li menjar la baixa.</li>
                <li>😴 <b>Son</b> — puja amb el temps. Una manta o aigua la baixen.</li>
                <li>😨 <b>Por</b> — puja en escenes perilloses. Joguines o pocions la calmen.</li>
                <li>❤️ <b>Vincle</b> — puja jugant i regalant coses. Desbloqueja mons.</li>
              </ul>
            </div>
            <div className="glass rounded-lg p-2 border border-border/30">
              <p className="text-[11px] font-semibold mb-1">⏰ Decau cada 6 hores</p>
              <p className="text-[11px] text-muted-foreground">
                Quan no jugues, la gana i el son pugen. Si baixen massa, alguns finals seran pitjors.
                <b> Torna cada dia</b> i obre la <b>🎒 motxilla</b> per donar-li el que necessita.
              </p>
            </div>
            <div>
              <p className="font-bold mb-1">💊 Malalties</p>
              <p className="text-muted-foreground text-xs">
                A vegades emmalalteix (icona 🤒 al perfil). Els amics et poden regalar consumibles per curar-la.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="recipes" className="space-y-3 text-sm leading-relaxed mt-3">
            <div>
              <p className="font-bold mb-1">🧪 Com es descobreixen receptes</p>
              <p className="text-muted-foreground text-xs">
                Quan tens els ingredients d'una recepta a la motxilla, <b>es descobreix automàticament</b>.
                Veuràs un avís 💡 i la recepta apareixerà a la pestanya <b>Receptes</b>.
              </p>
            </div>
            <div>
              <p className="font-bold mb-1">🛠️ Com es construeix</p>
              <p className="text-muted-foreground text-xs">
                A la motxilla, pestanya <b>Receptes</b>, prem <b>✨ Combinar</b>. Es consumeixen els ingredients
                i obtens el nou objecte (sovint més potent).
              </p>
            </div>
            <div className="glass rounded-lg p-2 border border-border/30">
              <p className="text-[11px] text-muted-foreground">
                💡 Les receptes encara no descobertes apareixen com a <b>"???"</b> — explora la història i
                acumula objectes per revelar-les.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="worlds" className="space-y-3 text-sm leading-relaxed mt-3">
            <div>
              <p className="font-bold mb-1">🗺️ Els 4 mons</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>🏠 <b>Casa</b> — sempre disponible. Tutorial.</li>
                <li>🌳 <b>Carrer</b> — necessites ❤️ Vincle ≥ 40.</li>
                <li>🌲 <b>Bosc</b> — necessites 3 receptes descobertes.</li>
                <li>🏰 <b>Castell</b> — necessites Nivell 7+.</li>
              </ul>
            </div>
            <div className="glass rounded-lg p-2 border border-border/30">
              <p className="text-[11px] text-muted-foreground">
                Al mapa veuràs <b>quant et falta</b> sota cada món bloquejat. Juga a Casa i Carrer per pujar
                vincle i nivell, descobreix receptes i s'obriran els mons següents.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
