/**
 * Wireframe stand-ins for product screenshots that have not been taken yet.
 *
 * Drawn as inline SVG against the theme tokens rather than shipped as image
 * files, for three reasons: they follow light and dark mode automatically,
 * they cost no network request, and they cannot be mistaken for a real
 * screenshot in a review — the shapes are obviously schematic.
 *
 * When real captures exist, replace the `<ScreenshotMock>` usage in
 * `sections.tsx` with `next/image`; the aspect ratio is already reserved, so
 * the layout will not move.
 */

export type MockVariant =
  | "dashboard"
  | "training"
  | "exam"
  | "simulation"
  | "jury"
  | "ranking"
  | "certificate"
  | "analytics";

/* Theme tokens, so the mock re-colours with the rest of the page. */
const SURFACE = "var(--card)";
const PAGE = "var(--subtle)";
const LINE = "var(--border)";
const INK = "var(--foreground)";
const SOFT = "var(--muted-foreground)";
const BRAND = "var(--primary)";
const OK = "var(--success)";
const COIN = "var(--coin)";

/** A grey text line. Opacity carries the "placeholder" feel without new tokens. */
function Bar({ x, y, w, h = 6, fill = SOFT, o = 0.25, r = 3 }: {
  x: number; y: number; w: number; h?: number; fill?: string; o?: number; r?: number;
}) {
  return <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} opacity={o} />;
}

function Panel({ x, y, w, h, r = 10 }: { x: number; y: number; w: number; h: number; r?: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={r} fill={SURFACE} stroke={LINE} strokeWidth={1.5} />;
}

/** App chrome every variant shares: a sidebar rail and a top bar. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <rect x={0} y={0} width={640} height={400} rx={14} fill={PAGE} />
      <rect x={0} y={0} width={132} height={400} rx={14} fill={SURFACE} />
      <rect x={118} y={0} width={14} height={400} fill={SURFACE} />
      <line x1={132} y1={0} x2={132} y2={400} stroke={LINE} strokeWidth={1.5} />
      <circle cx={26} cy={26} r={9} fill={BRAND} />
      <Bar x={42} y={22} w={44} h={7} fill={INK} o={0.55} />
      {[62, 88, 114, 140, 166].map((y, i) => (
        <g key={y}>
          {i === 1 && <rect x={10} y={y - 7} width={112} height={22} rx={7} fill={BRAND} opacity={0.12} />}
          <rect x={20} y={y - 2} width={9} height={9} rx={2.5} fill={i === 1 ? BRAND : SOFT} opacity={i === 1 ? 0.9 : 0.35} />
          <Bar x={37} y={y} w={i % 2 ? 52 : 64} h={5} o={i === 1 ? 0.5 : 0.25} fill={i === 1 ? BRAND : SOFT} />
        </g>
      ))}
      <line x1={132} y1={52} x2={640} y2={52} stroke={LINE} strokeWidth={1.5} />
      <Bar x={152} y={22} w={92} h={8} fill={INK} o={0.5} />
      <circle cx={598} cy={26} r={10} fill={BRAND} opacity={0.15} />
      <circle cx={568} cy={26} r={5} fill={SOFT} opacity={0.3} />
      {children}
    </>
  );
}

/** Four KPI tiles across the content area. */
function Kpis({ y = 70 }: { y?: number }) {
  return (
    <>
      {[0, 1, 2, 3].map((i) => {
        const x = 152 + i * 120;
        const accent = [BRAND, OK, BRAND, COIN][i];
        return (
          <g key={i}>
            <Panel x={x} y={y} w={104} h={62} />
            <rect x={x} y={y} width={104} height={3} rx={1.5} fill={accent} opacity={0.8} />
            <Bar x={x + 12} y={y + 16} w={44} h={4} o={0.3} />
            <Bar x={x + 12} y={y + 30} w={34} h={12} fill={INK} o={0.65} r={3} />
          </g>
        );
      })}
    </>
  );
}

function LineChart({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const pts = [0.9, 0.85, 0.7, 0.72, 0.5, 0.45, 0.3, 0.18];
  const step = w / (pts.length - 1);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${x + i * step},${y + p * h}`).join(" ");
  return (
    <>
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1={x} y1={y + g * h} x2={x + w} y2={y + g * h} stroke={LINE} strokeWidth={1} opacity={0.7} />
      ))}
      <path d={`${d} L${x + w},${y + h} L${x},${y + h} Z`} fill={BRAND} opacity={0.1} />
      <path d={d} fill="none" stroke={BRAND} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

function BarChart({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const vals = [0.35, 0.55, 0.4, 0.75, 0.6, 0.9];
  const bw = w / vals.length - 8;
  return (
    <>
      {vals.map((v, i) => (
        <rect key={i} x={x + i * (bw + 8)} y={y + h - v * h} width={bw} height={v * h} rx={4} fill={BRAND} opacity={0.35 + v * 0.5} />
      ))}
    </>
  );
}

function Rows({ x, y, w, count = 4, gap = 30 }: { x: number; y: number; w: number; count?: number; gap?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <g key={i}>
          <line x1={x} y1={y + i * gap + 20} x2={x + w} y2={y + i * gap + 20} stroke={LINE} strokeWidth={1} />
          <Bar x={x + 10} y={y + i * gap + 6} w={90} o={0.3} />
          <Bar x={x + w * 0.45} y={y + i * gap + 6} w={38} o={0.2} />
          <Bar x={x + w * 0.65} y={y + i * gap + 6} w={38} o={0.2} />
          <rect x={x + w - 52} y={y + i * gap + 3} width={40} height={12} rx={6} fill={i % 2 ? OK : BRAND} opacity={0.2} />
        </g>
      ))}
    </>
  );
}

const VARIANTS: Record<MockVariant, React.ReactNode> = {
  dashboard: (
    <Shell>
      <Kpis />
      <Panel x={152} y={148} w={286} h={132} />
      <Bar x={166} y={162} w={78} h={6} fill={INK} o={0.5} />
      <LineChart x={168} y={186} w={254} h={78} />
      <Panel x={452} y={148} w={172} h={132} />
      <Bar x={466} y={162} w={62} h={6} fill={INK} o={0.5} />
      <BarChart x={468} y={188} w={142} h={76} />
      <Panel x={152} y={294} w={472} h={90} />
      <Rows x={152} y={306} w={472} count={2} />
    </Shell>
  ),
  training: (
    <Shell>
      {/* Video player with a playlist beside it. */}
      <rect x={152} y={70} width={296} height={168} rx={10} fill={INK} opacity={0.08} stroke={LINE} strokeWidth={1.5} />
      <circle cx={300} cy={154} r={26} fill={BRAND} opacity={0.9} />
      <path d="M293,144 L313,154 L293,164 Z" fill="#fff" />
      <rect x={166} y={218} width={268} height={5} rx={2.5} fill={SOFT} opacity={0.25} />
      <rect x={166} y={218} width={158} height={5} rx={2.5} fill={BRAND} />
      <Panel x={462} y={70} w={162} h={168} />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <circle cx={480} cy={92 + i * 30} r={7} fill={i < 2 ? OK : SOFT} opacity={i < 2 ? 0.85 : 0.25} />
          {i < 2 && <path d={`M477,${92 + i * 30} l2.5,2.5 l4.5,-5`} stroke="#fff" strokeWidth={1.6} fill="none" strokeLinecap="round" />}
          <Bar x={496} y={89 + i * 30} w={i % 2 ? 92 : 108} o={0.28} />
        </g>
      ))}
      <Panel x={152} y={252} w={472} h={132} />
      <Bar x={168} y={268} w={104} h={7} fill={INK} o={0.5} />
      {[0, 1, 2].map((i) => <Bar key={i} x={168} y={292 + i * 18} w={i === 2 ? 300 : 434} o={0.2} />)}
      <rect x={168} y={348} width={96} height={22} rx={8} fill={BRAND} opacity={0.9} />
    </Shell>
  ),
  exam: (
    <Shell>
      <Panel x={152} y={70} w={472} h={150} />
      <rect x={168} y={86} width={54} height={18} rx={9} fill={BRAND} opacity={0.15} />
      <Bar x={168} y={118} w={366} h={8} fill={INK} o={0.55} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={168} y={142 + i * 0} width={0} height={0} />
        </g>
      ))}
      {[0, 1].map((i) => (
        <g key={i}>
          <rect x={168} y={144 + i * 30} width={218} height={24} rx={8} fill={PAGE} stroke={LINE} strokeWidth={1.5} />
          <circle cx={184} cy={156 + i * 30} r={5.5} fill={i === 0 ? BRAND : SOFT} opacity={i === 0 ? 1 : 0.3} />
          <Bar x={198} y={153 + i * 30} w={120} o={0.28} />
          <rect x={396} y={144 + i * 30} width={218} height={24} rx={8} fill={PAGE} stroke={LINE} strokeWidth={1.5} />
          <circle cx={412} cy={156 + i * 30} r={5.5} fill={SOFT} opacity={0.3} />
          <Bar x={426} y={153 + i * 30} w={132} o={0.28} />
        </g>
      ))}
      {/* Result summary. */}
      <Panel x={152} y={234} w={228} h={150} />
      <circle cx={266} cy={296} r={40} fill="none" stroke={LINE} strokeWidth={9} />
      <circle cx={266} cy={296} r={40} fill="none" stroke={OK} strokeWidth={9} strokeLinecap="round"
        strokeDasharray="251" strokeDashoffset="60" transform="rotate(-90 266 296)" />
      <Bar x={236} y={348} w={60} h={7} fill={INK} o={0.5} />
      <Panel x={396} y={234} w={228} h={150} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <circle cx={416} cy={258 + i * 32} r={6} fill={i === 2 ? "var(--danger)" : OK} opacity={0.8} />
          <Bar x={432} y={255 + i * 32} w={i % 2 ? 150 : 172} o={0.24} />
        </g>
      ))}
    </Shell>
  ),
  simulation: (
    <Shell>
      {/* Three live metrics. */}
      {[["cash", COIN], ["sat", OK], ["rep", BRAND]].map(([, color], i) => {
        const x = 152 + i * 160;
        return (
          <g key={i}>
            <Panel x={x} y={70} w={144} h={70} />
            <Bar x={x + 14} y={86} w={48} h={4} o={0.3} />
            <Bar x={x + 14} y={100} w={44} h={11} fill={INK} o={0.6} r={3} />
            <rect x={x + 14} y={122} width={116} height={5} rx={2.5} fill={SOFT} opacity={0.2} />
            <rect x={x + 14} y={122} width={[84, 62, 98][i]} height={5} rx={2.5} fill={color as string} />
          </g>
        );
      })}
      <Panel x={152} y={154} w={472} h={80} />
      <rect x={168} y={168} width={46} height={16} rx={8} fill={BRAND} opacity={0.15} />
      {[0, 1].map((i) => <Bar key={i} x={168} y={196 + i * 16} w={i ? 322 : 428} o={0.22} />)}
      {/* Decision options. */}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={152 + i * 160} y={248} width={144} height={90} rx={10}
            fill={SURFACE} stroke={i === 0 ? BRAND : LINE} strokeWidth={i === 0 ? 2 : 1.5} />
          <Bar x={166 + i * 160} y={264} w={70} h={6} fill={INK} o={0.5} />
          <Bar x={166 + i * 160} y={282} w={112} o={0.2} />
          <Bar x={166 + i * 160} y={296} w={88} o={0.2} />
          <rect x={166 + i * 160} y={314} width={54} height={14} rx={7} fill={BRAND} opacity={i === 0 ? 0.85 : 0.18} />
        </g>
      ))}
      <rect x={152} y={352} width={472} height={6} rx={3} fill={SOFT} opacity={0.18} />
      <rect x={152} y={352} width={196} height={6} rx={3} fill={BRAND} />
    </Shell>
  ),
  jury: (
    <Shell>
      {/* PDF preview beside the scoring sliders. */}
      <rect x={152} y={70} width={230} height={314} rx={10} fill={PAGE} stroke={LINE} strokeWidth={1.5} />
      <rect x={168} y={86} width={198} height={44} rx={6} fill={SOFT} opacity={0.12} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <Bar key={i} x={168} y={146 + i * 17} w={i % 3 === 2 ? 118 : 198} h={5} o={0.18} />
      ))}
      <rect x={168} y={300} width={198} height={64} rx={6} fill={BRAND} opacity={0.08} />
      <Panel x={398} y={70} w={226} h={314} />
      <Bar x={414} y={88} w={94} h={7} fill={INK} o={0.5} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <Bar x={414} y={116 + i * 62} w={i % 2 ? 96 : 118} h={5} o={0.28} />
          <rect x={414} y={132 + i * 62} width={194} height={5} rx={2.5} fill={SOFT} opacity={0.2} />
          <rect x={414} y={132 + i * 62} width={[150, 108, 176, 128][i]} height={5} rx={2.5} fill={BRAND} />
          <circle cx={414 + [150, 108, 176, 128][i]} cy={134.5 + i * 62} r={8} fill={BRAND} />
          <Bar x={414} y={150 + i * 62} w={72} h={4} o={0.16} />
        </g>
      ))}
      <rect x={414} y={352} width={194} height={20} rx={8} fill={BRAND} opacity={0.9} />
    </Shell>
  ),
  ranking: (
    <Shell>
      <Kpis />
      <Panel x={152} y={148} w={472} h={236} />
      <Bar x={168} y={166} w={104} h={7} fill={INK} o={0.5} />
      <line x1={152} y1={190} x2={624} y2={190} stroke={LINE} strokeWidth={1.5} />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <line x1={152} y1={228 + i * 36} x2={624} y2={228 + i * 36} stroke={LINE} strokeWidth={1} />
          <circle cx={182} cy={210 + i * 36} r={11} fill={i === 0 ? COIN : BRAND} opacity={i === 0 ? 0.9 : 0.15} />
          <Bar x={204} y={206 + i * 36} w={128 - i * 8} o={0.3} />
          {/* Per-criterion scores. */}
          {[0, 1, 2].map((c) => (
            <Bar key={c} x={368 + c * 56} y={206 + i * 36} w={30} o={0.2} />
          ))}
          <rect x={554} y={202 + i * 36} width={56} height={16} rx={8} fill={OK} opacity={0.18} />
        </g>
      ))}
    </Shell>
  ),
  certificate: (
    <Shell>
      {/* The document itself, centred, with issue controls beside it. */}
      <rect x={168} y={78} width={272} height={288} rx={8} fill={SURFACE} stroke={LINE} strokeWidth={2} />
      <rect x={182} y={92} width={244} height={260} rx={4} fill="none" stroke={BRAND} strokeWidth={1.5} opacity={0.4} />
      <circle cx={304} cy={132} r={18} fill={BRAND} opacity={0.12} />
      <path d="M296,132 l6,6 l11,-12" stroke={BRAND} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Bar x={228} y={166} w={152} h={9} fill={INK} o={0.5} />
      <Bar x={252} y={188} w={104} h={5} o={0.22} />
      <Bar x={214} y={216} w={180} h={12} fill={INK} o={0.6} r={3} />
      <Bar x={244} y={244} w={120} h={5} o={0.2} />
      <line x1={206} y1={292} x2={272} y2={292} stroke={LINE} strokeWidth={1.5} />
      <line x1={336} y1={292} x2={402} y2={292} stroke={LINE} strokeWidth={1.5} />
      <Bar x={216} y={300} w={46} h={4} o={0.2} />
      <Bar x={346} y={300} w={46} h={4} o={0.2} />
      <rect x={244} y={324} width={120} height={16} rx={4} fill={SOFT} opacity={0.12} />
      <Panel x={462} y={78} w={162} h={288} />
      <Bar x={478} y={96} w={86} h={6} fill={INK} o={0.5} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={478} y={120 + i * 42} width={130} height={26} rx={7} fill={PAGE} stroke={LINE} strokeWidth={1.5} />
          <Bar x={490} y={130 + i * 42} w={72 - i * 10} o={0.24} />
        </g>
      ))}
      <rect x={478} y={252} width={130} height={22} rx={8} fill={BRAND} opacity={0.9} />
      <rect x={478} y={284} width={130} height={22} rx={8} fill={BRAND} opacity={0.14} />
    </Shell>
  ),
  analytics: (
    <Shell>
      {/* Filter bar, then KPIs, charts and the course table. */}
      <Panel x={152} y={68} w={472} h={40} r={9} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={166 + i * 104} y={80} width={92} height={16} rx={6} fill={PAGE} stroke={LINE} strokeWidth={1.2} />
      ))}
      <rect x={532} y={80} width={78} height={16} rx={6} fill={BRAND} opacity={0.15} />
      <Kpis y={120} />
      <Panel x={152} y={198} w={230} h={110} />
      <Bar x={166} y={212} w={72} h={6} fill={INK} o={0.5} />
      <LineChart x={168} y={234} w={198} h={60} />
      <Panel x={394} y={198} w={230} h={110} />
      <Bar x={408} y={212} w={72} h={6} fill={INK} o={0.5} />
      <BarChart x={410} y={236} w={196} h={58} />
      <Panel x={152} y={322} w={472} h={62} />
      <Rows x={152} y={332} w={472} count={2} gap={26} />
    </Shell>
  ),
};

export function ScreenshotMock({ variant }: { variant: MockVariant }) {
  return (
    <svg
      viewBox="0 0 640 400"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      {VARIANTS[variant]}
    </svg>
  );
}
