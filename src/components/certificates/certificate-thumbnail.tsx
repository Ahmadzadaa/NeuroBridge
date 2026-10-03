import { Award } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A small paper-like likeness of a certificate, in the colours of its
 * template: gold guilloche for achievement, navy and gold for participation,
 * cream with a wax seal for completion. It is a picture of the document, not
 * the document itself; the PDF is one click away.
 */
type Look = {
  paper: string;
  frame: string;
  inner: string;
  word: string;
  name: string;
  line: string;
  seal: string;
  pattern?: string;
};

const LOOKS: Record<string, Look> = {
  ACHIEVEMENT: {
    paper: "bg-[#fbf7ec]",
    frame: "border-[#c9a24a]",
    inner: "border-[#c9a24a]/40",
    word: "text-[#a8832f]",
    name: "text-[#2f2618]",
    line: "text-[#6b5a3e]",
    seal: "bg-gradient-to-br from-[#e6c46a] to-[#b8892a] text-white",
    pattern:
      "bg-[radial-gradient(circle_at_0%_0%,rgba(201,162,74,0.16)_0,transparent_38%),radial-gradient(circle_at_100%_100%,rgba(201,162,74,0.16)_0,transparent_38%)]",
  },
  PARTICIPATION: {
    paper: "bg-[#14213d]",
    frame: "border-[#d4af37]",
    inner: "border-[#d4af37]/30",
    word: "text-[#d4af37]",
    name: "text-white",
    line: "text-white/65",
    seal: "bg-gradient-to-br from-[#f0d27a] to-[#b8892a] text-[#14213d]",
    pattern: "bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.14)_0,transparent_55%)]",
  },
  COMPLETION: {
    paper: "bg-[#f6efe1]",
    frame: "border-[#8a6a4a]/60",
    inner: "border-[#8a6a4a]/25",
    word: "text-[#8a6a4a]",
    name: "text-[#3d2c1e]",
    line: "text-[#7a6450]",
    seal: "bg-gradient-to-br from-[#b3263a] to-[#7d1424] text-[#f6efe1]",
  },
};

export function CertificateThumbnail({
  type,
  word,
  typeLabel,
  recipient,
  title,
  revoked,
  className,
}: {
  type: string;
  /** "CERTIFICATE", in the reader's language. */
  word: string;
  typeLabel: string;
  recipient: string;
  title: string;
  revoked?: boolean;
  className?: string;
}) {
  const look = LOOKS[type] ?? LOOKS.ACHIEVEMENT;
  return (
    <div
      className={cn("relative aspect-[1.414/1] w-full overflow-hidden rounded-[14px] p-[6%]", look.paper, look.pattern, revoked && "grayscale opacity-60", className)}
      aria-hidden="true"
    >
      <div className={cn("absolute inset-[4%] rounded-[6px] border-[1.5px]", look.frame)} />
      <div className={cn("absolute inset-[6%] rounded-[4px] border", look.inner)} />
      <div className="relative flex h-full flex-col items-center justify-center px-[6%] text-center">
        <p className={cn("text-[clamp(8px,1.6vw,11px)] font-semibold tracking-[0.32em]", look.word)}>{word}</p>
        <p className={cn("mt-0.5 text-[clamp(7px,1.3vw,9px)] uppercase tracking-[0.18em]", look.line)}>{typeLabel}</p>
        <p className={cn("mt-[6%] line-clamp-1 font-serif text-[clamp(14px,2.6vw,20px)] italic leading-tight", look.name)}>{recipient}</p>
        <span className={cn("mt-[3%] h-px w-2/5", look.frame, "border-t")} />
        <p className={cn("mt-[3%] line-clamp-2 text-[clamp(8px,1.4vw,10px)] leading-snug", look.line)}>{title}</p>
      </div>
      <span
        className={cn(
          "absolute flex h-[18%] w-auto aspect-square items-center justify-center rounded-full shadow-[0_4px_10px_-4px_rgba(0,0,0,0.45)]",
          type === "COMPLETION" ? "bottom-[9%] right-[9%]" : "bottom-[8%] left-1/2 -translate-x-1/2",
          look.seal
        )}
      >
        <Award className="h-[55%] w-[55%]" strokeWidth={2} />
      </span>
    </div>
  );
}
