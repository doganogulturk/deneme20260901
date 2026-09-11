import { AuthPanel } from "./AuthPanel";
import { PlayButton } from "./PlayButton";
import { PlayerBadge } from "./PlayerBadge";
import { choiceLabel, GAME_DURATION_SECONDS, type GameMode, type PlayChoice, type Player } from "@/lib/game";
import { provinces } from "@/lib/turkish-plates";
import { countryCount } from "@/lib/world-countries";

type IntroScreenProps = {
  player: Player | null;
  readyModes: GameMode[];
  pendingChoice: PlayChoice | null;
  isSigningIn: boolean;
  authError: string | null;
  supabaseConfigured: boolean;
  onPlay: (choice: PlayChoice) => void;
  onCancelPendingChoice: () => void;
  onGoogleSignIn: () => void;
  onGuestSignIn: (name: string) => void;
  onSignOut: () => void;
};

const RULES = [
  { title: "10 soru", detail: "Her turda rastgele 10 konum sorulur." },
  { title: `${GAME_DURATION_SECONDS} saniye`, detail: "Süre biterse tur olduğu yerde kapanır." },
  { title: "Hız önemli", detail: "Eşit puanda daha hızlı biten üst sırada yer alır." },
];

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

export function IntroScreen({
  player,
  readyModes,
  pendingChoice,
  isSigningIn,
  authError,
  supabaseConfigured,
  onPlay,
  onCancelPendingChoice,
  onGoogleSignIn,
  onGuestSignIn,
  onSignOut,
}: IntroScreenProps) {
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
          <PlayerBadge onSignOut={onSignOut} player={player} />
        </div>

        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          {RULES.map((rule) => (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" key={rule.title}>
              <dt className="text-sm font-bold text-slate-800">{rule.title}</dt>
              <dd className="mt-0.5 text-xs text-slate-500">{rule.detail}</dd>
            </div>
          ))}
        </dl>

        {pendingChoice && !player ? (
          <div className="mt-8">
            <AuthPanel
              authError={authError}
              choiceLabel={choiceLabel(pendingChoice)}
              isSigningIn={isSigningIn}
              onCancel={onCancelPendingChoice}
              onGoogleSignIn={onGoogleSignIn}
              onGuestSignIn={onGuestSignIn}
              supabaseConfigured={supabaseConfigured}
            />
          </div>
        ) : pendingChoice ? (
          // Google girişinden dönüldü: seçim korundu, ama zamanlı turu kullanıcı hazırken başlatıyoruz.
          <div className="mt-8 rounded-2xl border-2 border-cyan-200 bg-cyan-50/60 p-5 sm:p-6">
            <p className="text-lg font-bold text-slate-900">
              Giriş tamam — <span className="text-cyan-700">{choiceLabel(pendingChoice)}</span> turun hazır
            </p>
            <p className="mt-1 text-sm text-slate-600">Başla dediğin anda {GAME_DURATION_SECONDS} saniyelik süre işlemeye başlar.</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <PlayButton
                disabled={!readyModes.includes(pendingChoice.mode)}
                label="Başla"
                onClick={() => onPlay(pendingChoice)}
                tone={pendingChoice.difficulty === "hard" ? "red" : "green"}
              />
              <button
                className="text-xs font-semibold text-slate-500 underline-offset-2 transition hover:text-cyan-700 hover:underline"
                onClick={onCancelPendingChoice}
                type="button"
              >
                Başka bir harita seç
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-8 text-xs font-semibold tracking-[0.2em] text-cyan-700 uppercase">Harita seç</p>
            <div className="mt-3 grid items-stretch gap-3 sm:grid-cols-2">
              <ModeCard badge={`${provinces.length} il`} detail="81 il arasından rastgele gelen şehri haritada bul." isReady={isTurkeyReady} title="Türkiye">
                <PlayButton disabled={!isTurkeyReady} label="Oyna" onClick={() => onPlay({ mode: "turkey", difficulty: "normal" })} />
              </ModeCard>

              <ModeCard
                badge={`${countryCount("hard")} ülke`}
                detail="Soruda gelen ülkenin dünya haritasındaki yerini seç."
                isReady={isWorldReady}
                title="Dünya"
              >
                <PlayButton disabled={!isWorldReady} label="Normal" onClick={() => onPlay({ mode: "world", difficulty: "normal" })} />
                <PlayButton disabled={!isWorldReady} label="Zor" onClick={() => onPlay({ mode: "world", difficulty: "hard" })} tone="red" />
                <span className="w-full text-xs text-slate-400">
                  Normal: Sadece çok bilinen ülkeler. Zor: {countryCount("hard")} ülkenin tamamı.
                </span>
              </ModeCard>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
