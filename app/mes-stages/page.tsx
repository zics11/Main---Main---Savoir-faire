import { eq } from "drizzle-orm";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MyStagesManager } from "@/components/mes-stages/MyStagesManager";
import { DOMAINE_LABELS } from "@/lib/constants";
import { db } from "@/lib/db";
import { requireMyTransmetteur } from "@/lib/dal";
import { stages } from "@/lib/db/schema";

export default async function MesStagesPage() {
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
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10 sm:px-12">
        <div className="mb-2 text-xs tracking-wide text-primary uppercase">
          {DOMAINE_LABELS[fiche.domaine]}
        </div>
        <h1 className="mb-2 font-serif text-3xl font-semibold">{fiche.nom}</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Vous gérez ici uniquement vos dates de stage. Pour modifier votre
          présentation, vos photos ou vos coordonnées, contactez
          l&apos;association.
        </p>

        <MyStagesManager stages={mesStages} />
      </main>
      <Footer />
    </div>
  );
}
