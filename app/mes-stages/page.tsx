import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { FicheForm } from "@/components/admin/FicheForm";
import { DemandePublication } from "@/components/mes-stages/DemandePublication";
import { OngletTemoignages } from "@/components/mes-stages/OngletTemoignages";
import { PanneauAccueil } from "@/components/mes-stages/PanneauAccueil";
import { FicheTabs } from "@/components/shared/FicheTabs";
import { EditeurStages } from "@/components/stages/EditeurStages";
import { DOMAINE_LABELS } from "@/lib/constants";
import { db } from "@/lib/db";
import { requireMyTransmetteur } from "@/lib/dal";
import { champsManquants, champsManquantsDemande } from "@/lib/fiche";
import { etatFicheTransmetteur } from "@/lib/etat-fiche";
import { stages, temoignages } from "@/lib/db/schema";
import { demandesDeLaFiche } from "@/lib/demandes-temoignage";
import {
  deleteMyStage,
  demanderTemoignage,
  enregistrerMonStage,
  updateMyFiche,
} from "./actions";
import { surtitre } from "@/lib/style";
import { EncartSoutien } from "@/components/dons/EncartSoutien";
import { CONTRIBUTION_TRANSMETTEUR, enEuros, MONTANTS_TRANSMETTEUR } from "@/lib/dons";
import { encartsDons } from "@/lib/dons-serveur";
import { demandesRecues } from "@/lib/demandes-contact";

export default async function MonEspacePage({
  searchParams,
}: PageProps<"/mes-stages">) {
  const { bienvenue } = await searchParams;
  const fiche = await requireMyTransmetteur();
  const mesStages = await db.query.stages.findMany({
    where: eq(stages.transmetteurId, fiche.id),
    orderBy: (s, { asc }) => [asc(s.titre)],
    with: {
      dates: { orderBy: (d, { asc }) => [asc(d.dateDebut)] },
    },
  });
  const demandes = await demandesDeLaFiche(fiche.id);
  // L'invitation à contribuer : une fois la fiche en ligne seulement, quand
  // le site a commencé à servir — et pas juste après un don.
  const soutien = fiche.publiee && (await encartsDons());
  const recues = soutien ? await demandesRecues(fiche.id) : 0;
  const mesTemoignages = await db.query.temoignages.findMany({
    where: eq(temoignages.transmetteurId, fiche.id),
    orderBy: [desc(temoignages.createdAt)],
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {/* pb-28 : la barre d'enregistrement est fixée au bas de l'écran. */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-10 pb-28 sm:px-12">
        <div className={`mb-2 ${surtitre}`}>
          Mon espace · {DOMAINE_LABELS[fiche.domaine]}
        </div>
        <h1 className="mb-2 font-serif text-3xl font-semibold">{fiche.nom}</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Modifiez ici votre fiche et vos stages, et demandez leur témoignage
          aux personnes venues chez vous. Votre adresse email et votre mot de passe se
          changent depuis{" "}
          <Link href="/mon-compte" className="underline underline-offset-2">
            Mon compte
          </Link>
          .
        </p>

        {/* Affiché tant que la fiche n'est pas en ligne : il disparaît de
            lui-même une fois la demande validée. */}
        {!fiche.publiee && !fiche.bloqueeLe && (
          <PanneauAccueil
            premiereVisite={bienvenue === "1"}
            demandeEnvoyee={fiche.publicationDemandeeLe !== null}
            manquants={champsManquantsDemande(fiche)}
          />
        )}

        {soutien && (
          <EncartSoutien
            source="espace"
            titre={
              recues > 0
                ? `${recues} demande${recues > 1 ? "s vous sont parvenues" : " vous est parvenue"} par Main à Main`
                : "Main à Main vit de dons"
            }
            montants={MONTANTS_TRANSMETTEUR}
            conseille={CONTRIBUTION_TRANSMETTEUR}
            suffixe=" / an"
            className="mb-8"
          >
            Sans aucune commission sur vos stages : le site ne vit que de
            dons. S&apos;il vous amène des stagiaires, une contribution —
            conseillée {enEuros(CONTRIBUTION_TRANSMETTEUR)} par an — l&apos;aide
            à durer.
          </EncartSoutien>
        )}

        <DemandePublication
          publiee={fiche.publiee}
          demandeeLe={fiche.publicationDemandeeLe}
          dejaValidee={fiche.premiereValidationLe !== null}
          bloquee={fiche.bloqueeLe !== null}
          manquants={champsManquantsDemande(fiche)}
        />

        <FicheTabs
          barre={{
            etat: etatFicheTransmetteur({
              ...fiche,
              manquants: champsManquants(fiche),
            }),
            lienPublic: `/fiche/${fiche.slug}`,
            publiee: fiche.publiee,
          }}
          nbStages={mesStages.length}
          nbTemoignages={mesTemoignages.length}
          fiche={
            <FicheForm
              mode="edit"
              espace="transmetteur"
              action={updateMyFiche}
              values={{
                nom: fiche.nom,
                nomLieu: fiche.nomLieu,
                metier: fiche.metier,
                histoire: fiche.histoire,
                domaine: fiche.domaine,
                savoirFaire: fiche.savoirFaire,
                siteWeb: fiche.siteWeb,
                reseauxSociaux: fiche.reseauxSociaux,
                email: fiche.email,
                lat: fiche.lat,
                lng: fiche.lng,
                ville: fiche.ville,
                codePostal: fiche.codePostal,
                lieuApproximatif: fiche.lieuApproximatif,
                modalitesAccueil: fiche.modalitesAccueil,
                hebergement: fiche.hebergement,
                repas: fiche.repas,
                typeRepas: fiche.typeRepas,
                publiee: fiche.publiee,
                photos: fiche.photos,
                photoPortrait: fiche.photoPortrait,
              }}
            />
          }
          stages={
            <EditeurStages
              titre="Mes stages"
              stages={mesStages}
              enregistrer={enregistrerMonStage}
              supprimer={deleteMyStage}
            />
          }
          temoignages={
            <OngletTemoignages
              stages={mesStages.map((s) => ({ id: s.id, titre: s.titre }))}
              demandes={demandes}
              temoignages={mesTemoignages.map((t) => ({
                id: t.id,
                texte: t.texte,
                auteur: t.auteur,
                contexte: t.contexte,
              }))}
              demander={demanderTemoignage}
            />
          }
        />
      </main>
      <Footer />
    </div>
  );
}
