# BizSim Database Backup & Restore Runbook

## Strategy

| Item | Policy |
|------|--------|
| **Frequency** | Daily full backup at 02:00 UTC |
| **Retention** | 30 days hot (S3 Standard), 90 days cold (S3 Glacier) |
| **Scope** | Full PostgreSQL logical dump (`pg_dump`) |
| **Encryption** | AES-256 at rest (S3 SSE-S3 or SSE-KMS) |
| **Verification** | Weekly restore test to staging |

## Prerequisites

- PostgreSQL client tools (`pg_dump`, `pg_restore`, `psql`)
- AWS CLI configured (production)
- `DATABASE_URL` or discrete `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

## Daily Backup (Manual / Cron)

### Linux / macOS

```bash
chmod +x scripts/backup-db.sh
DATABASE_URL="postgresql://bizsim:bizsim@localhost:5432/bizsim" \
BACKUP_DIR="./backups" \
  ./scripts/backup-db.sh
```

### Windows (PowerShell)

```powershell
$env:DATABASE_URL = "postgresql://bizsim:bizsim@localhost:5432/bizsim"
$env:BACKUP_DIR = ".\backups"
bash scripts/backup-db.sh
```

### Production (S3 upload)

```bash
DATABASE_URL="$PRODUCTION_DATABASE_URL" \
BACKUP_DIR="/tmp/bizsim-backups" \
S3_BUCKET="bizsim-db-backups" \
  ./scripts/backup-db.sh
```

The script creates a timestamped `.sql.gz` file and uploads to S3 when `S3_BUCKET` is set.

## Restore Procedure

### 1. Stop application traffic

Put the app in maintenance mode or scale ECS service to 0 to prevent writes during restore.

### 2. Restore database

```bash
chmod +x scripts/restore-db.sh
DATABASE_URL="postgresql://bizsim:bizsim@localhost:5432/bizsim" \
  ./scripts/restore-db.sh ./backups/bizsim_20250613_020000.sql.gz
```

### 3. Re-apply RLS policies

RLS policies are not included in logical dumps. Re-apply after restore:

```bash
psql $DATABASE_URL -f prisma/migrations/rls/001_enable_rls.sql
```

### 4. Verify

```bash
curl http://localhost:3000/api/health/ready
npm run db:seed   # only on empty/staging restore
```

### 5. Resume traffic

Scale application back up and monitor Sentry + CloudWatch for errors.

## AWS RDS Automated Backups

For RDS PostgreSQL in production:

1. Enable automated backups (retention 30 days minimum)
2. Enable point-in-time recovery (PITR)
3. Create manual snapshot before major migrations
4. Cross-region snapshot copy for disaster recovery

## Incident Response

| Scenario | Action |
|----------|--------|
| Accidental DELETE | PITR restore to timestamp before incident |
| Corrupted migration | Restore latest daily backup to staging, validate, promote |
| Full region outage | Restore snapshot in DR region, update DNS |

## Recovery Objectives

| Metric | Target |
|--------|--------|
| **RPO** (max data loss) | 24 hours (daily backup) / 5 min (RDS PITR) |
| **RTO** (time to restore) | 2 hours |

## Contacts

Document on-call rotation and escalation path in your internal ops wiki. Update this runbook when infrastructure changes.
