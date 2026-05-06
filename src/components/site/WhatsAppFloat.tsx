import { useTranslation } from "react-i18next";
import { MessageCircle } from "lucide-react";
import { WHATSAPP_NUMBER } from "@/lib/constants";

export function WhatsAppFloat() {
  const { t } = useTranslation();
  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("whatsapp.aria")}
      className="fixed bottom-20 end-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-green text-primary-foreground shadow-float transition-transform hover:scale-110 md:bottom-6"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
