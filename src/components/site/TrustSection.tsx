import { useTranslation } from "react-i18next";
import { Camera, ShieldCheck, FileCheck, Users, Award, Clock, HeartHandshake } from "lucide-react";

const cardIcons = [Camera, ShieldCheck, FileCheck];
const badgeIcons = [Users, Award, Clock, HeartHandshake];

export function TrustSection() {
  const { t } = useTranslation();
  const cards = t("trust.items", { returnObjects: true }) as Array<{ title: string; desc: string }>;
  const badges = t("trust.badges", { returnObjects: true }) as Array<{ label: string; value: string }>;

  return (
    <section id="trust" className="bg-cream py-16 md:py-24">
      <div className="container">
        <div className="mb-10 text-center">
          <span className="inline-block rounded-full bg-sand/20 px-4 py-1 text-xs font-bold text-brown-mid">
            {t("trust.eyebrow")}
          </span>
          <h2 className="mt-3 text-3xl font-black text-brown md:text-4xl">
            {t("trust.title")}
          </h2>
          <p className="mt-3 text-brown-mid">{t("trust.subtitle")}</p>
        </div>

        {/* Badges row */}
        <div className="mx-auto mb-10 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">
          {badges.map((b, i) => {
            const Icon = badgeIcons[i];
            return (
              <div key={i} className="flex items-center gap-3 rounded-2xl border border-sand/30 bg-card px-4 py-3 shadow-soft">
                <Icon className="h-5 w-5 shrink-0 text-green" />
                <div>
                  <div className="text-base font-extrabold text-brown leading-none">{b.value}</div>
                  <div className="mt-1 text-[11px] text-brown-mid">{b.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((item, i) => {
            const Icon = cardIcons[i];
            return (
              <div
                key={i}
                className="rounded-3xl border border-sand/30 bg-card p-6 text-center shadow-soft transition-shadow hover:shadow-elevated"
              >
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-green-pale">
                  <Icon className="h-7 w-7 text-green" />
                </div>
                <h3 className="mt-4 text-lg font-extrabold text-brown">{item.title}</h3>
                <p className="mt-2 text-sm text-brown-mid leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
