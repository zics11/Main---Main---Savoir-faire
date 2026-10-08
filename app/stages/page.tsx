import { Header } from "@/components/site/Header";
import { StagesExplorer } from "@/components/stages/StagesExplorer";
import { getUpcomingStages } from "@/lib/queries";

export default async function StagesPage({
  searchParams,
}: PageProps<"/stages">) {
  // ?q=… : la recherche de l'en-tête arrive ici. La clé remonte l'explorateur
  // à chaque nouvelle recherche, sinon la liste garderait l'ancienne saisie.
  const { q } = await searchParams;
  const recherche = typeof q === "string" ? q : "";
  const stages = await getUpcomingStages();

  // Sur grand écran, pleine hauteur : c'est la liste qui défile, à côté d'une
  // carte qui reste en place. Sur téléphone, la page défile normalement — une
  // hauteur bloquée y écrasait la liste à rien, sous la carte.
  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:overflow-hidden">
      <Header />
      <StagesExplorer
        key={recherche}
        stages={stages}
        rechercheInitiale={recherche}
      />
    </div>
  );
}
