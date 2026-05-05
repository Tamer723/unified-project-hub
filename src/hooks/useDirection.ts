import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export function useDirection() {
  const { i18n } = useTranslation();
  useEffect(() => {
    const lng = (i18n.language || "ar").split("-")[0];
    const dir = lng === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lng;
    document.documentElement.dir = dir;
  }, [i18n.language]);
}
