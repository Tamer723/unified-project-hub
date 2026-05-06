import { useTranslation } from "react-i18next";
import { Camera, ScrollText, Globe2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const cardIcons = [ScrollText, Camera, Globe2];

const mainVideo =
  "https://images.unsplash.com/photo-1524069290683-0457abfe42c3?auto=format&fit=crop&w=900&q=80";
const archiveVideo =
  "https://images.unsplash.com/photo-1518398046578-8cca57782e17?auto=format&fit=crop&w=900&q=80";
const thumbs = [
  "https://images.unsplash.com/photo-1542816417-0983670dfe4c?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1469571486292-b53601010b89?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1506617564039-2f3b650b7010?auto=format&fit=crop&w=400&q=80",
];

export function TrustSection() {
  const { t } = useTranslation();
  const cards = t("trust.items", { returnObjects: true }) as Array<{
    title: string;
    desc: string;
  }>;

  const scrollToCheckout = () => {
    document
      .getElementById("checkout")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section id="trust" className="bg-cream py-16 md:py-24">
      <div className="container">
        <div className="mb-10 text-center">
          <span className="inline-block rounded-full bg-sand/30 px-4 py-1 text-xs font-bold text-brown-mid">
            {t("trust.eyebrow")}
          </span>
          <h2 className="mt-3 text-3xl font-black text-brown md:text-5xl">
            {t("trust.title")}
          </h2>
          <p className="mt-3 text-brown-mid">{t("trust.subtitle")}</p>
        </div>

        <div className="grid items-start gap-8 md:grid-cols-2">
          {/* Cards column (right in RTL) */}
          <div className="grid gap-4 md:order-2">
            {cards.map((item, i) => {
              const Icon = cardIcons[i];
              return (
                <div
                  key={i}
                  className="rounded-2xl border border-sand/30 bg-card p-6 shadow-soft transition-transform hover:-translate-y-1"
                >
                  <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-green-pale">
                    <Icon className="h-5 w-5 text-green" />
                  </div>
                  <h4 className="text-base font-extrabold text-brown">
                    {item.title}
                  </h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-brown-mid">
                    {item.desc}
                  </p>
                </div>
              );
            })}

            <div className="rounded-2xl border border-green bg-green p-6 text-center shadow-elevated">
              <p
                className="mb-4 text-lg leading-relaxed text-sand-light"
                style={{ fontFamily: "'Amiri', serif" }}
              >
                أضحيتك أجران
                <br />
                منك النُّسُك ومنّا الوصول
              </p>
              <Button
                onClick={scrollToCheckout}
                className="rounded-full bg-cream px-6 text-brown hover:bg-cream-dark"
              >
                {t("header.cta")}
              </Button>
            </div>
          </div>

          {/* Videos + archive column (left in RTL) */}
          <div className="grid gap-5 md:order-1">
            <VideoCard
              src={mainVideo}
              label={`🎬 ${t("trust.video_main", {
                defaultValue: "فيديو الحملة التوضيحي",
              })}`}
              size="lg"
            />
            <VideoCard
              src={archiveVideo}
              label={`📂 ${t("trust.video_archive", {
                defaultValue: "أرشيف الأعمال السابقة",
              })}`}
              size="sm"
            />
            <div className="grid grid-cols-3 gap-2">
              {thumbs.map((src, i) => (
                <button
                  key={i}
                  className="group relative aspect-square overflow-hidden rounded-xl"
                  style={{
                    backgroundImage: `url(${src})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                  aria-label={`archive-${i + 1}`}
                >
                  <span className="absolute inset-0 bg-green/10 transition-colors group-hover:bg-green/30" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function VideoCard({
  src,
  label,
  size,
}: {
  src: string;
  label: string;
  size: "lg" | "sm";
}) {
  return (
    <div
      className={`group relative cursor-pointer overflow-hidden rounded-2xl shadow-soft transition-transform hover:scale-[1.02] ${
        size === "lg" ? "aspect-video" : "aspect-[16/7]"
      }`}
      style={{
        backgroundImage: `url(${src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-green/60" />
      <div
        className={`absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-card/90 text-green shadow-elevated transition-transform group-hover:scale-110 ${
          size === "lg" ? "h-16 w-16" : "h-12 w-12"
        }`}
      >
        <Play className={size === "lg" ? "h-6 w-6 fill-current" : "h-4 w-4 fill-current"} />
      </div>
      <div className="absolute bottom-4 end-4 text-sm font-extrabold text-primary-foreground drop-shadow">
        {label}
      </div>
    </div>
  );
}
