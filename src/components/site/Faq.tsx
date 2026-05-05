import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function Faq() {
  const { t } = useTranslation();
  const items = t("faq.items", { returnObjects: true }) as Array<{ q: string; a: string }>;
  return (
    <section className="bg-cream-dark/60 py-16 md:py-24">
      <div className="container max-w-3xl">
        <h2 className="mb-10 text-center text-3xl font-bold text-brown md:text-4xl">
          {t("faq.title")}
        </h2>
        <Accordion type="single" collapsible className="space-y-3">
          {items.map((it, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="rounded-xl border border-sand/40 bg-card px-4 shadow-soft"
            >
              <AccordionTrigger className="text-start text-base font-semibold text-brown hover:no-underline">
                {it.q}
              </AccordionTrigger>
              <AccordionContent className="text-brown-mid">{it.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
