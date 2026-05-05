import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const langs = [
  { code: "ar", label: "AR" },
  { code: "tr", label: "TR" },
  { code: "en", label: "EN" },
] as const;

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = (i18n.language || "ar").split("-")[0];
  return (
    <div className="inline-flex gap-1 rounded-full bg-white/10 p-1">
      {langs.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => i18n.changeLanguage(l.code)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
            current === l.code
              ? "bg-sand text-brown"
              : "text-white/70 hover:text-white",
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
