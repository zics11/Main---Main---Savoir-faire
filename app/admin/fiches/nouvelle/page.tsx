import { NouvelleFicheForm } from "@/components/admin/NouvelleFicheForm";

export default function NouvelleFichePage() {
  return (
    <div>
      <h1 className="mb-2 font-serif text-3xl font-semibold">
        Créer une fiche
      </h1>
      <p className="mb-6 max-w-lg text-sm leading-relaxed text-muted-foreground">
        Le minimum suffit. Le transmetteur reçoit aussitôt un email pour
        choisir son mot de passe, puis complète lui-même sa fiche — déjà
        préremplie de ce que vous saisissez ici. Elle ne sera visible sur le
        site qu&apos;une fois publiée par vos soins.
      </p>
      <NouvelleFicheForm />
    </div>
  );
}
