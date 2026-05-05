import { useTranslation } from "react-i18next";
import { Instagram, Twitter, Facebook } from "lucide-react";

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="bg-brown text-primary-foreground">
      <div className="container flex flex-col items-center gap-6 py-10 md:flex-row md:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-green font-bold">ق</div>
          <span className="text-sm font-semibold">{t("header.name")}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs opacity-80">{t("footer.follow")}</span>
          {[Instagram, Twitter, Facebook].map((Icon, i) => (
            <a
              key={i}
              href="#"
              aria-label="social"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
            >
              <Icon className="h-4 w-4" />
            </a>
          ))}
        </div>
        <p className="text-center text-xs opacity-80 md:text-end">
          {t("footer.rights", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
