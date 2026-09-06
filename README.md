# Main à Main

Plateforme de mise en relation entre transmetteurs de savoir-faire manuels et
personnes qui veulent apprendre. Gratuite, sans commission, sans compte pour
les visiteurs.

Migré depuis une maquette HTML/CSS/JS statique (conservée pour référence dans
[`legacy-html/`](./legacy-html)) vers Next.js.

## Stack

- Next.js 16 (App Router, TypeScript, Turbopack)
- Tailwind CSS v4 + shadcn/ui
- SQLite (fichier unique) via `better-sqlite3` + Drizzle ORM
- Auth.js v5 — connexion par lien magique par email uniquement (SMTP Brevo)
- MapLibre GL JS + tuiles CARTO (gratuites, sans clé) + `supercluster`
- `sharp` pour la conversion/redimensionnement des photos uploadées

## Démarrage local

Node **22.13+** est requis (voir `.nvmrc` — `nvm use`). Sur certaines
versions de Node plus anciennes, le binaire natif de `better-sqlite3` peut
planter (segfault) au chargement : si `npm run dev` crashe immédiatement,
vérifiez d'abord votre version de Node.

```bash
npm install
cp .env.example .env.local   # puis renseigner AUTH_SECRET (npx auth secret) et SMTP_*
npm run db:migrate           # crée data/main-a-main.db et applique le schéma
npm run db:seed              # optionnel : recharge le contenu de démonstration
npm run dev
```

Le site est sur http://localhost:3000. `/admin` et `/mes-stages` nécessitent
une session — voir plus bas pour créer un premier compte admin.

### Créer le premier compte admin

Il n'y a pas d'interface d'inscription : le premier admin doit être inséré
directement en base (les suivants peuvent être créés depuis l'admin).

```bash
node -e "
const { randomUUID } = require('crypto');
const Database = require('better-sqlite3');
const db = new Database('./data/main-a-main.db');
db.prepare('INSERT INTO users (id, email, role) VALUES (?, ?, ?)')
  .run(randomUUID(), 'vous@exemple.fr', 'admin');
"
```

Puis connectez-vous sur `/connexion` avec cette adresse : un lien de
connexion est envoyé par email (il faut donc que `SMTP_*` soit configuré,
même en local — un compte Brevo gratuit suffit).

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm run start` | Build + démarrage en production |
| `npm run lint` | ESLint |
| `npm run db:generate` | Génère une migration Drizzle à partir de `lib/db/schema.ts` |
| `npm run db:migrate` | Applique les migrations (`drizzle/migrations/`) |
| `npm run db:seed` | Recharge les données de démonstration (reprises du site HTML d'origine) |
| `npm run db:studio` | Ouvre Drizzle Studio sur la base locale |

## Déploiement (Docker)

Conteneur unique, sans reverse proxy (à mettre en place côté serveur).
SQLite et les photos uploadées vivent dans deux volumes Docker nommés.

```bash
cp .env.example .env   # AUTH_SECRET, AUTH_URL (URL publique du site), SMTP_*
docker compose up -d --build
```

Les migrations sont appliquées automatiquement au démarrage du conteneur
(voir `Dockerfile` / `CMD`).

### Sauvegardes

`scripts/backup.sh` archive les deux volumes (`main-a-main_data`,
`main-a-main_uploads`) dans une tarball datée. À brancher sur une tâche cron
du serveur hôte :

```bash
0 3 * * * /chemin/vers/main-a-main/scripts/backup.sh >> /var/log/main-a-main-backup.log 2>&1
```

## Structure

```
app/                  routes (App Router)
  admin/               back-office (rôle admin)
  mes-stages/          espace transmetteur (stages uniquement)
  fiche/[slug]/         fiche publique d'un transmetteur
  connexion/           connexion par lien magique
lib/
  db/schema.ts         schéma Drizzle
  auth.ts              config Auth.js
  dal.ts               vérifications d'accès côté serveur (admin / transmetteur)
  upload.ts            validation + redimensionnement des photos
components/
  map/                 carte MapLibre + clustering
  admin/, mes-stages/  formulaires spécifiques à chaque espace
drizzle/migrations/    migrations SQL versionnées
scripts/               migration, seed, backup
```
