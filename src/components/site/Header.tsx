import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LanguageBar } from "./LanguageBar";
import { CountdownBar } from "./CountdownBar";

export function Header() {
  const { t } = useTranslation();
  const links = [
    { href: "#why", k: "why" },
    { href: "#tracks", k: "tracks" },
    { href: "#trust", k: "trust" },
    { href: "#faq", k: "faq" },
  ];

  return (
    <header className="sticky top-0 z-50">
      <LanguageBar />
      <CountdownBar />
      <div className="border-b border-sand/30 bg-background/85 backdrop-blur-md">
        <div className="container flex items-center justify-between gap-4 py-3">
          <a href="#" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-green text-primary-foreground font-extrabold shadow-soft">
              ق
            </div>
            <span className="hidden text-sm font-bold text-brown sm:block">
              {t("header.name")}
            </span>
          </a>
          <nav className="hidden items-center gap-6 md:flex">
            {links.map((l) => (
              <a key={l.k} href={l.href} className="text-sm font-semibold text-brown-mid transition-colors hover:text-green">
                {t(`header.nav.${l.k}`)}
              </a>
            ))}
          </nav>
          <Button
            asChild
            size="sm"
            className="rounded-full bg-green hover:bg-green-mid text-primary-foreground shadow-soft"
          >
            <a href="#tracks">{t("header.cta")}</a>
          </Button>
        </div>
      </div>
    </header>
  );
}
