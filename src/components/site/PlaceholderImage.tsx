import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  ratio?: "square" | "video" | "wide" | "portrait";
  className?: string;
  label?: string;
};

const ratioClass = {
  square: "aspect-square",
  video: "aspect-[4/3]",
  wide: "aspect-[16/9]",
  portrait: "aspect-[4/5]",
};

export function PlaceholderImage({ icon: Icon, ratio = "video", className, label }: Props) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-3xl border border-sand/40 bg-gradient-to-br from-cream-dark via-cream to-green-pale shadow-soft",
        ratioClass[ratio],
        className,
      )}
    >
      <div className="absolute inset-0 bg-pattern-dots opacity-50" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="grid h-28 w-28 place-items-center rounded-full bg-card/60 backdrop-blur-sm shadow-soft">
          <Icon className="h-14 w-14 text-green/80" strokeWidth={1.25} />
        </div>
      </div>
      {label && (
        <span className="absolute bottom-3 start-3 rounded-full bg-background/85 px-3 py-1 text-xs font-bold text-brown backdrop-blur-sm shadow-soft">
          {label}
        </span>
      )}
    </div>
  );
}
