import { useTranslation } from "react-i18next";
import { useCountdown } from "@/hooks/useCountdown";
import { EID_DATE } from "@/lib/constants";

export function CountdownBar() {
  const { t } = useTranslation();
  const { days, hours, minutes, seconds } = useCountdown(EID_DATE);
  const cells = [
    { v: days, l: t("header.countdown.days") },
    { v: hours, l: t("header.countdown.hours") },
    { v: minutes, l: t("header.countdown.minutes") },
    { v: seconds, l: t("header.countdown.seconds") },
  ];
  return (
    <div className="bg-gradient-to-r from-green to-green-mid text-primary-foreground">
      <div className="container flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-2 text-sm">
        <span className="font-medium opacity-95">{t("header.countdown.prefix")}</span>
        <div className="flex items-center gap-3">
          {cells.map((c, i) => (
            <div key={i} className="flex items-baseline gap-1">
              <span className="text-base font-bold tabular-nums">
                {String(c.v).padStart(2, "0")}
              </span>
              <span className="text-xs opacity-80">{c.l}</span>
            </div>
          ))}
        </div>
        <span className="opacity-60">•</span>
        <a href="#tracks" className="font-bold underline-offset-2 hover:underline">
          {t("header.countdown.cta")}
        </a>
      </div>
    </div>
  );
}
