"use client";

import { useActionState, useState } from "react";
import { MailIcon } from "lucide-react";
import type {
  DemandeAffichee,
  EtatDemandeTemoignage,
} from "@/lib/demandes-temoignage";
import { bouton, carte, champ, message, titre } from "@/lib/style";

// Les deux blocs des demandes de témoignage, les mêmes dans l'espace
// transmetteur et dans l'admin : le formulaire qui envoie la demande, et la
// liste de celles qui sont parties.

type Demander = (
  precedent: EtatDemandeTemoignage,
  formData: FormData,
) => Promise<EtatDemandeTemoignage>;

const jour = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Le formulaire : un nom, une adresse, le stage suivi s'il y en a un. */
export function DemanderTemoignage({
  stages,
  demander,
}: {
  stages: { id: string; titre: string }[];
  demander: Demander;
}) {
  // Champs suivis par React : un envoi refusé ne doit rien effacer.
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [stageId, setStageId] = useState("");
  const [etat, envoyer, enCours] = useActionState(
    async (precedent: EtatDemandeTemoignage, donnees: FormData) => {
      const r = await demander(precedent, donnees);
      if (r?.ok) {
        setNom("");
        setEmail("");
        setStageId("");
      }
      return r;
    },
    null,
  );

  return (
    <form action={envoyer} className={carte}>
      <h3 className={`mb-1 ${titre.carte}`}>Demander un témoignage</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Le site écrit à la personne au nom de la fiche, avec un lien pour
        laisser son témoignage — ou décliner.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">Prénom et nom</span>
          <input
            name="nom"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="ex : Camille Berthier"
            className={champ}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">Adresse email</span>
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="camille@exemple.fr"
            className={champ}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
          <span className="text-muted-foreground">
            Le stage suivi (facultatif)
          </span>
          <select
            name="stageId"
            value={stageId}
            onChange={(e) => setStageId(e.target.value)}
            className={champ}
          >
            <option value="">— pas de stage en particulier</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.titre}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={enCours || !nom.trim() || !email.trim()}
          className={bouton.primaire}
        >
          <MailIcon aria-hidden className="h-4 w-4" />
          {enCours ? "Envoi…" : "Envoyer la demande"}
        </button>
        {etat && (
          <p
            role={etat.ok ? "status" : "alert"}
            className={etat.ok ? message.succes : message.erreur}
          >
            {etat.ok ? etat.message : etat.erreur}
          </p>
        )}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Une seule demande par adresse : une personne qui a déjà été sollicitée
        — qu&apos;elle ait répondu ou non — ne peut pas l&apos;être une
        deuxième fois.
      </p>
    </form>
  );
}

/** L'état d'une demande : la pastille de la liste des fiches de l'admin. */
function Statut({
  demande: d,
  maintenant,
}: {
  demande: DemandeAffichee;
  maintenant: number;
}) {
  const [teinte, texte] = d.retire
    ? ["en-cours", "Témoignage retiré"]
    : d.reponse === "temoignage"
      ? ["en-ligne", "Témoignage reçu"]
      : d.reponse === "refus"
        ? ["en-cours", "Déclinée"]
        : d.expireLe.getTime() < maintenant
          ? ["en-cours", "Sans réponse"]
          : ["a-valider", "En attente"];
  return (
    <span
      style={{ backgroundColor: `var(--statut-${teinte})` }}
      className="w-fit rounded-sm px-2 py-1 text-[11px] font-medium whitespace-nowrap text-white uppercase"
    >
      {texte}
    </span>
  );
}

/** Les demandes parties, avec où elles en sont. */
export function ListeDemandes({ demandes }: { demandes: DemandeAffichee[] }) {
  const [maintenant] = useState(() => Date.now());
  return (
    <div className={carte}>
      <h3 className={`mb-4 ${titre.carte}`}>
        Demandes envoyées
        <span className="ml-2 font-sans text-sm font-normal text-muted-foreground">
          {demandes.length}
        </span>
      </h3>
      {demandes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune demande pour l&apos;instant.
        </p>
      ) : (
        <ul className="flex flex-col">
          {demandes.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <div className="font-medium">{d.nom}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {d.email}
                  {d.stage && ` · ${d.stage}`} · envoyée le{" "}
                  {jour.format(d.envoyeeLe)}
                </div>
              </div>
              <Statut demande={d} maintenant={maintenant} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
