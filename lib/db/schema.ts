import { relations } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import type { AdapterAccountType } from "next-auth/adapters";

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

// ─── Auth.js tables (shape required by @auth/drizzle-adapter's SQLite adapter) ───
// We define these ourselves (instead of using the adapter's defaults) only to
// add the `role` column on `users`. Column names are snake_case in SQL, but the
// JS property names below must stay exactly as the adapter expects them.

export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "timestamp_ms" }),
  image: text("image"),
  role: text("role", { enum: ROLES }).notNull().default("transmetteur"),
});

export const accounts = sqliteTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ]
);

export const sessions = sqliteTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

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
    savoirFaire: text("savoir_faire").notNull(),
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
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    lieuApproximatif: text("lieu_approximatif").notNull(),
    modalitesAccueil: text("modalites_accueil"),
    hebergement: integer("hebergement", { mode: "boolean" })
      .notNull()
      .default(false),
    repas: integer("repas", { mode: "boolean" }).notNull().default(false),
    typeRepas: text("type_repas"),
    // Toggle kept from the legacy admin ("fiche visible" switch) so a fiche
    // can be hidden from the public site without deleting it.
    publiee: integer("publiee", { mode: "boolean" }).notNull().default(true),
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
    // Same-day schedule, e.g. [{heure: "7 h", titre: "Rafraîchi du levain"}].
    programme: text("programme", { mode: "json" })
      .$type<{ heure: string; titre: string }[]>()
      .notNull()
      .$defaultFn(() => []),
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
