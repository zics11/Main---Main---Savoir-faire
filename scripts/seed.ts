// Seeds the local database with the real categories and example fiches
// reused from the legacy static site (see legacy-html/), so the app has
// realistic content to develop against. Safe to re-run: it wipes and
// re-inserts the domain tables (never touches the users table).
import { db } from "../lib/db";
import { stageDates, stages, temoignages, transmetteurs } from "../lib/db/schema";

// year used for every seeded stage date (legacy content had no year attached
// to its "8-9 août" style dates — picked to stay close to the fictional
// "aujourd'hui" used across the legacy témoignages, e.g. "mai 2026")
const Y = 2026;
const d = (month: number, day: number) => new Date(Date.UTC(Y, month - 1, day));

type SeedStageDate = {
  dateDebut: Date;
  dateFin: Date;
  places?: number;
  inscrits?: number;
};

type SeedStage = {
  titre: string;
  type?: string;
  niveau?: string;
  duree?: string;
  prix?: string;
  description: string;
  programme?: { heure: string; titre: string }[];
  note?: string;
  dates: SeedStageDate[];
};

type SeedTemoignage = {
  texte: string;
  auteur: string;
  contexte: string;
};

type SeedTransmetteur = {
  slug: string;
  nom: string;
  nomLieu?: string;
  metier?: string;
  histoire: string;
  domaine: (typeof transmetteurs.$inferInsert)["domaine"];
  savoirFaire: string;
  email: string;
  lat: number;
  lng: number;
  lieuApproximatif: string;
  modalitesAccueil?: string;
  hebergement: boolean;
  repas?: boolean;
  typeRepas?: string;
  stages?: SeedStage[];
  temoignages?: SeedTemoignage[];
};

const SEED: SeedTransmetteur[] = [
  {
    slug: "rouvier",
    nom: "Élise Rouvier",
    nomLieu: "Le fournil de la Combe",
    metier: "paysanne-boulangère",
    histoire:
      "Paysanne-boulangère depuis quinze ans, je cultive mes blés anciens, les mouds à la meule de pierre et cuis au four à bois. Je transmets l'ensemble de la chaîne : de l'entretien du levain jusqu'à la cuisson, en passant par le pétrissage à la main et la conduite du four.",
    domaine: "alimentation",
    savoirFaire: "Pain au levain au four à bois",
    email: "elise@lefournildelacombe.fr",
    lat: 44.62,
    lng: 4.36,
    lieuApproximatif: "Saint-Julien-du-Serre, Ardèche (07)",
    modalitesAccueil:
      "Accueil de mars à novembre. Chaussures fermées et tablier conseillés. Yourte de 4 places, à 50 m du fournil.",
    hebergement: true,
    repas: true,
    typeRepas: "Repas partagés, produits de la ferme, végétariens sur demande",
    stages: [
      {
        titre: "Une fournée de A à Z",
        type: "Stage payant",
        niveau: "Débutant bienvenu",
        duree: "2 jours",
        prix: "180 € / pers.",
        description:
          "Deux jours au fournil : entretien du levain, pétrissage à la main, façonnage et conduite du four à bois. Vous repartez capable de mener une fournée seul·e.",
        note: "Farine, repas et pain à emporter compris. 4 personnes maximum.",
        programme: [
          { heure: "7 h", titre: "Rafraîchi du levain" },
          { heure: "9 h", titre: "Pétrissage à la main" },
          { heure: "12 h", titre: "Repas partagé" },
          { heure: "14 h", titre: "Façonnage et apprêt" },
          { heure: "17 h", titre: "Conduite du four à bois" },
          { heure: "19 h", titre: "Défournement" },
        ],
        dates: [
          { dateDebut: d(8, 8), dateFin: d(8, 9), places: 4, inscrits: 2 },
          { dateDebut: d(10, 3), dateFin: d(10, 4), places: 4, inscrits: 4 },
        ],
      },
      {
        titre: "Immersion au fournil",
        type: "Aide bénévole",
        niveau: "Quelques bases utiles",
        duree: "1 semaine",
        prix: "Échange",
        description:
          "Une semaine à mes côtés, aux vraies heures du fournil, contre logement en yourte et repas partagés. Esprit WWOOF : on apprend en travaillant ensemble.",
        note: "Logé en yourte, repas partagés. Une seule personne à la fois.",
        programme: [
          { heure: "6 h", titre: "Levain et allumage du four" },
          { heure: "8 h", titre: "Fournée du jour" },
          { heure: "13 h", titre: "Repas et sieste" },
          { heure: "16 h", titre: "Travaux du fournil, meunerie" },
          { heure: "18 h", titre: "Préparation du lendemain" },
        ],
        dates: [
          { dateDebut: d(9, 14), dateFin: d(9, 18), places: 2, inscrits: 1 },
          { dateDebut: d(10, 12), dateFin: d(10, 16), places: 2, inscrits: 0 },
        ],
      },
      {
        titre: "Fournée portes ouvertes",
        type: "Portes ouvertes",
        niveau: "Tout public",
        duree: "1 jour",
        prix: "Participation libre",
        description:
          "Un samedi par mois, le fournil est ouvert : venez voir tourner une fournée, poser vos questions et goûter le pain sorti du four.",
        note: "Sans inscription pour les visiteurs. Prévenez si vous venez en groupe.",
        programme: [
          { heure: "9 h", titre: "Accueil, visite du fournil" },
          { heure: "10 h", titre: "Démonstration de façonnage" },
          { heure: "11 h", titre: "Enfournement au four à bois" },
          { heure: "12 h", titre: "Dégustation et discussion" },
        ],
        dates: [
          { dateDebut: d(8, 22), dateFin: d(8, 22), places: 20, inscrits: 7 },
          { dateDebut: d(9, 26), dateFin: d(9, 26), places: 20, inscrits: 3 },
        ],
      },
    ],
    temoignages: [
      {
        texte:
          "Une semaine en immersion : j'ai appris plus qu'en un an de livres. Élise explique avec les mains, on comprend avec le corps.",
        auteur: "Thomas",
        contexte: "immersion bénévole, mai 2026",
      },
      {
        texte:
          "Le stage de deux jours m'a débloquée sur le levain. Six mois après, je cuis toutes mes miches au four communal du village.",
        auteur: "Nadia",
        contexte: "stage, octobre 2025",
      },
      {
        texte: "Accueil chaleureux, les mains dans la pâte dès la première heure.",
        auteur: "Camille",
        contexte: "atelier, avril 2026",
      },
    ],
  },
  {
    slug: "marchand",
    nom: "Bastien Marchand",
    nomLieu: "La forge du Vieux Chêne",
    metier: "forgeron",
    histoire:
      "Vingt ans devant l'enclume. J'aime commencer par la matière : sentir l'acier chaud avant de parler technique.",
    domaine: "artisanat",
    savoirFaire: "Forge et coutellerie",
    email: "bastien@forge-vieuxchene.fr",
    lat: 47.99,
    lng: 0.15,
    lieuApproximatif: "Sablé-sur-Sarthe, Sarthe (72)",
    modalitesAccueil: "Atelier ouvert toute l'année sauf en août.",
    hebergement: false,
    repas: false,
    stages: [
      {
        titre: "La forge allumée",
        type: "Portes ouvertes",
        niveau: "Tout public",
        duree: "1 jour",
        prix: "Gratuit",
        description:
          "Démonstration de forge et de trempe, chacun tire son crochet.",
        dates: [
          { dateDebut: d(8, 22), dateFin: d(8, 22), places: 20, inscrits: 5 },
        ],
      },
      {
        titre: "Forger son couteau de poche",
        type: "Stage payant",
        niveau: "Débutant bienvenu",
        duree: "2 jours",
        prix: "260 €",
        description:
          "De la lame brute au manche en bois local : forge, trempe, affûtage, montage.",
        dates: [
          { dateDebut: d(10, 24), dateFin: d(10, 25), places: 4, inscrits: 4 },
          { dateDebut: d(11, 14), dateFin: d(11, 15), places: 4, inscrits: 0 },
        ],
      },
    ],
    temoignages: [
      {
        texte:
          "Deux jours intenses, et je repars avec un couteau que j'utilise tous les jours.",
        auteur: "Rémi",
        contexte: "mars 2026",
      },
    ],
  },
  {
    slug: "capitelles",
    nom: "Collectif Les Capitelles",
    metier: "bâtisseurs en pierre sèche",
    histoire:
      "Murs de terrasse, capitelles, calades. On travaille sans mortier, à plusieurs, au rythme du chantier collectif.",
    domaine: "habitat",
    savoirFaire: "Pierre sèche",
    email: "contact@lescapitelles.org",
    lat: 43.21,
    lng: 2.29,
    lieuApproximatif: "Lagrasse, Aude (11)",
    modalitesAccueil:
      "Chantiers de mai à octobre. Apportez gants et chaussures de sécurité. Camping sur le terrain communal.",
    hebergement: true,
    repas: true,
    typeRepas: "Repas collectifs préparés à tour de rôle",
    stages: [
      {
        titre: "Mur en pierre sèche, sans mortier",
        type: "Chantier participatif",
        niveau: "Débutant bienvenu",
        duree: "5 jours",
        prix: "Participation libre",
        description:
          "Relever un mur de terrasse à l'ancienne, chantier collectif encadré.",
        dates: [
          { dateDebut: d(8, 12), dateFin: d(8, 16), places: 8, inscrits: 2 },
        ],
      },
    ],
  },
  {
    slug: "le-guen",
    nom: "Maud Le Guen",
    nomLieu: "L'osier de la Vilaine",
    metier: "vannière",
    histoire:
      "On commence par la cueillette au bord de la rivière. Un panier tenu dans ses mains vaut mille explications.",
    domaine: "artisanat",
    savoirFaire: "Vannerie d'osier",
    email: "maud@osier-vilaine.fr",
    lat: 48.11,
    lng: -1.68,
    lieuApproximatif: "Tinténiac, Ille-et-Vilaine (35)",
    modalitesAccueil: "Ateliers d'octobre à mars, saison de l'osier.",
    hebergement: false,
    repas: true,
    typeRepas: "Repas du midi tiré du sac, café offert",
    stages: [
      {
        titre: "Panier en osier vivant",
        type: "Stage payant",
        niveau: "Débutant bienvenu",
        duree: "1 jour",
        prix: "75 €",
        description: "Cueillette de l'osier puis montage d'un panier à anse.",
        dates: [
          { dateDebut: d(9, 20), dateFin: d(9, 20), places: 6, inscrits: 2 },
        ],
      },
    ],
    temoignages: [
      {
        texte: "Maud transmet une patience autant qu'une technique.",
        auteur: "Claire",
        contexte: "février 2026",
      },
    ],
  },
  {
    slug: "combe",
    nom: "Michel Combe",
    nomLieu: "Atelier Combe charpente",
    metier: "charpentier",
    histoire:
      "Assemblages bois, taille à la main, levage à l'ancienne. J'accueille surtout des gens en reconversion, sur demande.",
    domaine: "habitat",
    savoirFaire: "Charpente traditionnelle",
    email: "m.combe@charpente-isere.fr",
    lat: 45.18,
    lng: 5.72,
    lieuApproximatif: "Monestier-de-Clermont, Isère (38)",
    modalitesAccueil: "Pas de dates fixes : on convient ensemble.",
    hebergement: true,
    repas: true,
    typeRepas: "Repas partagés en famille",
  },
  {
    slug: "terre-crue",
    nom: "Atelier Terre Crue",
    metier: "maçons en terre",
    histoire:
      "Maçons en terre : nous rénovons des maisons en pisé et transmettons sur chantier réel, du gobetis aux finitions lissées.",
    domaine: "habitat",
    savoirFaire: "Enduits terre et chaux",
    email: "contact@atelierterrecrue.fr",
    lat: 43.6,
    lng: 1.44,
    lieuApproximatif: "Haute-Garonne (31)",
    hebergement: false,
  },
  {
    slug: "grand-pre",
    nom: "Ferme du Grand Pré",
    metier: "maraîchers-semenciers",
    histoire:
      "Maraîchers-semenciers : nous sélectionnons nos variétés depuis douze ans. Récolte, tri, conservation, tout s'apprend en faisant.",
    domaine: "jardin_nature",
    savoirFaire: "Semences paysannes",
    email: "contact@fermedugrandpre.fr",
    lat: 43.61,
    lng: 3.88,
    lieuApproximatif: "Hérault (34)",
    hebergement: true,
  },
  {
    slug: "andrieu",
    nom: "Joseph Andrieu",
    metier: "pépiniériste",
    histoire:
      "Pépiniériste conservant une centaine de variétés locales. J'échange volontiers la greffe contre un savoir-faire du bâti.",
    domaine: "jardin_nature",
    savoirFaire: "Greffe des fruitiers anciens",
    email: "joseph.andrieu@example.org",
    lat: 44.84,
    lng: -0.57,
    lieuApproximatif: "Gironde (33)",
    hebergement: false,
  },
  {
    slug: "bouchard",
    nom: "Nadia Bouchard",
    metier: "fromagère",
    histoire:
      "Fromagère : traite du matin, caillage, moulage, cave d'affinage. Deux jours pour comprendre un fromage de bout en bout.",
    domaine: "alimentation",
    savoirFaire: "Fromages fermiers au lait cru",
    email: "nadia.bouchard@example.org",
    lat: 47.24,
    lng: 6.02,
    lieuApproximatif: "Doubs (25)",
    hebergement: true,
  },
  {
    slug: "ariztia",
    nom: "Samuel Ariztia",
    metier: "potier",
    histoire:
      "Potier : terre locale, tour à pied, four à bois deux fois l'an. La cuisson collective est le vrai moment d'apprentissage.",
    domaine: "artisanat",
    savoirFaire: "Tournage et cuisson au bois",
    email: "samuel.ariztia@example.org",
    lat: 46.3,
    lng: 4.83,
    lieuApproximatif: "Saône-et-Loire (71)",
    hebergement: false,
  },
  {
    slug: "kirchner",
    nom: "Anton Kirchner",
    metier: "brasseur",
    histoire: "Brasseur artisanal, spécialisé en brasserie artisanale de tradition alsacienne.",
    domaine: "alimentation",
    savoirFaire: "Brasserie artisanale",
    email: "anton.kirchner@example.org",
    lat: 48.58,
    lng: 7.26,
    lieuApproximatif: "Bas-Rhin (67)",
    hebergement: false,
  },
  {
    slug: "pellec",
    nom: "Solenn Pellec",
    metier: "apicultrice",
    histoire: "Apicultrice, spécialisée en apiculture et ruches troncs traditionnelles.",
    domaine: "jardin_nature",
    savoirFaire: "Apiculture et ruches troncs",
    email: "solenn.pellec@example.org",
    lat: 48.28,
    lng: -4.1,
    lieuApproximatif: "Finistère (29)",
    hebergement: true,
  },
  {
    slug: "vidal",
    nom: "Hugo Vidal",
    metier: "coutelier",
    histoire: "Coutelier, spécialisé en coutellerie de poche.",
    domaine: "artisanat",
    savoirFaire: "Coutellerie de poche",
    email: "hugo.vidal@example.org",
    lat: 45.77,
    lng: 3.08,
    lieuApproximatif: "Puy-de-Dôme (63)",
    hebergement: false,
  },
  {
    slug: "moulin-loire",
    nom: "Le Moulin de Loire",
    metier: "meuniers",
    histoire: "Meuniers pratiquant la meunerie à la meule de pierre.",
    domaine: "alimentation",
    savoirFaire: "Meunerie à la meule de pierre",
    email: "contact@moulindeloire.fr",
    lat: 47.39,
    lng: 0.69,
    lieuApproximatif: "Indre-et-Loire (37)",
    hebergement: true,
  },
  {
    slug: "mercier",
    nom: "Claire Mercier",
    metier: "maroquinière",
    histoire: "Maroquinière, spécialisée dans le travail du cuir.",
    domaine: "artisanat",
    savoirFaire: "Travail du cuir",
    email: "claire.mercier@example.org",
    lat: 49.11,
    lng: 6.13,
    lieuApproximatif: "Moselle (57)",
    hebergement: false,
  },
  {
    slug: "atelier-bois",
    nom: "Atelier du Faubourg",
    metier: "menuisiers",
    histoire: "Menuisiers spécialisés en menuiserie d'ameublement.",
    domaine: "habitat",
    savoirFaire: "Menuiserie d'ameublement",
    email: "contact@atelierdufaubourg.fr",
    lat: 48.86,
    lng: 2.35,
    lieuApproximatif: "Paris (75)",
    hebergement: false,
  },
];

function seed() {
  db.transaction((tx) => {
    // Wipe domain tables (order matters for FKs); Auth.js tables untouched.
    tx.delete(stageDates).run();
    tx.delete(stages).run();
    tx.delete(temoignages).run();
    tx.delete(transmetteurs).run();

    for (const t of SEED) {
      const [row] = tx
        .insert(transmetteurs)
        .values({
          slug: t.slug,
          nom: t.nom,
          nomLieu: t.nomLieu,
          metier: t.metier,
          histoire: t.histoire,
          domaine: t.domaine,
          savoirFaire: t.savoirFaire,
          email: t.email,
          lat: t.lat,
          lng: t.lng,
          lieuApproximatif: t.lieuApproximatif,
          modalitesAccueil: t.modalitesAccueil,
          hebergement: t.hebergement,
          repas: t.repas ?? false,
          typeRepas: t.typeRepas,
        })
        .returning()
        .all();

      for (const s of t.stages ?? []) {
        const [stageRow] = tx
          .insert(stages)
          .values({
            transmetteurId: row.id,
            titre: s.titre,
            type: s.type,
            niveau: s.niveau,
            duree: s.duree,
            prix: s.prix,
            description: s.description,
            programme: s.programme ?? [],
            note: s.note,
          })
          .returning()
          .all();

        for (const date of s.dates) {
          tx.insert(stageDates).values({
            stageId: stageRow.id,
            dateDebut: date.dateDebut,
            dateFin: date.dateFin,
            places: date.places ?? null,
            inscrits: date.inscrits ?? 0,
          }).run();
        }
      }

      for (const avis of t.temoignages ?? []) {
        tx.insert(temoignages).values({
          transmetteurId: row.id,
          texte: avis.texte,
          auteur: avis.auteur,
          contexte: avis.contexte,
        }).run();
      }
    }
  });

  console.log(`Seeded ${SEED.length} transmetteurs.`);
}

seed();
