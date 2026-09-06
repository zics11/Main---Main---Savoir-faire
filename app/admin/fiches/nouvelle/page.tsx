import { FicheForm } from "@/components/admin/FicheForm";
import { createFiche } from "@/app/admin/actions";

export default function NouvelleFichePage() {
  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl font-semibold">
        Créer une fiche
      </h1>
      <FicheForm mode="create" action={createFiche} />
    </div>
  );
}
