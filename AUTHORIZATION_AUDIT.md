# Authorization audit for FinControl-Pro

This audit covers the current JSON-backed API and is intended to be reviewable evidence before any Postgres migration.

## Route check matrix

| Route | Valid session | Org match | Role check | Action permission | Last updated | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /api/health` | N | N | N | N | Pass 1 | Public health endpoint |
| `POST /api/auth/bootstrap` | N | N | N | N | Pass 1 | One-time setup for first admin |
| `GET /api/auth/status` | N | N | N | N | Pass 1 | Setup required check |
| `POST /api/auth/login` | N | N | N | N | Pass 1 | Authenticated via valid credentials |
| `POST /api/auth/logout` | Y | Y | N | N | Pass 1 | Session token is cleared |
| `POST /api/auth/logout-everywhere` | Y | Y | N | N | Pass 1 | Invalidates all sessions for current user |
| `POST /api/auth/reset-password` | N | N | N | N | Pass 1 | Recovery-code based password reset |
| `GET /api/auth/me` | Y | Y | N | N | Pass 1 | Returns current authenticated user |
| `POST /api/reports/share` | Y | Y | N | N | Pass 1 | Requires org match with session org |
| `GET /api/shared/:token` | N | N | N | N | Pass 1 | Public share lookup |
| `POST /api/shared/:token/access` | N | N | N | N | Pass 1 | Public share access check |
| `GET /api/resources/:collection/:id` | Y | Y | N | N | Pass 1 | Uses session org as scope |
| `POST /api/resources/:collection` | Y | Y | N | N | Pass 1 | Uses session org as scope and validates payload |
| `PATCH /api/resources/:collection/:id` | Y | Y | N | N | Pass 1 | Uses session org and If-Match version guard |
| `GET /api/store` | Y | Y | N | N | Pass 1 | Returns full server store for current org |
| `POST /api/store` | Y | N | N | N | Pass 1 | Explicitly disabled; stale whole-store sync rejected |
| `GET /api/export` | Y | Y | N | N | Pass 1 | Export for current org |
| `POST /api/import` | Y | Y | Y | Y | Pass 1 | Requires admin role, server-side validation |

## Guard pattern now used

The code now centralizes organization/session validation with guards such as:

- `requireAuth`
- `requireOrgAccess`
- `requireOrgAndRole([...])`
- `requireAdmin`

This is safer than re-checking org membership in each route, but every route still needs a review before being considered fully production-complete.

## Review note

This audit is intentionally conservative: it records the code as written today, not what is imagined by convention. Any future route addition must update this table and must be covered by a negative test in CI.
