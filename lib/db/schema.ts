import { relations } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { ProgrammeStocke } from "@/lib/programme";

// ─── Enums (application-level, enforced via TS + SQLite CHECK through `enum`) ───

export const ROLES = ["admin", "transmetteur"] as const;
export type Role = (typeof ROLES)[number];

export const DOMAINES = [
  "habitat",
  "artisanat",
  "alimentation",
  "jardin_nature",
] as const;
export type Domaine = (typeof DOMAINES)[number];

// ─── Comptes ───
// La connexion se fait par email + mot de passe (voir lib/auth.ts) : cette
// table suffit. Les tables accounts / sessions / verification_tokens de
// Auth.js ont été supprimées avec la connexion par lien.

export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "timestamp_ms" }),
  image: text("image"),
  role: text("role", { enum: ROLES }).notNull().default("transmetteur"),
  /** Empreinte scrypt (voir lib/password.ts). Nulle = compte sans mot de
   *  passe, donc hors d'état de se connecter : l'admin lui en envoie un
   *  depuis sa fiche, ou `npm run admin:mot-de-passe` pour un admin. */
  passwordHash: text("password_hash"),
  /** Empreinte SHA-256 du jeton d'accueil (voir lib/activation.ts) : il ouvre
   *  la page où le transmetteur choisit son premier mot de passe. Effacé dès
   *  qu'il a servi. */
  activationToken: text("activation_token"),
  activationExpires: integer("activation_expires", { mode: "timestamp_ms" }),
  /** Changement d'adresse demandé mais pas encore confirmé : tant que le
   *  lien envoyé à cette nouvelle adresse n'a pas été cliqué, la connexion
   *  reste l'ancienne. Évite d'enfermer quelqu'un dehors sur une faute de
   *  frappe. */
  emailEnAttente: text("email_en_attente"),
  emailToken: text("email_token"),
  emailTokenExpires: integer("email_token_expires", { mode: "timestamp_ms" }),
  /** Secret partagé avec son application d'authentification (base32), une
   *  fois l'activation confirmée. C'est `totpActiveLe` qui fait foi. */
  totpSecret: text("totp_secret"),
  /** Secret proposé pendant l'enrôlement, tant qu'aucun code ne l'a validé :
   *  séparé du précédent pour qu'une activation abandonnée ne verrouille
   *  rien et n'efface pas une protection déjà en place. */
  totpSecretEnAttente: text("totp_secret_en_attente"),
  totpActiveLe: integer("totp_active_le", { mode: "timestamp_ms" }),
  /** Codes de secours restants, hachés comme des mots de passe. */
  totpCodesSecours: text("totp_codes_secours", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .$defaultFn(() => []),
  /** Jeton de récupération de mot de passe : le lien envoyé par email ouvre
   *  la page où l'on en choisit un nouveau. Usage unique, 2 heures. */
  reinitToken: text("reinit_token"),
  reinitExpires: integer("reinit_expires", { mode: "timestamp_ms" }),
});

// ─── Domain tables ───

export const transmetteurs = sqliteTable(
  "transmetteurs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // Nullable: a fiche can exist before the transmetteur has an account
    // (admin creates the fiche first, then invites the transmetteur by email).
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    nom: text("nom").notNull(),
    // Optional: the place/workshop's own name, shown as the fiche's main
    // heading when set (e.g. "Le fournil de la Combe"), with `nom` and
    // `metier` demoted to a subtitle line. Falls back to `nom` as heading
    // when empty.
    nomLieu: text("nom_lieu"),
    metier: text("metier"),
    slug: text("slug").notNull().unique(),
    histoire: text("histoire").notNull().default(""),
    domaine: text("domaine", { enum: DOMAINES }).notNull(),
    // Facultatifs à la création : l'admin ne saisit que le nom et l'email,
    // le transmetteur complète ensuite depuis son espace. La publication,
    // elle, exige que tout soit rempli (voir champsManquants dans lib/fiche).
    savoirFaire: text("savoir_faire"),
    // Relative paths under /uploads, e.g. ["/uploads/abc123.webp"]
    photos: text("photos", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .$defaultFn(() => []),
    // Portrait du transmetteur lui-même (visage), distinct des photos du
    // lieu/de l'activité ci-dessus — affiché dans la carte d'identité de la
    // fiche publique. Null tant qu'aucun n'a été mis en ligne.
    photoPortrait: text("photo_portrait"),
    siteWeb: text("site_web"),
    reseauxSociaux: text("reseaux_sociaux"),
    email: text("email").notNull(),
    lat: real("lat"),
    lng: real("lng"),
    // Localisation : la commune et son code postal situent la fiche (ils sont
    // exigés pour la mise en ligne) ; le complément, lui, reste libre et
    // facultatif — « à 10 min de Lézignan », « sur le plateau ».
    ville: text("ville"),
    codePostal: text("code_postal"),
    lieuApproximatif: text("lieu_approximatif"),
    modalitesAccueil: text("modalites_accueil"),
    hebergement: integer("hebergement", { mode: "boolean" })
      .notNull()
      .default(false),
    repas: integer("repas", { mode: "boolean" }).notNull().default(false),
    typeRepas: text("type_repas"),
    // Toggle kept from the legacy admin ("fiche visible" switch) so a fiche
    // can be hidden from the public site without deleting it.
    publiee: integer("publiee", { mode: "boolean" }).notNull().default(true),
    // Date à laquelle le transmetteur a demandé la mise en ligne. Distingue
    // une fiche encore en cours de remplissage d'une fiche qui attend la
    // décision de l'association. Remise à null dès qu'elle est tranchée.
    publicationDemandeeLe: integer("publication_demandee_le", {
      mode: "timestamp_ms",
    }),
    // Date de la première mise en ligne par l'association. Une fois donnée,
    // cet accord vaut pour la suite : le transmetteur peut retirer puis
    // remettre sa fiche en ligne sans repasser par une demande.
    premiereValidationLe: integer("premiere_validation_le", {
      mode: "timestamp_ms",
    }),
    // Date du dernier envoi du mail de première connexion, pour savoir si le
    // transmetteur a déjà reçu son lien ou s'il attend encore.
    invitationEnvoyeeLe: integer("invitation_envoyee_le", {
      mode: "timestamp_ms",
    }),
    // Suspension décidée par l'association : la fiche sort du site et le
    // transmetteur ne peut ni la remettre en ligne ni redemander sa
    // publication tant que le blocage tient.
    bloqueeLe: integer("bloquee_le", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    index("transmetteurs_domaine_idx").on(t.domaine),
    index("transmetteurs_publiee_idx").on(t.publiee),
  ]
);

// A stage's info (titre, niveau, prix, programme…) is entered once and can
// have several dates — e.g. "Une fournée de A à Z" happening both 8-9 août
// and 3-4 octobre — each tracked separately in `stageDates` below.
export const stages = sqliteTable(
  "stages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    transmetteurId: text("transmetteur_id")
      .notNull()
      .references(() => transmetteurs.id, { onDelete: "cascade" }),
    titre: text("titre").notNull(),
    // Niveau and forme de transmission live only here, per stage — not on
    // the transmetteur profile, since one transmetteur can offer several
    // different kinds of stages (e.g. a paid workshop and a volunteer-work
    // immersion). Both are free text in the DB but presented as a <select>
    // from a fixed list in the UI (see TYPES_TRANSMISSION / NIVEAUX_STAGE).
    type: text("type"),
    niveau: text("niveau"),
    duree: text("duree"),
    prix: text("prix"),
    description: text("description").notNull().default(""),
    // Le déroulé : une journée, ou un programme par jour (voir
    // lib/programme.ts). Les stages d'avant gardent l'ancien tableau d'une
    // journée ; on les relit toujours avec `lireProgramme`.
    programme: text("programme", { mode: "json" })
      .$type<ProgrammeStocke>()
      .notNull()
      .$defaultFn(() => ({ type: "journee", moments: [] })),
    note: text("note"),
    // Relative paths under /uploads — photos spécifiques à ce stage (le
    // fournil pendant le stage, les pièces réalisées…), distinctes de la
    // galerie générale de la fiche.
    photos: text("photos", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .$defaultFn(() => []),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("stages_transmetteur_idx").on(t.transmetteurId)]
);

export const stageDates = sqliteTable(
  "stage_dates",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    stageId: text("stage_id")
      .notNull()
      .references(() => stages.id, { onDelete: "cascade" }),
    dateDebut: integer("date_debut", { mode: "timestamp_ms" }).notNull(),
    dateFin: integer("date_fin", { mode: "timestamp_ms" }).notNull(),
    // Total capacity (null = not tracked) and how many are currently signed
    // up — the admin/transmetteur keeps `inscrits` up to date by hand as
    // people register directly with them by email; the public fiche only
    // ever shows the computed remainder ("places - inscrits").
    places: integer("places"),
    inscrits: integer("inscrits").notNull().default(0),
    // Lets one date be hidden from the public fiche without deleting it or
    // touching the stage's other dates.
    publiee: integer("publiee", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("stage_dates_stage_idx").on(t.stageId)]
);

// Curated by the admin (no public submission flow, matching the legacy
// site) — a short quote plus who said it and when/in what context, e.g.
// auteur: "Thomas", contexte: "immersion bénévole, mai 2026".
export const temoignages = sqliteTable(
  "temoignages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    transmetteurId: text("transmetteur_id")
      .notNull()
      .references(() => transmetteurs.id, { onDelete: "cascade" }),
    texte: text("texte").notNull(),
    auteur: text("auteur").notNull(),
    contexte: text("contexte").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("temoignages_transmetteur_idx").on(t.transmetteurId)]
);

// Une demande de contact passée par le site : de quoi dire au transmetteur
// combien de demandes lui sont parvenues, et limiter les confirmations
// envoyées à une même adresse. Rien de lisible sur l'apprenant : son adresse
// n'est gardée qu'en empreinte, le message n'est pas conservé.
export const demandesContact = sqliteTable(
  "demandes_contact",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    transmetteurId: text("transmetteur_id")
      .notNull()
      .references(() => transmetteurs.id, { onDelete: "cascade" }),
    stageId: text("stage_id").references(() => stages.id, {
      onDelete: "set null",
    }),
    /** HMAC de l'adresse de l'apprenant (voir lib/demandes-contact.ts). */
    emailEmpreinte: text("email_empreinte").notNull(),
    /** La confirmation lui a été envoyée. */
    confirmee: integer("confirmee", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    index("demandes_contact_transmetteur_idx").on(t.transmetteurId),
    index("demandes_contact_email_idx").on(t.emailEmpreinte, t.createdAt),
  ]
);

// Une demande de témoignage envoyée par un transmetteur à quelqu'un venu en
// stage. La personne reçoit un lien à usage unique : elle laisse un mot, ou
// décline. Une seule demande par adresse et par fiche — l'index unique
// l'impose, même si deux envois partent en même temps.
export const demandesTemoignage = sqliteTable(
  "demandes_temoignage",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    transmetteurId: text("transmetteur_id")
      .notNull()
      .references(() => transmetteurs.id, { onDelete: "cascade" }),
    // Le stage concerné, s'il a été précisé ; la demande survit à sa
    // suppression.
    stageId: text("stage_id").references(() => stages.id, {
      onDelete: "set null",
    }),
    nom: text("nom").notNull(),
    /** En minuscules : « Camille@… » et « camille@… » sont la même personne. */
    email: text("email").notNull(),
    /** Empreinte du lien envoyé : une copie de la base n'ouvre aucun formulaire. */
    jeton: text("jeton").notNull(),
    expireLe: integer("expire_le", { mode: "timestamp_ms" }).notNull(),
    envoyeeLe: integer("envoyee_le", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    /** « temoignage » ou « refus » ; null tant que la personne n'a pas répondu. */
    reponse: text("reponse", { enum: ["temoignage", "refus"] }),
    reponduLe: integer("repondu_le", { mode: "timestamp_ms" }),
    temoignageId: text("temoignage_id").references(() => temoignages.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    uniqueIndex("demandes_temoignage_fiche_email_idx").on(
      t.transmetteurId,
      t.email
    ),
    uniqueIndex("demandes_temoignage_jeton_idx").on(t.jeton),
  ]
);

// ─── Relations (enables db.query.* with `with: {...}`) ───

export const usersRelations = relations(users, ({ one }) => ({
  transmetteur: one(transmetteurs, {
    fields: [users.id],
    references: [transmetteurs.userId],
  }),
}));

export const transmetteursRelations = relations(
  transmetteurs,
  ({ one, many }) => ({
    user: one(users, {
      fields: [transmetteurs.userId],
      references: [users.id],
    }),
    stages: many(stages),
    temoignages: many(temoignages),
    demandesTemoignage: many(demandesTemoignage),
  })
);

export const stagesRelations = relations(stages, ({ one, many }) => ({
  transmetteur: one(transmetteurs, {
    fields: [stages.transmetteurId],
    references: [transmetteurs.id],
  }),
  dates: many(stageDates),
}));

export const stageDatesRelations = relations(stageDates, ({ one }) => ({
  stage: one(stages, {
    fields: [stageDates.stageId],
    references: [stages.id],
  }),
}));

export const temoignagesRelations = relations(temoignages, ({ one }) => ({
  transmetteur: one(transmetteurs, {
    fields: [temoignages.transmetteurId],
    references: [transmetteurs.id],
  }),
}));

export const demandesTemoignageRelations = relations(
  demandesTemoignage,
  ({ one }) => ({
    transmetteur: one(transmetteurs, {
      fields: [demandesTemoignage.transmetteurId],
      references: [transmetteurs.id],
    }),
    stage: one(stages, {
      fields: [demandesTemoignage.stageId],
      references: [stages.id],
    }),
  })
);

// ─── Convenience types ───

export type User = typeof users.$inferSelect;
export type Transmetteur = typeof transmetteurs.$inferSelect;
export type NewTransmetteur = typeof transmetteurs.$inferInsert;
export type Stage = typeof stages.$inferSelect;
export type NewStage = typeof stages.$inferInsert;
export type StageDate = typeof stageDates.$inferSelect;
export type NewStageDate = typeof stageDates.$inferInsert;
export type Temoignage = typeof temoignages.$inferSelect;
export type NewTemoignage = typeof temoignages.$inferInsert;
export type DemandeTemoignage = typeof demandesTemoignage.$inferSelect;
