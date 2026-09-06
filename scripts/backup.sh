#!/bin/sh
# Backs up the SQLite database and the uploaded photos to a single dated
# tarball. Runs against the named Docker volumes directly, so it works
# whether or not the app container is currently running.
#
# Usage: ./scripts/backup.sh [destination_dir]
# Cron example (daily at 3am, keeping the default destination):
#   0 3 * * * /path/to/main-a-main/scripts/backup.sh >> /var/log/main-a-main-backup.log 2>&1

set -eu

DEST_DIR="${1:-/var/backups/main-a-main}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DATA_VOLUME="main-a-main_data"
UPLOADS_VOLUME="main-a-main_uploads"

mkdir -p "$DEST_DIR"

docker run --rm \
  -v "${DATA_VOLUME}:/data:ro" \
  -v "${UPLOADS_VOLUME}:/uploads:ro" \
  -v "${DEST_DIR}:/backup" \
  alpine \
  tar czf "/backup/main-a-main-${TIMESTAMP}.tar.gz" -C / data uploads

echo "Backup written to ${DEST_DIR}/main-a-main-${TIMESTAMP}.tar.gz"

# Keep the last 30 backups, delete anything older.
find "$DEST_DIR" -name 'main-a-main-*.tar.gz' -mtime +30 -delete
