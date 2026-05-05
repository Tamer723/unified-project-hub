import { useTranslation } from "react-i18next";
import { Camera, ShieldCheck, FileCheck } from "lucide-react";

export function TrustSection() {
  const { t } = useTranslation();
  const items = t("trust.items", { returnObjects: true }) as Array<{ title: string; desc: string }>;
  const icons = [Camera, ShieldCheck, FileCheck];
  return (
    <section id="trust" className="bg-cream py-16 md:py-24">
      <div className="container">
        <h2 className="mb-10 text-center text-3xl font-bold text-brown md:text-4xl">
          {t("trust.title")}
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((item, i) => {
            const Icon = icons[i];
            return (
              <div
                key={i}
                className="rounded-2xl border border-sand/30 bg-card p-6 text-center shadow-soft"
              >
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-pale">
                  <Icon className="h-7 w-7 text-green" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-brown">{item.title}</h3>
                <p className="mt-2 text-sm text-brown-mid">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
