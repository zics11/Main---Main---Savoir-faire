import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { FormulaireTemoignage } from "@/components/temoignage/FormulaireTemoignage";
import { EncartSoutien } from "@/components/dons/EncartSoutien";
import { encartsDons } from "@/lib/dons-serveur";
import {
  contexteDe,
  demandeOuverte,
  LONGUEUR_MAX_TEMOIGNAGE,
} from "@/lib/demandes-temoignage";
import { bouton, surtitre, titre } from "@/lib/style";
import { publierTemoignage, refuserDemande } from "./actions";

// Un lien personnel : rien à indexer.
export const metadata: Metadata = {
  title: "Votre témoignage",
  robots: { index: false, follow: false },
};

/** « Camille Berthier » → « Camille B. » : de quoi signer sans tout dire. */
function signatureProposee(nom: string) {
  const [prenom, ...reste] = nom.trim().split(/\s+/);
  const initiale = reste.at(-1)?.[0];
  return initiale ? `${prenom} ${initiale.toUpperCase()}.` : prenom;
}

export default async function TemoignagePage({
  params,
}: PageProps<"/temoignage/[jeton]">) {
  const { jeton } = await params;
  const lien = await demandeOuverte(jeton);
  const fiche =
    lien.etat === "inconnue" ? null : lien.demande.transmetteur;
  const chez = fiche ? fiche.nomLieu || fiche.nom : null;

  let contenu: React.ReactNode;
  if (lien.etat === "ouverte") {
    const { demande } = lien;
    contenu = (
      <>
        <h1 className={`mb-3 ${titre.page}`}>
          Un mot sur votre passage chez {chez}
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          {demande.stage
            ? `Vous avez suivi « ${demande.stage.titre} ». `
            : ""}
          Quelques lignes suffisent : elles seront publiées sur la fiche de{" "}
          {chez} et aideront d&apos;autres personnes à se lancer. Ce lien ne
          sert qu&apos;une fois.
        </p>
        <FormulaireTemoignage
          auteurPropose={signatureProposee(demande.nom)}
          contexte={contexteDe(demande)}
          longueurMax={LONGUEUR_MAX_TEMOIGNAGE}
          publier={publierTemoignage.bind(null, jeton)}
          decliner={refuserDemande.bind(null, jeton)}
        />
      </>
    );
  } else if (lien.etat === "repondue" && lien.demande.reponse === "temoignage") {
    contenu = (
      <>
        <h1 className={`mb-3 ${titre.page}`}>Merci pour votre témoignage</h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          Il est publié sur la fiche de {chez}. Si vous souhaitez le modifier
          ou le retirer, écrivez à l&apos;association.
        </p>
        {fiche?.publiee ? (
          <Link href={`/fiche/${fiche.slug}`} className={bouton.primaire}>
            Voir la fiche de {chez}
          </Link>
        ) : (
          <Link href="/stages" className={bouton.secondaire}>
            Découvrir les stages
          </Link>
        )}
        {/* Juste après avoir dit merci : le moment où l'on mesure le
            mieux ce que le site a permis. */}
        {(await encartsDons()) && (
          <EncartSoutien
            source="temoignage"
            titre="Et si vous aidiez la prochaine rencontre ?"
            className="mt-10"
          >
            Votre stage chez {chez} est passé par Main à Main, qui ne prend
            aucune commission. Le site vit de dons, à prix libre.
          </EncartSoutien>
        )}
      </>
    );
  } else if (lien.etat === "repondue") {
    contenu = (
      <>
        <h1 className={`mb-3 ${titre.page}`}>C&apos;est noté</h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          Vous ne laisserez pas de témoignage, et vous ne recevrez pas
          d&apos;autre demande de la part de {chez}. Merci d&apos;avoir pris
          le temps de répondre.
        </p>
        <Link href="/stages" className={bouton.secondaire}>
          Découvrir les stages
        </Link>
      </>
    );
  } else {
    contenu = (
      <>
        <h1 className={`mb-3 ${titre.page}`}>
          Ce lien n&apos;est plus valable
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          {lien.etat === "expiree"
            ? `La demande de ${chez} date de plus de deux mois : elle a expiré.`
            : "Il est incomplet, ou il a été retiré."}{" "}
          Si vous souhaitez tout de même témoigner, écrivez à
          l&apos;association.
        </p>
        <Link href="/stages" className={bouton.secondaire}>
          Découvrir les stages
        </Link>
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-20">
        <div className={`mb-2 ${surtitre}`}>Votre témoignage</div>
        {contenu}
      </main>
      <Footer />
    </div>
  );
}
