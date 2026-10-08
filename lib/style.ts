// Le vocabulaire visuel du site : les mêmes classes pour les mêmes choses,
// d'une page à l'autre. Un bouton principal a partout la même taille, un
// petit intitulé en capitales partout le même corps, un champ partout la
// même hauteur. Les couleurs viennent de globals.css.

const baseBouton =
  "inline-flex items-center justify-center gap-2 rounded-sm text-sm font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50";

/** Les boutons, un style par rôle. Taille courante ; `grand` pour l'appel principal d'une page. */
export const bouton = {
  /** L'action principale de l'écran. */
  primaire: `${baseBouton} bg-primary px-5 py-2.5 text-primary-foreground hover:bg-[#8a4222]`,
  /** Une action mise en avant sans être la principale. */
  contour: `${baseBouton} border border-primary bg-card px-5 py-2.5 text-primary hover:bg-accent`,
  /** Une action à côté de la principale. */
  secondaire: `${baseBouton} border border-input bg-card px-5 py-2.5 text-foreground/80 hover:bg-accent`,
  /** Irréversible : supprimer, abandonner. */
  danger: `${baseBouton} bg-destructive px-5 py-2.5 text-destructive-foreground hover:opacity-90`,
  /** Une sortie discrète : « Annuler ». */
  discret:
    "text-sm text-muted-foreground hover:text-foreground disabled:opacity-50",
  /** Un lien d'action dans le texte : « Annuler ce changement ». */
  lien: "text-sm font-medium text-primary hover:underline disabled:opacity-50",
};

/** À ajouter à un bouton : l'appel principal d'une page (accueil, fiche, barre du bas). */
export const grand = "px-6 py-3";

/** Petit intitulé en capitales au-dessus d'un titre de page ou de section. */
// La police est précisée : posés sur un titre (h2, h3…), ces intitulés
// prendraient sinon le Cormorant des titres.
export const surtitre =
  "font-sans text-xs font-medium tracking-wider text-primary uppercase";

/** Intitulé d'un encadré ou d'un groupe de champs, en capitales discrètes. */
export const intitule =
  "font-sans text-xs font-semibold tracking-wider text-muted-foreground uppercase";

/** Étiquette posée sur un élément : forme d'un stage, domaine d'une fiche. */
export const etiquette =
  "inline-block rounded-sm bg-accent px-2 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap text-primary uppercase";

/** Le cadre d'un champ, sans largeur : pour les petits champs (durée, heure). */
export const cadreChamp =
  "rounded-sm border border-input bg-card px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:outline-none";

/** Un champ de saisie : même hauteur et même cadre partout. */
export const champ = `w-full ${cadreChamp}`;

/** Un encadré : fiche, compte, réglages. */
export const carte = "rounded-sm border border-border bg-card p-6";

/** Titres. */
export const titre = {
  /** Sections de l'accueil : un cran au-dessus, c'est la page d'entrée. */
  accueil: "font-serif text-3xl leading-snug font-semibold",
  /** Page de contenu : fiche, journal, connexion. */
  page: "font-serif text-4xl leading-tight font-semibold",
  /** Page d'outil : carte, stages, espaces, administration. */
  outil: "font-serif text-3xl leading-tight font-semibold",
  /** Section d'une page. */
  section: "font-serif text-2xl font-semibold",
  /** Titre d'un encadré. */
  carte: "font-serif text-xl font-semibold",
};

/** Messages après une action. */
export const message = {
  succes: "text-sm text-success-foreground",
  erreur: "text-sm text-destructive",
};

/** Le bouton qui ferme une fenêtre : carré, comme le reste du site. */
export const boutonFermer =
  "flex h-9 w-9 items-center justify-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-foreground";

/**
 * La date en bande calendrier (SAM / 10 / OCT) : dans la liste de la page
 * Stages et dans la bulle de sa carte, à l'identique.
 */
export const bandeDate = {
  cadre:
    "flex w-20 shrink-0 flex-col items-center justify-center gap-1 border-r border-primary/15 bg-accent/60 px-2 py-4 leading-none text-primary",
  mention: "text-[11px] font-semibold tracking-wider uppercase",
  numero: "text-3xl font-semibold tabular-nums",
};
