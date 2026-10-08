import { eq } from "drizzle-orm";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { FicheForm } from "@/components/admin/FicheForm";
import { DemandePublication } from "@/components/mes-stages/DemandePublication";
import { PanneauAccueil } from "@/components/mes-stages/PanneauAccueil";
import { FicheTabs } from "@/components/shared/FicheTabs";
import { EditeurStages } from "@/components/stages/EditeurStages";
import { DOMAINE_LABELS } from "@/lib/constants";
import { db } from "@/lib/db";
import { requireMyTransmetteur } from "@/lib/dal";
import { champsManquants, champsManquantsDemande } from "@/lib/fiche";
import { etatFicheTransmetteur } from "@/lib/etat-fiche";
import { stages } from "@/lib/db/schema";
import { deleteMyStage, enregistrerMonStage, updateMyFiche } from "./actions";
import { surtitre } from "@/lib/style";

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
          Modifiez ici votre fiche et vos stages. Les témoignages sont ajoutés
          par l&apos;association. Votre adresse email et votre mot de passe se
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
        />
      </main>
      <Footer />
    </div>
  );
}
