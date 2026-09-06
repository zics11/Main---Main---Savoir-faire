import { Header } from "@/components/site/Header";
import { StagesExplorer } from "@/components/stages/StagesExplorer";
import { getUpcomingStages } from "@/lib/queries";

export default async function StagesPage() {
  const stages = await getUpcomingStages();

  // Pleine hauteur d'écran : c'est la liste qui défile, à côté d'une carte
  // qui reste en place.
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      <StagesExplorer stages={stages} />
    </div>
  );
}
