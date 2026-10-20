#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
database_path="${TODOALL_DB_PATH:-$project_dir/data/todoall.db}"
backup_dir="${TODOALL_BACKUP_DIR:-$project_dir/backups}"

if [[ ! -f "$database_path" ]]; then
  echo "数据库不存在：$database_path" >&2
  exit 1
fi

mkdir -p "$backup_dir"
backup_path="$backup_dir/todoall-$(date +%Y%m%d-%H%M%S).db"
sqlite3 "$database_path" ".backup '$backup_path'"
sqlite3 "$backup_path" "PRAGMA integrity_check;" | grep -qx "ok"
echo "备份完成：$backup_path"
