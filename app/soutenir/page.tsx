import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { HandHeartIcon, MailIcon, MapIcon } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { FormulaireDon } from "@/components/dons/FormulaireDon";
import {
  estSource,
  MONTANT_MAX,
  MONTANT_MIN,
  MONTANT_PAR_DEFAUT,
} from "@/lib/dons";
import { etatDons } from "@/lib/dons-serveur";
import { carte, surtitre, titre } from "@/lib/style";
import { cn } from "@/lib/utils";
import { demarrerDon } from "./actions";

export const metadata: Metadata = {
  title: "Soutenir Main à Main",
  description:
    "Main à Main ne prend aucune commission. Le site vit de vos dons, à prix libre.",
};

const USAGES = [
  {
    icone: MapIcon,
    titre: "Le site et la carte",
    texte: "L'hébergement, la carte, les photos : ce qui fait tenir le site.",
  },
  {
    icone: MailIcon,
    titre: "Les mises en relation",
    texte:
      "Chaque demande de stage, chaque email qui part vers un transmetteur.",
  },
  {
    icone: HandHeartIcon,
    titre: "L'accueil des transmetteurs",
    texte:
      "Le temps passé à accompagner chaque fiche jusqu'à sa mise en ligne.",
  },
];

const QUESTIONS = [
  {
    q: "Faut-il donner pour utiliser le site ?",
    r: "Non. Main à Main reste gratuit pour tout le monde, que vous donniez ou non.",
  },
  {
    q: "Les transmetteurs en reçoivent-ils une part ?",
    r: "Non : votre don soutient le site. Les stages se règlent directement avec le transmetteur, sans intermédiaire ni commission.",
  },
];

export default async function SoutenirPage({
  searchParams,
}: PageProps<"/soutenir">) {
  // L'état des dons se lit à chaque visite, pas une fois pour toutes à la
  // construction du site : il change avec la configuration.
  await connection();
  const etat = etatDons();
  if (etat === "fermes") notFound();

  const { montant, source } = await searchParams;
  const voulu = Number(montant);
  const montantInitial =
    Number.isInteger(voulu) && voulu >= MONTANT_MIN && voulu <= MONTANT_MAX
      ? voulu
      : MONTANT_PAR_DEFAUT;

  return (
    <div className="flex min-h-screen flex-col">
      {etat === "apercu" && (
        <div className="bg-[var(--statut-a-valider)] px-6 py-2.5 text-center text-sm text-white sm:px-12">
          Aperçu — aucun moyen de paiement n&apos;est encore branché : rien ne
          sera débité. Hors de cet aperçu, les invitations à donner restent
          masquées tant qu&apos;il n&apos;y en a pas.
        </div>
      )}
      <Header />
      <main className="mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 gap-12 px-6 py-14 sm:px-12 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <div className={cn("mb-2", surtitre, "text-[var(--soutien)]")}>
            Soutenir
          </div>
          <h1 className={`mb-4 ${titre.page}`}>Main à Main vit de vos dons</h1>
          <p className="max-w-xl leading-relaxed text-foreground/85">
            Le site met en relation celles et ceux qui transmettent un
            savoir-faire et celles et ceux qui veulent l&apos;apprendre. Il ne
            prend aucune commission, ni sur les stages, ni sur les
            transmetteurs. Pour rester gratuit et indépendant, il compte sur
            vous — à prix libre.
          </p>

          {/* La cible des liens « En savoir plus » : marge pour l'en-tête fixe. */}
          <h2
            id="a-quoi-sert"
            className={`mt-12 mb-5 scroll-mt-28 ${titre.section}`}
          >
            À quoi sert votre don
          </h2>
          <ul className="flex flex-col gap-5">
            {USAGES.map((u) => (
              <li key={u.titre} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-[var(--soutien-fond)] text-[var(--soutien)]">
                  <u.icone aria-hidden className="h-5 w-5" />
                </span>
                <div>
                  <div className="font-medium">{u.titre}</div>
                  <p className="text-sm text-muted-foreground">{u.texte}</p>
                </div>
              </li>
            ))}
          </ul>

          <h2 className={`mt-12 mb-5 ${titre.section}`}>Questions</h2>
          <dl className="flex flex-col gap-5">
            {QUESTIONS.map((x) => (
              <div key={x.q}>
                <dt className="font-medium">{x.q}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {x.r}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="lg:sticky lg:top-28 lg:self-start">
          {/* La cible d'« Autre montant » : sur téléphone, le formulaire
              vient après les explications. */}
          <div id="faire-un-don" className={`scroll-mt-28 ${carte}`}>
            <h2 className={`mb-1 ${titre.carte}`}>Faire un don</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Le montant que vous voulez : celui du milieu est le plus courant.
            </p>
            <FormulaireDon
              montantInitial={montantInitial}
              source={estSource(source) ? source : "page"}
              donner={demarrerDon}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
