import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MapExplorer } from "@/components/map/MapExplorer";
import { DOMAINES, type Domaine } from "@/lib/db/schema";
import { getPublishedTransmetteurs } from "@/lib/queries";

export default async function CartePage({
  searchParams,
}: PageProps<"/carte">) {
  // ?domaine=… : les cartes « familles de savoir-faire » de l'accueil
  // arrivent ici avec un domaine déjà sélectionné.
  const { domaine } = await searchParams;
  const initialDomaine: Domaine | "toutes" =
    typeof domaine === "string" && DOMAINES.includes(domaine as Domaine)
      ? (domaine as Domaine)
      : "toutes";

  const points = await getPublishedTransmetteurs();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <MapExplorer transmetteurs={points} initialDomaine={initialDomaine} />
      </main>
      <Footer />
    </div>
  );
}
