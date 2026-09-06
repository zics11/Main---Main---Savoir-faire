import { and, eq, gte } from "drizzle-orm";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ContactProvider, ContactTrigger } from "@/components/contact/ContactModal";
import { PhotoGallery } from "@/components/fiche/PhotoGallery";
import { StagePhotos } from "@/components/fiche/StagePhotos";
import { sendContactRequest } from "./contact-actions";
import { MapPreview } from "@/components/map/MapPreview";
import { DOMAINE_LABELS } from "@/lib/constants";
import { db } from "@/lib/db";
import { stageDates, stages, transmetteurs } from "@/lib/db/schema";
import { formatDateRange } from "@/lib/format";

function initiales(nom: string) {
  return nom
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join("");
}

export default async function FichePage({
  params,
}: PageProps<"/fiche/[slug]">) {
  const { slug } = await params;

  const fiche = await db.query.transmetteurs.findFirst({
    where: and(eq(transmetteurs.slug, slug), eq(transmetteurs.publiee, true)),
    with: {
      temoignages: { orderBy: (t, { desc }) => [desc(t.createdAt)] },
    },
  });

  if (!fiche) notFound();

  const stagesAvecDates = await db.query.stages.findMany({
    where: eq(stages.transmetteurId, fiche.id),
    orderBy: (s, { asc }) => [asc(s.titre)],
    with: {
      dates: {
        where: and(
          gte(stageDates.dateFin, new Date()),
          eq(stageDates.publiee, true)
        ),
        orderBy: (d, { asc }) => [asc(d.dateDebut)],
      },
    },
  });
  // Un stage sans date à venir n'a rien à afficher sur la fiche publique.
  const groupesStages = stagesAvecDates.filter((s) => s.dates.length > 0);

  // Les formes proposées (badges sur la mini-carte) sont l'union des types
  // de tous les stages — pas un champ de la fiche, un même transmetteur
  // pouvant proposer plusieurs types de stages différents.
  const types = [
    ...new Set(stagesAvecDates.map((s) => s.type).filter((t) => t !== null)),
  ];
  const prenom = fiche.nom.split(" ")[0];
  const titre = fiche.nomLieu || fiche.nom;
  // Un stage sans date à venir n'a rien à proposer dans le formulaire.
  const offres = stagesAvecDates.filter((s) => s.dates.length > 0);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <ContactProvider
        fiche={{
          slug: fiche.slug,
          titre,
          nom: fiche.nom,
          prenom,
          lieuApproximatif: fiche.lieuApproximatif,
        }}
        offres={offres}
        action={sendContactRequest.bind(null, fiche.id)}
      >
      <main className="flex-1">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-6 px-6 pt-8 pb-8 sm:px-12">
          <div>
            <div className="mb-2.5 text-base tracking-wide text-primary uppercase">
              {DOMAINE_LABELS[fiche.domaine]} · {fiche.savoirFaire}
            </div>
            <h1 className="mb-3 font-serif text-4xl font-semibold sm:text-5xl">
              {titre}
            </h1>
            <div className="flex flex-wrap items-center gap-3.5 text-sm text-muted-foreground">
              <span>
                {fiche.nom}
                {fiche.metier ? `, ${fiche.metier}` : ""}
              </span>
              <span className="text-input">|</span>
              <span>{fiche.lieuApproximatif}</span>
            </div>
          </div>
          <ContactTrigger className="rounded-sm bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-[#8a4222]">
            Contacter {prenom}
          </ContactTrigger>
        </div>

        <PhotoGallery photos={fiche.photos} alt={titre} />

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-14 px-6 py-12 sm:px-12 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <section>
              <div className="mb-2 text-xs tracking-wide text-primary uppercase">
                La transmission
              </div>
              <h2 className="mb-4 font-serif text-2xl font-semibold">
                Ce que {prenom} transmet
              </h2>
              <p className="leading-relaxed text-foreground/90 whitespace-pre-line">
                {fiche.histoire}
              </p>
            </section>

            <section className="mt-12 border-t border-border pt-10">
              <div className="mb-2 text-xs tracking-wide text-primary uppercase">
                Ce qui est proposé
              </div>
              <h2 className="mb-1.5 font-serif text-2xl font-semibold">
                Les stages et leurs dates
              </h2>
              <p className="mb-6 text-sm text-muted-foreground">
                Les places indiquées sont celles que {prenom} tient à jour.
              </p>

              {groupesStages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune date annoncée pour le moment — écrivez directement
                  pour convenir d&apos;un moment.
                </p>
              ) : (
                <div className="flex flex-col gap-6">
                  {groupesStages.map((g) => (
                    <div
                      key={g.id}
                      // Ancre visée depuis la page Stages, pour arriver
                      // directement sur le bon stage.
                      id={`stage-${g.id}`}
                      className="overflow-hidden rounded-sm border border-border bg-card"
                    >
                      <div className="p-5.5">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          {g.type && (
                            <span className="rounded-sm bg-accent px-2.5 py-1 text-[11px] tracking-wide text-primary uppercase">
                              {g.type}
                            </span>
                          )}
                          {g.niveau && (
                            <span className="rounded-sm border border-input px-2.5 py-1 text-[11px] tracking-wide text-muted-foreground uppercase">
                              {g.niveau}
                            </span>
                          )}
                          {g.duree && (
                            <span className="text-xs text-muted-foreground">
                              {g.duree}
                            </span>
                          )}
                          {g.prix && (
                            <span className="text-sm font-semibold text-primary">
                              · {g.prix}
                            </span>
                          )}
                        </div>
                        <div className="mb-3.5 font-serif text-xl font-semibold">
                          {g.titre}
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {g.description}
                        </p>
                        {g.photos.length > 0 && (
                          <div className="mt-3.5">
                            <StagePhotos photos={g.photos} alt={g.titre} />
                          </div>
                        )}
                      </div>

                      {g.programme.length > 0 && (
                        <div className="border-t border-b border-border bg-secondary p-5.5">
                          <div className="mb-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                            Le programme de la journée
                          </div>
                          <div className="grid grid-cols-1 gap-x-7 gap-y-2 sm:grid-cols-2">
                            {g.programme.map((p, i) => (
                              <div key={i} className="flex items-baseline gap-3">
                                <span className="w-11 shrink-0 text-xs font-semibold tabular-nums text-primary">
                                  {p.heure}
                                </span>
                                <span className="text-sm text-foreground/90">
                                  {p.titre}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="p-5.5">
                        <div className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                          Dates
                        </div>
                        <div className="flex flex-col">
                          {g.dates.map((d) => {
                            const restantes =
                              d.places !== null ? d.places - d.inscrits : null;
                            const complet = restantes === 0;
                            return (
                              <div
                                key={d.id}
                                className="flex items-center gap-3.5 border-b border-background py-3 last:border-b-0"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-semibold">
                                    {formatDateRange(d.dateDebut, d.dateFin)}
                                  </div>
                                  {restantes !== null && (
                                    <div
                                      className={`mt-0.5 text-xs ${complet ? "text-muted-foreground" : "text-[#4a6741]"}`}
                                    >
                                      {complet
                                        ? "Complet"
                                        : `${restantes} place${restantes > 1 ? "s" : ""} libre${restantes > 1 ? "s" : ""} / ${d.places}`}
                                    </div>
                                  )}
                                </div>
                                {complet ? (
                                  <span className="shrink-0 rounded-sm border border-input bg-secondary px-3.5 py-2 text-xs font-semibold whitespace-nowrap text-muted-foreground">
                                    Complet
                                  </span>
                                ) : (
                                  <ContactTrigger
                                    stageId={g.id}
                                    dateId={d.id}
                                    className="shrink-0 rounded-sm border border-primary bg-primary px-3.5 py-2 text-xs font-semibold whitespace-nowrap text-primary-foreground hover:bg-[#8a4222]"
                                  >
                                    Demander
                                  </ContactTrigger>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {g.note && (
                          <div className="mt-3 text-xs text-muted-foreground">
                            {g.note}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-sm border border-border bg-card p-6">
              <h3 className="mb-4 text-xs tracking-wide text-muted-foreground uppercase">
                Infos pratiques
              </h3>
              <div className="flex flex-col gap-4 text-sm">
                <div className="flex gap-2.5">
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 shrink-0 text-primary"
                  >
                    <path d="M3 11l9-7 9 7" />
                    <path d="M5 10v9h14v-9" />
                  </svg>
                  <div>
                    <div className="mb-0.5 text-[11px] tracking-wide text-muted-foreground uppercase">
                      Hébergement
                    </div>
                    <div className="font-medium">
                      {fiche.hebergement ? "Sur place" : "Non proposé"}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 shrink-0 text-primary"
                  >
                    <path d="M4 3v7" />
                    <path d="M7 3v7" />
                    <path d="M5.5 10v11" />
                    <path d="M17 3c-2 2-2.5 5-2.5 8h5c0-3-.5-6-2.5-8z" />
                    <path d="M17 11v10" />
                  </svg>
                  <div>
                    <div className="mb-0.5 text-[11px] tracking-wide text-muted-foreground uppercase">
                      Repas
                    </div>
                    <div className="font-medium">
                      {fiche.repas
                        ? (fiche.typeRepas ?? "Proposés")
                        : "Non proposés"}
                    </div>
                  </div>
                </div>
              </div>
              {fiche.modalitesAccueil && (
                <div className="mt-4 border-t border-border pt-4">
                  <div className="mb-1.5 text-[11px] tracking-wide text-muted-foreground uppercase">
                    Autres infos
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {fiche.modalitesAccueil}
                  </p>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-sm border border-border bg-card">
              <div className="h-44">
                <MapPreview
                  forceActiveId={fiche.id}
                  points={[
                    {
                      id: fiche.id,
                      slug: fiche.slug,
                      nom: fiche.nom,
                      domaine: fiche.domaine,
                      savoirFaire: fiche.savoirFaire,
                      photo: fiche.photos[0] ?? null,
                      lieuApproximatif: fiche.lieuApproximatif,
                      lat: fiche.lat,
                      lng: fiche.lng,
                      hebergement: fiche.hebergement,
                      types,
                    },
                  ]}
                />
              </div>
              <div className="p-5">
                <div className="font-medium">{fiche.lieuApproximatif}</div>
                <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Adresse exacte communiquée après contact.
                </div>
              </div>
            </div>

            <div className="rounded-sm border border-border bg-card p-6">
              <h3 className="mb-3.5 text-xs tracking-wide text-muted-foreground uppercase">
                {fiche.metier ? fiche.metier[0]?.toUpperCase() + fiche.metier.slice(1) : "Le transmetteur"}
              </h3>
              <div className="mb-3 flex items-center gap-3.5">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-serif text-base text-primary">
                  {fiche.photoPortrait ? (
                    <Image
                      src={fiche.photoPortrait}
                      alt={fiche.nom}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    initiales(fiche.nom)
                  )}
                </div>
                <div className="font-semibold">{fiche.nom}</div>
              </div>
              <ContactTrigger className="block w-full rounded-sm bg-primary py-3 text-center text-sm font-medium text-primary-foreground hover:bg-[#8a4222]">
                Contacter {prenom}
              </ContactTrigger>
              <div className="mt-2.5 text-center text-xs text-muted-foreground">
                Mise en relation directe — sans commission
              </div>
              {(fiche.siteWeb || fiche.reseauxSociaux) && (
                <div className="mt-3.5 flex flex-col gap-1.5 border-t border-border pt-3.5 text-sm">
                  {fiche.siteWeb && (
                    <a href={fiche.siteWeb} target="_blank" rel="noreferrer">
                      {fiche.siteWeb}
                    </a>
                  )}
                  {fiche.reseauxSociaux && (
                    <a href={fiche.reseauxSociaux} target="_blank" rel="noreferrer">
                      {fiche.reseauxSociaux}
                    </a>
                  )}
                </div>
              )}
            </div>

            {fiche.temoignages.length > 0 && (
              <div className="rounded-sm border border-border bg-card p-6">
                <h3 className="mb-4 text-xs tracking-wide text-muted-foreground uppercase">
                  Ils et elles témoignent
                </h3>
                <div className="flex flex-col gap-5">
                  {fiche.temoignages.map((t) => (
                    <figure key={t.id} className="border-l-2 border-input pl-4">
                      <blockquote className="mb-1.5 text-sm leading-relaxed text-foreground/90 italic">
                        « {t.texte} »
                      </blockquote>
                      <figcaption className="text-xs text-muted-foreground">
                        {t.auteur} — {t.contexte}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
      </ContactProvider>

      <Footer />
    </div>
  );
}
