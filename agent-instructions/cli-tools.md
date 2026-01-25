# CLI Tools Available to Agents

This project has CLI tools linked for Supabase, Netlify, and Railway. Use them instead of writing custom scripts or asking the user to copy/paste into web UIs.

## Permission Model

Before using any CLI for the first time in a session, ask the user:
> "Can I use the [tool] CLI to [action]?"

Once approved for a tool, you can use it freely for that session.

---

## Supabase CLI

The project is linked to the Supabase project. Use the CLI for database operations.

### Migrations (preferred workflow)

Instead of creating a `.sql` file and asking the user to paste it in the Supabase dashboard:

```bash
# Create a new migration file
supabase migration new <migration_name>
# This creates: supabase/migrations/<timestamp>_<migration_name>.sql

# Edit the migration file, then push it
supabase db push
```

### Other useful commands

```bash
# Generate migration from schema diff (if you made changes via dashboard)
supabase db diff -f <migration_name>

# List migrations and their status
supabase migration list

# Reset local database (destructive)
supabase db reset

# Dump current schema
supabase db dump -f schema.sql

# Inspect database (tables, indexes, etc.)
supabase inspect db
```

### Checking table structure

```bash
# List all tables
supabase inspect db table-sizes

# Get table info
supabase db query "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'your_table'"
```

---

## Netlify CLI

The project is linked to the Netlify site (warehouse-tools).

### Deployments

```bash
# Deploy to production (from main branch)
netlify deploy --prod

# Deploy a preview (for testing)
netlify deploy

# View deploy status
netlify status
```

### Environment Variables

```bash
# List env vars
netlify env:list

# Set an env var
netlify env:set KEY value

# Unset an env var
netlify env:unset KEY
```

### Build & Logs

```bash
# Build locally (same as Netlify would)
netlify build

# View function logs
netlify logs:function <function_name>
```

---

## Railway CLI

The project is linked to the Railway project (warehouse/ge-sync service).

### Service Management

```bash
# View current project/service status
railway status

# View logs
railway logs

# Run a command in the Railway environment
railway run <command>
```

### Environment Variables

```bash
# List all variables
railway variables

# Set a variable
railway variables set KEY=value

# Unset a variable
railway variables unset KEY
```

### Deployments

```bash
# Deploy current code
railway up

# Redeploy the service
railway redeploy
```

---

## When to Use CLIs vs Other Methods

| Task | Use CLI | Don't Use CLI |
|------|---------|---------------|
| Database migrations | `supabase migration new` + `supabase db push` | Creating .sql files for manual paste |
| Check table structure | `supabase inspect db` or `supabase db query` | Asking user to check dashboard |
| Deploy frontend | `netlify deploy --prod` | Asking user to trigger deploy |
| Check service logs | `railway logs` | Asking user to check Railway dashboard |
| Set env vars | `railway variables set` / `netlify env:set` | Asking user to set in dashboard |

---

## Troubleshooting

If a CLI command fails with auth errors:
1. The CLI may need re-authentication: `supabase login`, `netlify login`, `railway login`
2. The project may need re-linking (run `conductor-setup.sh`)

If unsure whether a CLI is available, ask the user.
