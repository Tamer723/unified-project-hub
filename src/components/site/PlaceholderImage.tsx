import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  ratio?: "square" | "video" | "wide";
  className?: string;
  label?: string;
};

const ratioClass = {
  square: "aspect-square",
  video: "aspect-[4/3]",
  wide: "aspect-[16/9]",
};

export function PlaceholderImage({ icon: Icon, ratio = "video", className, label }: Props) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-sand/40 bg-gradient-to-br from-cream-dark to-green-pale shadow-soft",
        ratioClass[ratio],
        className,
      )}
    >
      <div className="absolute inset-0 grid place-items-center">
        <Icon className="h-20 w-20 text-green/70" strokeWidth={1.25} />
      </div>
      {label && (
        <span className="absolute bottom-3 start-3 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-brown backdrop-blur-sm">
          {label}
        </span>
      )}
    </div>
  );
}
