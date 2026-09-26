// Saisie masquée dans le terminal : partagée par les commandes qui demandent
// un mot de passe, pour qu'il ne s'affiche pas et ne passe pas par un
// argument de commande (visible dans l'historique du shell).
const CTRL_C = String.fromCharCode(3);
const RETOUR_ARRIERE = [String.fromCharCode(127), String.fromCharCode(8)];

export function saisieMasquee(question: string) {
  return new Promise<string>((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let valeur = "";
    const surTouche = (touches: string) => {
      for (const c of touches) {
        if (c === "\r" || c === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", surTouche);
          process.stdout.write("\n");
          return resolve(valeur);
        }
        if (c === CTRL_C) {
          stdin.setRawMode(false);
          process.stdout.write("\n");
          process.exit(1);
        }
        if (RETOUR_ARRIERE.includes(c)) valeur = valeur.slice(0, -1);
        else valeur += c;
      }
    };
    stdin.on("data", surTouche);
  });
}

/** Demande un mot de passe et sa confirmation. Sort en erreur si l'un cloche. */
export async function demanderMotDePasse(longueurMin: number) {
  const motDePasse = await saisieMasquee("Mot de passe : ");
  if (motDePasse.length < longueurMin) {
    console.error(`Trop court : ${longueurMin} caractères minimum.`);
    process.exit(1);
  }
  if ((await saisieMasquee("Confirmez : ")) !== motDePasse) {
    console.error("Les deux saisies ne correspondent pas.");
    process.exit(1);
  }
  return motDePasse;
}
