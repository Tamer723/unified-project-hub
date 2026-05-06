import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Heart } from "lucide-react";
import { useDirection } from "@/hooks/useDirection";
import { Button } from "@/components/ui/button";

const Success = () => {
  const { t, i18n } = useTranslation();
  const [params] = useSearchParams();
  const lang = params.get("lang");
  useEffect(() => {
    if (lang && ["ar", "tr", "en"].includes(lang) && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n]);
  useDirection();
  return (
    <div className="grid min-h-screen place-items-center bg-cream px-4">
      <div className="w-full max-w-md rounded-2xl border border-sand/40 bg-card p-8 text-center shadow-elevated">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-green-pale">
          <CheckCircle2 className="h-12 w-12 text-green" />
        </div>
        <h1 className="mt-6 inline-flex items-center justify-center gap-2 text-2xl font-bold text-brown">
          {t("success.title")}
          <Heart className="h-5 w-5 text-destructive" />
        </h1>
        <p className="mt-3 text-brown-mid">{t("success.desc")}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild className="bg-green hover:bg-green-mid text-primary-foreground rounded-full">
            <Link to="/">{t("success.home")}</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full border-brown/30">
            <Link to="/#tracks">{t("success.again")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Success;
