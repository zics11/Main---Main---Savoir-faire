import { eq } from "drizzle-orm";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { DomaineIllustration } from "@/components/site/DomaineIllustration";
import { MapPreview } from "@/components/map/MapPreview";
import {
  DOMAINE_EXEMPLES,
  DOMAINE_LABELS,
  TYPES_TRANSMISSION,
} from "@/lib/constants";
import { db } from "@/lib/db";
import { DOMAINES, transmetteurs } from "@/lib/db/schema";
import { getPublishedTransmetteurs } from "@/lib/queries";

const ETAPES = [
  {
    num: "I",
    titre: "Cherchez sur la carte",
    desc: "Filtrez par savoir-faire, distance, type de transmission, hébergement, niveau. Chaque point est un transmetteur près de chez vous.",
  },
  {
    num: "II",
    titre: "Contactez directement",
    desc: "Écrivez à la personne depuis sa fiche. Pas de réservation, pas de paiement en ligne : vous échangez librement.",
  },
  {
    num: "III",
    titre: "Arrangez-vous entre vous",
    desc: "Stage, échange, coup de main bénévole… Vous fixez ensemble les conditions. La plateforme ne prélève jamais rien.",
  },
];

const RAISONS = [
  {
    titre: "Vous choisissez la forme",
    desc: "Stage payant, échange, coup de main bénévole, portes ouvertes… et vous fixez vos conditions.",
  },
  {
    titre: "Aucun frais, aucune commission",
    desc: "La fiche est gratuite. Ce que vous convenez avec vos apprenants vous revient en entier.",
  },
  {
    titre: "Contact direct",
    desc: "Les personnes intéressées vous écrivent directement. Pas de réservation imposée, pas d'intermédiaire.",
  },
  {
    titre: "Un geste qui reste",
    desc: "Chaque personne formée fait vivre votre métier une génération de plus.",
  },
];

const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@mainamain.fr";

export default async function AccueilPage() {
  const [points, counts, exemple] = await Promise.all([
    getPublishedTransmetteurs(),
    db.query.transmetteurs.findMany({
      where: eq(transmetteurs.publiee, true),
      columns: { domaine: true },
    }),
    db.query.transmetteurs.findFirst({
      where: eq(transmetteurs.publiee, true),
      columns: { slug: true },
    }),
  ]);

  const countByDomaine = Object.fromEntries(
    DOMAINES.map((d) => [d, counts.filter((c) => c.domaine === d).length])
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-12 px-6 py-16 sm:px-12 lg:grid-cols-[1fr_440px] lg:py-20">
          <div>
            <div className="mb-4 text-xs tracking-wider text-primary uppercase">
              Plateforme de mise en relation — gratuite, sans commission
            </div>
            <h1 className="mb-5 font-serif text-5xl leading-tight font-semibold text-balance">
              Les savoir-faire manuels se transmettent de main à main
            </h1>
            <p className="mb-8 max-w-[46ch] text-[17px] leading-relaxed text-foreground/80">
              Partout en France, des artisans, paysans et bâtisseurs ouvrent
              leur atelier à celles et ceux qui veulent apprendre.
              Trouvez-les sur la carte, contactez-les directement,
              arrangez-vous entre vous.
            </p>
            <div className="flex flex-wrap items-center gap-3.5">
              <Link
                href="/carte"
                className="rounded-sm bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground hover:bg-[#8a4222]"
              >
                Explorer la carte
              </Link>
              {exemple && (
                <Link
                  href={`/fiche/${exemple.slug}`}
                  className="px-2 py-3.5 text-sm font-medium hover:text-primary"
                >
                  Voir un exemple de fiche →
                </Link>
              )}
            </div>
          </div>
          <div className="h-[360px] overflow-hidden rounded-sm border border-border sm:h-[420px]">
            <MapPreview points={points} />
          </div>
        </section>

        {/* Trois étapes */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-5xl px-6 py-16 sm:px-12">
            <h2 className="mb-8 font-serif text-3xl font-semibold">
              Trois étapes, aucun intermédiaire
            </h2>
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
              {ETAPES.map((e) => (
                <div key={e.num} className="border-t-2 border-primary pt-5">
                  <div className="mb-2.5 font-serif text-xl text-primary">
                    {e.num}
                  </div>
                  <div className="mb-2 text-base font-semibold">{e.titre}</div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {e.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quatre familles */}
        <section className="border-t border-border bg-secondary">
          <div className="mx-auto max-w-5xl px-6 py-16 sm:px-12">
            <h2 className="mb-7 font-serif text-3xl font-semibold">
              Quatre familles de savoir-faire
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {DOMAINES.map((d) => (
                <Link
                  key={d}
                  href={`/carte?domaine=${d}`}
                  className="block overflow-hidden rounded-sm border border-border bg-background hover:border-primary"
                >
                  <div className="flex h-[150px] items-center justify-center bg-[#f3eadd]">
                    <DomaineIllustration domaine={d} />
                  </div>
                  <div className="px-6 py-5">
                    <div className="mb-2 font-serif text-2xl font-semibold">
                      {DOMAINE_LABELS[d]}
                    </div>
                    <div className="mb-3.5 text-[13.5px] leading-relaxed text-muted-foreground">
                      {DOMAINE_EXEMPLES[d]}
                    </div>
                    <div className="text-xs font-semibold text-primary">
                      {countByDomaine[d]} transmetteur{countByDomaine[d] > 1 ? "s" : ""} →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Formes de transmission */}
        <section className="border-t border-border">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-14 px-6 py-16 sm:px-12 lg:grid-cols-[380px_1fr]">
            <div>
              <h2 className="mb-4 font-serif text-3xl leading-snug font-semibold">
                Chacun transmet à sa manière
              </h2>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                Contre rémunération, en échange, en aide bénévole ou
                gratuitement — chaque transmetteur choisit. La plateforme
                n&apos;impose rien et ne prélève rien.
              </p>
            </div>
            <div className="flex flex-wrap content-start gap-2.5">
              {TYPES_TRANSMISSION.map((t) => (
                <span
                  key={t}
                  className="rounded-sm border border-input bg-card px-4.5 py-2.5 text-sm font-medium text-foreground/80"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Transmettre */}
        <section id="transmettre" className="border-t border-border bg-secondary">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-14 px-6 py-18 sm:px-12 lg:grid-cols-[400px_1fr]">
            <div>
              <h2 className="mb-4 font-serif text-3xl leading-snug font-semibold">
                Transmettre son savoir-faire
              </h2>
              <p className="mb-7 text-[15px] leading-relaxed text-muted-foreground">
                Charpentier, potière, boulanger, greffeuse… Si vous pratiquez
                un savoir-faire manuel, une fiche sur la carte suffit pour
                être trouvé·e par celles et ceux qui veulent apprendre.
                Écrivez-nous, l&apos;association crée votre fiche avec vous.
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-block rounded-sm bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground hover:bg-[#8a4222]"
              >
                Écrire à l&apos;association
              </a>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {RAISONS.map((r) => (
                <div
                  key={r.titre}
                  className="rounded-sm border border-border bg-background p-5.5"
                >
                  <div className="mb-1.5 text-[15px] font-semibold">
                    {r.titre}
                  </div>
                  <div className="text-sm leading-relaxed text-muted-foreground">
                    {r.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Manifeste + association */}
        <section id="association" className="bg-[#2b2620] text-[#faf8f4]">
          <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-16 px-6 py-20 sm:px-12 lg:grid-cols-[1fr_360px]">
            <div>
              <p className="mb-6 text-balance font-serif text-[28px] leading-snug font-medium">
                « Un savoir-faire qui ne se transmet plus disparaît en une
                génération. Nous sommes une association loi 1901 : pas de
                publicité, pas de commission, un patrimoine vivant à faire
                circuler. »
              </p>
            </div>
            <div className="rounded-sm border border-[#faf8f4]/25 p-8">
              <div className="mb-3 text-[11px] tracking-wider text-[#d9925f] uppercase">
                Soutenir Main à Main
              </div>
              <p className="mb-3.5 font-serif text-xl leading-snug font-medium">
                Le don n&apos;est pas obligatoire. Il est nécessaire.
              </p>
              <p className="mb-5 text-sm leading-relaxed text-[#cfc8bb]">
                La plateforme est et restera gratuite. Elle ne vit que des
                dons et adhésions de celles et ceux qui, comme vous, tiennent
                à ce que ces gestes ne se perdent pas.
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="block rounded-sm bg-primary px-0 py-3 text-center text-sm font-medium text-[#faf8f4] hover:bg-[#8a4222]"
              >
                Nous contacter
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
