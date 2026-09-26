/**
 * Marche à suivre pour la mise en ligne. Reste affiché tant que la fiche
 * n'est pas publiée : c'est la seule page qui explique qu'une fiche ne paraît
 * pas toute seule. Il disparaît de lui-même une fois la demande validée.
 */
export function PanneauAccueil({
  premiereVisite,
  demandeEnvoyee,
  manquants,
}: {
  premiereVisite: boolean;
  demandeEnvoyee: boolean;
  manquants: string[];
}) {
  return (
    <section className="mb-8 rounded-sm border border-primary bg-accent p-6">
      <h2 className="mb-2 font-serif text-xl font-semibold">
        {demandeEnvoyee
          ? "Demande en attente de validation"
          : premiereVisite
            ? "Bienvenue, votre compte est prêt"
            : "Pour mettre votre fiche en ligne"}
      </h2>

      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        {demandeEnvoyee ? (
          <>
            Votre fiche est complète et l&apos;association l&apos;a reçue. Elle
            la relit, puis la met en ligne : vous recevrez un email dès
            qu&apos;elle sera visible sur le site. Vous pouvez continuer à la
            modifier en attendant.
          </>
        ) : (
          <>
            {premiereVisite &&
              "Votre mot de passe est enregistré : vous vous connecterez avec votre adresse email et ce mot de passe. "}
            Votre fiche n&apos;est pas encore visible sur le site. Voici comment
            elle y arrive.
          </>
        )}
      </p>

      {!demandeEnvoyee && (
        <ol className="flex flex-col gap-3 text-sm">
          <li className="flex gap-3">
            <span className="font-semibold text-primary">1.</span>
            <span>
              <strong>Remplissez toute votre fiche</strong>, dans l&apos;onglet
              Fiche : seuls les champs marqués « optionnel » peuvent rester
              vides, et il faut au moins trois photos. Enregistrez au fur et à
              mesure, rien ne se perd.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-primary">2.</span>
            <span>
              <strong>Ajoutez vos stages et leurs dates</strong>, dans
              l&apos;onglet Stages.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-primary">3.</span>
            <span>
              <strong>Demandez la publication</strong>, avec le bouton en haut
              de cette page. Il ne devient actif que lorsque la fiche est
              complète. L&apos;association la relit, puis la met en ligne.
            </span>
          </li>
        </ol>
      )}

      {!demandeEnvoyee && manquants.length > 0 && (
        <p className="mt-4 text-sm leading-relaxed">
          <strong>Il reste à renseigner :</strong> {manquants.join(", ")}.
        </p>
      )}
    </section>
  );
}
