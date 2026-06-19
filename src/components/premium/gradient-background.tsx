import { cn } from "@/lib/utils";

type GradientBackgroundProps = {
  className?: string;
};

export function GradientBackground({ className }: GradientBackgroundProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(61,59,255,0.12),transparent_22%),radial-gradient(circle_at_top_right,rgba(71,183,255,0.1),transparent_18%),radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.78),transparent_30%),linear-gradient(180deg,#ffffff_0%,#ffffff_58%,#fbfcff_100%)]" />
      <div className="absolute left-[-10%] top-[-12rem] h-[28rem] w-[28rem] rounded-full bg-[#e9ebff] blur-3xl" />
      <div className="absolute right-[-8%] top-[12rem] h-[22rem] w-[22rem] rounded-full bg-[#dff6ff] blur-3xl" />
      <div className="hero-grid absolute inset-x-0 top-0 h-[36rem] opacity-[0.28] [mask-image:linear-gradient(180deg,black,transparent_82%)]" />
    </div>
  );
}
