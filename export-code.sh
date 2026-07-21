#!/bin/bash
# Génère un export du code source destiné à une relecture externe (audit).
# Un seul fichier Markdown, chaque source dans un bloc de code annoté de son chemin.
set -euo pipefail
export LANG=fr_FR.UTF-8 LC_ALL=fr_FR.UTF-8

cd "$(dirname "$0")"
SORTIE="klubster-code-$(date +%Y-%m-%d).md"

# Le lockfile est exclu : 20 000 lignes de sommes de contrôle qui noieraient la relecture.
FICHIERS=$( (git ls-files; ls .github/workflows/*.yml 2>/dev/null || true) \
  | grep -E '\.(ts|tsx|js|mjs|json|sql|yml|css)$' \
  | grep -vE 'package-lock\.json' \
  | sort -u )

{
  cat AUDIT-ENTETE.md
  echo
  echo "---"
  echo
  echo "## Inventaire"
  echo
  echo '```'
  echo "$FICHIERS"
  echo '```'
  echo
  echo "---"
  echo
  for f in $FICHIERS; do
    [ -f "$f" ] || continue
    case "$f" in
      *.ts|*.tsx) lang=typescript ;;
      *.js|*.mjs) lang=javascript ;;
      *.json) lang=json ;;
      *.sql) lang=sql ;;
      *.yml) lang=yaml ;;
      *.css) lang=css ;;
      *) lang="" ;;
    esac
    echo "### \`$f\`"
    echo
    echo '```'"$lang"
    cat "$f"
    echo '```'
    echo
  done
} > "$SORTIE"

echo "$SORTIE"
wc -c < "$SORTIE"
