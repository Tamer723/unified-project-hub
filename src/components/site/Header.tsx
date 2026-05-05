import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { CountdownBar } from "./CountdownBar";

export function Header() {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-50 bg-brown text-primary-foreground shadow-soft">
      <div className="container flex items-center justify-between gap-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-green text-primary-foreground font-bold">
            ق
          </div>
          <span className="hidden text-sm font-semibold sm:block">
            {t("header.name")}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Button
            asChild
            size="sm"
            className="bg-green hover:bg-green-mid text-primary-foreground rounded-full"
          >
            <a href="#tracks">{t("header.cta")}</a>
          </Button>
        </div>
      </div>
      <CountdownBar />
    </header>
  );
}
