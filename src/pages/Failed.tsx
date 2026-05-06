import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { XCircle } from "lucide-react";
import { useDirection } from "@/hooks/useDirection";
import { Button } from "@/components/ui/button";

const Failed = () => {
  const { t, i18n } = useTranslation();
  const [params] = useSearchParams();
  const lang = params.get("lang");
  const reason = params.get("reason");
  useEffect(() => {
    if (lang && ["ar", "tr", "en"].includes(lang) && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n]);
  useDirection();
  return (
    <div className="grid min-h-screen place-items-center bg-cream px-4">
      <div className="w-full max-w-md rounded-2xl border border-destructive/30 bg-card p-8 text-center shadow-elevated">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-destructive/10">
          <XCircle className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-brown">{t("failed.title")}</h1>
        <p className="mt-3 text-brown-mid">{t("failed.desc")}</p>
        {reason && (
          <p className="mt-2 rounded-md bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
            {reason}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild className="bg-green hover:bg-green-mid text-primary-foreground rounded-full">
            <Link to="/#tracks">{t("failed.retry")}</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full border-brown/30">
            <Link to="/">{t("failed.home")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Failed;
