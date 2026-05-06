import { useTranslation } from "react-i18next";
import { Instagram, Twitter, Facebook, MapPin, Mail, Phone } from "lucide-react";

export function Footer() {
  const { t } = useTranslation();
  const links = t("footer.links_list", { returnObjects: true }) as Array<{ label: string; href: string }>;

  return (
    <footer className="bg-brown text-primary-foreground">
      <div className="container grid gap-10 py-14 md:grid-cols-3">
        {/* About */}
        <div>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-green font-extrabold">ق</div>
            <span className="text-base font-bold">{t("header.name")}</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed opacity-80">{t("footer.about.text")}</p>
          <div className="mt-5 flex items-center gap-2">
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
        </div>

        {/* Quick links */}
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-sand">{t("footer.links.title")}</h4>
          <ul className="mt-4 space-y-2 text-sm">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="opacity-80 transition-opacity hover:opacity-100 hover:text-sand">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-sand">{t("footer.contact.title")}</h4>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-start gap-2 opacity-90">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sand" />
              <span>{t("footer.contact.address")}</span>
            </li>
            <li className="flex items-center gap-2 opacity-90">
              <Mail className="h-4 w-4 shrink-0 text-sand" />
              <a href={`mailto:${t("footer.contact.email")}`}>{t("footer.contact.email")}</a>
            </li>
            <li className="flex items-center gap-2 opacity-90">
              <Phone className="h-4 w-4 shrink-0 text-sand" />
              <a href={`tel:${t("footer.contact.phone")}`} dir="ltr">{t("footer.contact.phone")}</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container py-4 text-center text-xs opacity-70">
          {t("footer.rights", { year: new Date().getFullYear() })}
        </div>
      </div>
    </footer>
  );
}
