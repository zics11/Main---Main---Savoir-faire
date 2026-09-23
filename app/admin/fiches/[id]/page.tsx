import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { CompteTransmetteur } from "@/components/admin/CompteTransmetteur";
import { FicheForm } from "@/components/admin/FicheForm";
import { StagesManager } from "@/components/admin/StagesManager";
import { TemoignagesManager } from "@/components/admin/TemoignagesManager";
import { FicheTabs } from "@/components/shared/FicheTabs";
import { db } from "@/lib/db";
import { champsManquants } from "@/lib/fiche";
import { transmetteurs, users } from "@/lib/db/schema";
import { deleteFiche, updateFiche } from "@/app/admin/actions";

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
        columns: { passwordHash: true },
      })
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-1 font-serif text-3xl font-semibold">{fiche.nom}</h1>
        <p className="text-sm text-muted-foreground">
          {fiche.savoirFaire ?? "Fiche en cours de remplissage"}
        </p>
      </div>

      <FicheTabs
        nbStages={fiche.stages.length}
        nbTemoignages={fiche.temoignages.length}
        fiche={
          <div className="flex flex-col gap-8">
            <FicheForm
              mode="edit"
              manquants={champsManquants(fiche)}
              compteLie={fiche.userId !== null}
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

            <CompteTransmetteur
              transmetteurId={fiche.id}
              email={fiche.email}
              compteLie={fiche.userId !== null}
              aUnMotDePasse={compte?.passwordHash != null}
            />

            <section className="rounded-sm border border-border bg-secondary p-6">
              <h2 className="mb-2 font-serif text-lg font-semibold">
                Zone dangereuse
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Supprimer cette fiche efface aussi ses stages et ses photos,
                définitivement.
              </p>
              <form action={deleteFiche.bind(null, fiche.id)}>
                <button
                  type="submit"
                  className="rounded-sm border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-accent"
                >
                  Supprimer la fiche
                </button>
              </form>
            </section>
          </div>
        }
        stages={<StagesManager transmetteurId={fiche.id} stages={fiche.stages} />}
        temoignages={
          <TemoignagesManager
            transmetteurId={fiche.id}
            temoignages={fiche.temoignages}
          />
        }
      />
    </div>
  );
}
