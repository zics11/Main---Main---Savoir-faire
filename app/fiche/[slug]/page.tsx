import { and, eq, gte } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ContactProvider, ContactTrigger } from "@/components/contact/ContactModal";
import { PhotoGallery } from "@/components/fiche/PhotoGallery";
import { CarteStage } from "@/components/fiche/CarteStage";
import { sendContactRequest } from "./contact-actions";
import { MapPreview } from "@/components/map/MapPreview";
import { getSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { stageDates, stages, transmetteurs } from "@/lib/db/schema";
import { libelleLieu, libelleLieuCourt } from "@/lib/lieu";
import { initiales } from "@/lib/initiales";
import { HouseIcon, MapPinIcon, UtensilsIcon } from "lucide-react";
import {
  bouton,
  carte,
  grand,
  intitule,
  surtitre,
  titre as titreStyle,
} from "@/lib/style";
import { DomaineSavoirFaire } from "@/components/shared/Etiquettes";
import { encartsDons } from "@/lib/dons-serveur";

export default async function FichePage({
  params,
}: PageProps<"/fiche/[slug]">) {
  const { slug } = await params;

  const fiche = await db.query.transmetteurs.findFirst({
    where: eq(transmetteurs.slug, slug),
    with: {
      temoignages: { orderBy: (t, { desc }) => [desc(t.createdAt)] },
    },
  });

  if (!fiche) notFound();

  // Une fiche non publiée reste visible pour l'association et pour son
  // transmetteur : c'est l'aperçu, qui permet de voir le rendu public avant
  // la mise en ligne. Pour tout le monde d'autre, elle n'existe pas.
  const session = await getSession();
  const apercu = !fiche.publiee;
  if (apercu) {
    const autorise =
      session?.user?.role === "admin" || session?.user?.id === fiche.userId;
    if (!autorise) notFound();
  }

  // Champs facultatifs tant que la fiche se remplit : l'aperçu doit marcher
  // même incomplet.
  const savoirFaire = fiche.savoirFaire ?? "savoir-faire à renseigner";
  const lieuApproximatif = libelleLieu(fiche) || "lieu à renseigner";
  const surLaCarte =
    fiche.lat !== null && fiche.lng !== null
      ? { lat: fiche.lat, lng: fiche.lng }
      : null;

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
      {/* Aperçu : on ne peut pas laisser croire que la page est en ligne. */}
      {apercu && (
        <div className="bg-[var(--statut-a-valider)] px-6 py-2.5 text-center text-sm text-white sm:px-12">
          Aperçu privé — cette fiche n&apos;est pas visible du public.{" "}
          <Link
            href={
              session?.user?.role === "admin"
                ? `/admin/fiches/${fiche.id}`
                : "/mes-stages"
            }
            className="font-medium text-white underline underline-offset-2"
          >
            Revenir à son édition
          </Link>
        </div>
      )}
      <Header />

      <ContactProvider
        fiche={{
          slug: fiche.slug,
          titre,
          nom: fiche.nom,
          prenom,
          lieuApproximatif,
        }}
        offres={offres}
        action={sendContactRequest.bind(null, fiche.id)}
        soutien={await encartsDons()}
      >
      <main className="flex-1">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-6 px-6 pt-8 pb-8 sm:px-12">
          <div>
            <DomaineSavoirFaire
              domaine={fiche.domaine}
              savoirFaire={savoirFaire}
              className="mb-2.5"
            />
            <h1 className={`mb-3 ${titreStyle.page} sm:text-5xl`}>{titre}</h1>
            <div className="flex flex-wrap items-center gap-3.5 text-sm text-muted-foreground">
              <span>
                {fiche.nom}
                {fiche.metier ? `, ${fiche.metier}` : ""}
              </span>
              <span className="text-input">|</span>
              <span>{lieuApproximatif}</span>
            </div>
          </div>
          <ContactTrigger className={`${bouton.primaire} ${grand}`}>
            Contacter {prenom}
          </ContactTrigger>
        </div>

        <PhotoGallery photos={fiche.photos} alt={titre} />

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-14 px-6 py-12 sm:px-12 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <section>
              <div className={`mb-2 ${surtitre}`}>La transmission</div>
              <h2 className={`mb-4 ${titreStyle.section}`}>
                Ce que {prenom} transmet
              </h2>
              <p className="leading-relaxed text-foreground/90 whitespace-pre-line">
                {fiche.histoire}
              </p>
            </section>

            <section className="mt-12 border-t border-border pt-10">
              <div className={`mb-2 ${surtitre}`}>Ce qui est proposé</div>
              <h2 className={`mb-1.5 ${titreStyle.section}`}>
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
                <div className="flex flex-col gap-8">
                  {groupesStages.map((g) => (
                    <CarteStage key={g.id} stage={g} />
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="flex flex-col gap-4">
            <div className={carte}>
              <h3 className={`mb-4 ${intitule}`}>Infos pratiques</h3>
              <div className="flex flex-col gap-4 text-sm">
                <div className="flex gap-2.5">
                  <HouseIcon
                    aria-hidden
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  />
                  <div>
                    <div className="mb-0.5 text-xs text-muted-foreground">
                      Hébergement
                    </div>
                    <div className="font-medium">
                      {fiche.hebergement ? "Sur place" : "Non proposé"}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <UtensilsIcon
                    aria-hidden
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  />
                  <div>
                    <div className="mb-0.5 text-xs text-muted-foreground">
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
                  <div className="mb-1.5 text-xs text-muted-foreground">
                    Autres infos
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {fiche.modalitesAccueil}
                  </p>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-sm border border-border bg-card">
              {/* Pas de carte tant qu'aucun point n'est placé : cas d'une
                  fiche encore en cours, vue en aperçu. */}
              {surLaCarte && (
                <div className="h-44">
                  <MapPreview
                    forceActiveId={fiche.id}
                    points={[
                      {
                        id: fiche.id,
                        slug: fiche.slug,
                        titre,
                        nom: fiche.nom,
                        domaine: fiche.domaine,
                        savoirFaire,
                        photo: fiche.photos[0] ?? null,
                        lieuApproximatif,
                        lieuCourt: libelleLieuCourt(fiche) || lieuApproximatif,
                        lat: surLaCarte.lat,
                        lng: surLaCarte.lng,
                        hebergement: fiche.hebergement,
                        types,
                      },
                    ]}
                  />
                </div>
              )}
              <div className="p-6">
                <div className="flex items-start gap-2.5 font-medium">
                  <MapPinIcon
                    aria-hidden
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  />
                  {lieuApproximatif}
                </div>
                <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Adresse exacte communiquée après contact.
                </div>
              </div>
            </div>

            <div className={carte}>
              <h3 className={`mb-4 ${intitule}`}>
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
              <ContactTrigger className={`${bouton.primaire} ${grand} w-full`}>
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
              <div className={carte}>
                <h3 className={`mb-4 ${intitule}`}>Ils et elles témoignent</h3>
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
