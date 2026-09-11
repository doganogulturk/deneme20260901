import Image from "next/image";
import { GAME_DURATION_SECONDS, type GameMode, type Player } from "@/lib/game";
import { countryCount, type WorldDifficulty } from "@/lib/world-countries";
import { provinces } from "@/lib/turkish-plates";

type IntroScreenProps = {
  player: Player | null;
  readyModes: GameMode[];
  onPlay: (mode: GameMode, difficulty: WorldDifficulty) => void;
  onSignOut: () => void;
};

const RULES = [
  { title: "10 soru", detail: "Her turda rastgele 10 konum sorulur." },
  { title: `${GAME_DURATION_SECONDS} saniye`, detail: "Süre biterse tur olduğu yerde kapanır." },
  { title: "Hız önemli", detail: "Eşit puanda daha hızlı biten üst sırada yer alır." },
];

const BUTTON_BASE =
  "inline-flex items-center gap-1.5 rounded-full py-2 pr-3 pl-4 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:gap-3 hover:shadow-md active:scale-95 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-wait disabled:opacity-50 disabled:hover:gap-1.5 disabled:hover:shadow-sm";

const BUTTON_TONE = {
  normal: "bg-cyan-600 hover:bg-cyan-500 hover:shadow-cyan-600/30 focus-visible:ring-cyan-300",
  hard: "bg-gradient-to-r from-cyan-600 via-orange-500 to-rose-600 hover:from-cyan-500 hover:via-orange-400 hover:to-rose-500 hover:shadow-rose-600/30 focus-visible:ring-rose-300",
};

function PlayButton({ label, tone, disabled, onClick }: { label: string; tone: keyof typeof BUTTON_TONE; disabled: boolean; onClick: () => void }) {
  return (
    <button className={`${BUTTON_BASE} ${BUTTON_TONE[tone]}`} disabled={disabled} onClick={onClick} type="button">
      {label}
      <svg aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function ModeCard({ badge, children, detail, isReady, title }: { badge: string; children: React.ReactNode; detail: string; isReady: boolean; title: string }) {
  return (
    <div className="group flex flex-col rounded-2xl border-2 border-slate-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-950/10">
      <div className="flex items-center justify-between gap-3">
        <span className="text-lg font-bold text-slate-800 transition-colors group-hover:text-cyan-800">{title}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500 transition-colors group-hover:bg-cyan-100 group-hover:text-cyan-700">
          {badge}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600">{detail}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">{children}</div>
      {!isReady && <p className="mt-2 text-xs text-slate-400">Harita hazırlanıyor...</p>}
    </div>
  );
}

export function IntroScreen({ player, readyModes, onPlay, onSignOut }: IntroScreenProps) {
  const isTurkeyReady = readyModes.includes("turkey");
  const isWorldReady = readyModes.includes("world");

  return (
    <section className="my-auto w-full">
      <div className="mx-auto w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-cyan-950/10 sm:p-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Harita Avcısı</h1>
            <p className="mt-3 max-w-xl text-slate-600">
              Sorulan şehri ya da ülkeyi harita üzerinde bulmaya çalışıyorsun. Doğru bildiğin her konum bir puan; tur bitince skorun
              sıralamaya işleniyor.
            </p>
          </div>
          {player && (
            <div className="flex shrink-0 items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="max-w-[12rem] truncate text-sm font-bold text-slate-700" title={player.name}>{player.name}</p>
                <button
                  className="text-xs font-semibold text-slate-400 underline-offset-2 transition hover:text-slate-600 hover:underline"
                  onClick={onSignOut}
                  type="button"
                >
                  Çıkış yap
                </button>
              </div>
              {player.avatarUrl ? (
                <Image
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full border border-cyan-200 object-cover"
                  height={40}
                  referrerPolicy="no-referrer"
                  src={player.avatarUrl}
                  unoptimized
                  width={40}
                />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-base font-bold text-cyan-700">
                  {player.name.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
          )}
        </div>

        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          {RULES.map((rule) => (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" key={rule.title}>
              <dt className="text-sm font-bold text-slate-800">{rule.title}</dt>
              <dd className="mt-0.5 text-xs text-slate-500">{rule.detail}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-8 text-xs font-semibold tracking-[0.2em] text-cyan-700 uppercase">Harita seç</p>
        <div className="mt-3 grid items-stretch gap-3 sm:grid-cols-2">
          <ModeCard
            badge={`${provinces.length} il`}
            detail="81 il arasından rastgele gelen şehri haritada bul."
            isReady={isTurkeyReady}
            title="Türkiye"
          >
            <PlayButton disabled={!isTurkeyReady} label="Oyna" onClick={() => onPlay("turkey", "normal")} tone="normal" />
          </ModeCard>

          <ModeCard
            badge={`${countryCount("hard")} ülke`}
            detail="Soruda gelen ülkenin dünya haritasındaki yerini seç."
            isReady={isWorldReady}
            title="Dünya"
          >
            <PlayButton disabled={!isWorldReady} label="Normal" onClick={() => onPlay("world", "normal")} tone="normal" />
            <PlayButton disabled={!isWorldReady} label="Zor" onClick={() => onPlay("world", "hard")} tone="hard" />
            <span className="w-full text-xs text-slate-400">
              Normal {countryCount("normal")} tanınmış ülke, Zor {countryCount("hard")} ülkenin tamamı.
            </span>
          </ModeCard>
        </div>
      </div>
    </section>
  );
}
