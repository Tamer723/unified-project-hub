import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function LanguageBar() {
  const { t } = useTranslation();
  return (
    <div className="bg-brown-dark text-primary-foreground">
      <div className="container flex items-center justify-between gap-3 py-2 text-xs">
        <div className="flex items-center gap-2 opacity-90">
          <span className="hidden sm:inline">{t("header.lang_bar.tag")}</span>
          <span className="opacity-60">|</span>
          <span>{t("header.name")}</span>
        </div>
        <LanguageSwitcher />
      </div>
    </div>
  );
}
