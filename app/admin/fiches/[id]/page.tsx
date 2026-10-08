import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { CompteTransmetteur } from "@/components/admin/CompteTransmetteur";
import { BlocageFiche } from "@/components/admin/BlocageFiche";
import { ZoneDangereuse } from "@/components/admin/ZoneDangereuse";
import { FicheForm } from "@/components/admin/FicheForm";
import { TemoignagesManager } from "@/components/admin/TemoignagesManager";
import { FicheTabs } from "@/components/shared/FicheTabs";
import { EditeurStages } from "@/components/stages/EditeurStages";
import { db } from "@/lib/db";
import { etatFiche } from "@/lib/etat-fiche";
import { champsManquants } from "@/lib/fiche";
import { transmetteurs, users } from "@/lib/db/schema";
import {
  changerVisibilite,
  deleteStage,
  enregistrerStage,
  enregistrerTemoignages,
  updateFiche,
} from "@/app/admin/actions";

export default async function EditerFichePage({
  params,
}: PageProps<"/admin/fiches/[id]">) {
  const { id } = await params;

  const fiche = await db.query.transmetteurs.findFirst({
    where: eq(transmetteurs.id, id),
    with: {
      stages: {
        orderBy: (s, { asc }) => [asc(s.titre)],
        with: {
          dates: { orderBy: (d, { asc }) => [asc(d.dateDebut)] },
        },
      },
      temoignages: { orderBy: (t, { desc }) => [desc(t.createdAt)] },
    },
  });

  if (!fiche) notFound();

  // Sert seulement à dire si un mot de passe existe : il n'est jamais lisible.
  const compte = fiche.userId
    ? await db.query.users.findFirst({
        where: eq(users.id, fiche.userId),
        columns: {
          passwordHash: true,
          emailEnAttente: true,
        },
      })
    : null;

  return (
    // pb-24 : de quoi ne pas masquer le bas de page derrière la barre
    // d'enregistrement, fixée au bas de l'écran.
    <div className="flex flex-col gap-6 pb-24">
      <div>
        <h1 className="mb-1 font-serif text-3xl font-semibold">{fiche.nom}</h1>
        <p className="text-sm text-muted-foreground">
          {fiche.savoirFaire ?? "Fiche en cours de remplissage"}
        </p>
      </div>

      <FicheTabs
        barre={{
          etat: etatFiche({ ...fiche, manquants: champsManquants(fiche) }),
          lienPublic: `/fiche/${fiche.slug}`,
          publiee: fiche.publiee,
          publication: {
            changerVisibilite: changerVisibilite.bind(null, fiche.id),
            caseVerrouillee:
              fiche.premiereValidationLe === null || fiche.bloqueeLe !== null,
            premiereMiseEnLigne:
              fiche.premiereValidationLe === null &&
              fiche.bloqueeLe === null &&
              champsManquants(fiche).length === 0,
          },
        }}
        nbStages={fiche.stages.length}
        nbTemoignages={fiche.temoignages.length}
        fiche={
          <div className="flex flex-col gap-8">
            <FicheForm
              mode="edit"
              action={updateFiche.bind(null, fiche.id)}
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

          </div>
        }
        administration={
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Ces réglages ne sont visibles que par l&apos;association : le
              transmetteur n&apos;y a pas accès depuis son espace.
            </p>

            <CompteTransmetteur
              transmetteurId={fiche.id}
              email={fiche.email}
              aUnMotDePasse={compte?.passwordHash != null}
              emailEnAttente={compte?.emailEnAttente}
              invitationEnvoyeeLe={fiche.invitationEnvoyeeLe}
            />

            <BlocageFiche
              transmetteurId={fiche.id}
              nom={fiche.nom}
              bloquee={fiche.bloqueeLe !== null}
            />

            <ZoneDangereuse transmetteurId={fiche.id} nom={fiche.nom} />
          </div>
        }
        stages={
          <EditeurStages
            stages={fiche.stages}
            enregistrer={enregistrerStage.bind(null, fiche.id)}
            supprimer={deleteStage.bind(null, fiche.id)}
          />
        }
        temoignages={
          <TemoignagesManager
            temoignages={fiche.temoignages}
            enregistrer={enregistrerTemoignages.bind(null, fiche.id)}
          />
        }
      />
    </div>
  );
}
