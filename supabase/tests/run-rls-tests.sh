#!/usr/bin/env bash
# Run the RLS tests against a throwaway postgres:16 container (needs Docker).
#   bash supabase/tests/run-rls-tests.sh               # all migrations, expect pass
#   bash supabase/tests/run-rls-tests.sh --before-fix  # skip 0003, expect FAILs
set -euo pipefail

cd "$(dirname "$0")/../.."
export MSYS_NO_PATHCONV=1

name="megashop-rls-test-$$"
docker run -d --rm --name "$name" -e POSTGRES_PASSWORD=postgres postgres:16 >/dev/null
trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT

for _ in $(seq 1 30); do
  docker exec "$name" pg_isready -U postgres -q 2>/dev/null && break
  sleep 1
done

migrations=$(ls supabase/migrations/*.sql | sort)
if [[ "${1:-}" == "--before-fix" ]]; then
  migrations=$(echo "$migrations" | grep -v '0003_lockdown_rls')
fi
echo "Applying: $(echo $migrations)"

cat supabase/tests/supabase-shim.sql $migrations supabase/tests/rls_lockdown.test.sql \
  | docker exec -i "$name" psql -U postgres -q -v ON_ERROR_STOP=1 -X -f - 2>&1 \
  | grep -E 'PASS|FAIL|ERROR|ALL CHECKS'
