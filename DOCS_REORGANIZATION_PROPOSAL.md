# Documentation Reorganization Proposal

## Current State Analysis

### Documentation Locations (24 MD files)

```
Root Level (6 files):
├── CLAUDE.md                    # Agent entry point
├── README.md                    # Human project overview
├── TODO.md                      # Project todos
├── GE_SCRAPER.md               # Product catalog scraper docs
├── SCANNING_SESSIONS.md        # Scanner workflow docs
└── agent-instructions/
    ├── index.md                # Agent routing (OVERLAPS with CLAUDE.md)
    ├── cli-tools.md            # CLI documentation
    └── plans/
        ├── floor-display.md
        └── saas-feasibility-planning.md

docs/ folder (8 files):
├── auth.md                     # GE auth implementation
├── DATA_DICTIONARY.md          # Database schema reference
├── ge-sync-fg-sta.md          # FG/STA sync notes
├── map.md                      # Warehouse map docs
├── product-lifecycle.md        # Product data flow
├── production-endpoints.md     # API endpoints
└── tanstack-query-migration.md # Technical migration notes

services/ge-sync/ (7 files):
├── README.md                   # Service overview
├── docs/
│   ├── EXPLORATION_GUIDE.md           # How to explore GE DMS
│   ├── EXPLORATION_SESSION_2026-01-31.md  # Session notes
│   ├── GE_DMS_PAGES.md               # 30 pages catalog
│   ├── GE_DMS_SYSTEM_OVERVIEW.md     # Business processes
│   ├── GE_ENDPOINT_FIELDS.md         # Field mappings
│   └── SECRETS.md                    # Secrets setup
└── src/scripts/README.md       # Scripts usage

research/ folder (2 files):
├── README.md                   # "Condensed research"
└── docs/GE-DMS-ENDPOINTS.md   # Legacy endpoints doc

Component docs (1 file):
└── src/components/Map/README.md
```

---

## Problems Identified

### 1. CLAUDE.md vs agent-instructions/index.md Overlap

**Current situation:**
- `CLAUDE.md` - 70 lines, Quick Reference table, project overview, CLI rules
- `agent-instructions/index.md` - 45 lines, "When to Read What" table, file routing

**Problem:** Two entry points with overlapping purposes. Agents read CLAUDE.md first, then get routed to index.md, which has a different routing table.

**Example overlap:**
- CLAUDE.md: "Use CLI tools → `agent-instructions/cli-tools.md`"
- index.md: "Read when using CLIs → `cli-tools.md`"

### 2. Root-Level Feature Docs (Orphaned)

- `GE_SCRAPER.md` - Product catalog scraper (feature-specific)
- `SCANNING_SESSIONS.md` - Scanner workflow (feature-specific)

**Problem:** Should be in `docs/` with other human documentation, not at root level.

### 3. Research Folder (Deprecated)

`research/ge-dms/` contains mostly deprecated content:
- `README.md` says "condensed, minimal reference docs"
- `GE-DMS-ENDPOINTS.md` is legacy (superseded by `services/ge-sync/docs/GE_DMS_PAGES.md`)

**Problem:** Confusing to have old research folder when current docs are in `services/ge-sync/docs/`

### 4. Session Notes in Permanent Docs

`EXPLORATION_SESSION_2026-01-31.md` is session-specific notes, not permanent reference documentation.

**Problem:** Should be in a separate location for historical notes, not mixed with canonical docs.

---

## Proposed Structure

### Reorganization Goals

1. **Single agent entry point** - Merge CLAUDE.md and agent-instructions/index.md
2. **Clear human vs agent separation** - docs/ for humans, .claude/ for agents
3. **Feature docs properly located** - Move root-level feature docs to docs/
4. **Remove deprecated research** - Archive or delete research/ folder
5. **Separate ephemeral from permanent** - Session notes in .claude/sessions/

### Proposed File Structure

```
Root Level (4 essential files only):
├── README.md                    # Human project overview (keep)
├── TODO.md                      # Project todos (keep)
├── CLAUDE.md                    # MERGED agent entry point (enhanced)
└── .claude/                     # All agent-specific docs
    ├── cli-tools.md            # Moved from agent-instructions/
    ├── plans/
    │   ├── floor-display.md
    │   └── saas-feasibility.md
    └── sessions/               # NEW: Ephemeral session notes
        └── 2026-01-31-exploration.md

docs/ (Human documentation):
├── README.md                   # NEW: Index of human docs
├── architecture/
│   ├── auth.md                # Moved from docs/
│   ├── product-lifecycle.md
│   └── production-endpoints.md
├── database/
│   └── DATA_DICTIONARY.md
├── features/
│   ├── ge-scraper.md          # Moved from root (renamed)
│   ├── map.md
│   ├── scanning-sessions.md   # Moved from root (renamed)
│   └── tanstack-query-migration.md
└── sync-service/
    └── ge-sync-fg-sta.md

services/ge-sync/ (Unchanged - already well organized):
├── README.md
├── docs/
│   ├── EXPLORATION_GUIDE.md
│   ├── GE_DMS_PAGES.md
│   ├── GE_DMS_SYSTEM_OVERVIEW.md
│   ├── GE_ENDPOINT_FIELDS.md
│   └── SECRETS.md
└── src/scripts/README.md

REMOVED:
└── research/                   # Delete or archive
└── agent-instructions/         # Merged into .claude/
```

---

## CLAUDE.md (Enhanced Merged Version)

**New structure:**

```markdown
# Warehouse - Agent Instructions

## Quick Reference

| Need to... | Go to... |
|------------|----------|
| Use CLI tools | `.claude/cli-tools.md` |
| Explore GE DMS | `services/ge-sync/docs/EXPLORATION_GUIDE.md` |
| Understand GE DMS | `services/ge-sync/docs/GE_DMS_PAGES.md` |
| Setup secrets | `services/ge-sync/docs/SECRETS.md` |
| Plan a feature | `.claude/plans/` |
| Add a TODO | `TODO.md` |
| Read human docs | `docs/README.md` (index) |

## Project Overview
[... existing content ...]

## Documentation Organization

### Agent Documentation (`.claude/`)
- **cli-tools.md** - Supabase, Netlify, Railway, psql CLIs
- **plans/** - Feature planning docs (floor-display, saas-feasibility)
- **sessions/** - Ephemeral exploration/session notes

### Human Documentation (`docs/`)
- **architecture/** - System architecture, auth, endpoints
- **database/** - Schema, data dictionary
- **features/** - Feature-specific docs (map, scanner, scraper)
- **sync-service/** - GE sync implementation notes

### Service Documentation (`services/ge-sync/docs/`)
- **EXPLORATION_GUIDE.md** - How to explore GE DMS
- **GE_DMS_PAGES.md** - Complete page catalog
- **GE_DMS_SYSTEM_OVERVIEW.md** - Business processes
- **SECRETS.md** - Secrets setup (local, deployed, exploration)

[... rest of existing content ...]
```

**Key changes:**
1. Merged routing from both CLAUDE.md and agent-instructions/index.md
2. Updated paths (.claude/ instead of agent-instructions/)
3. Added "Documentation Organization" section explaining the structure
4. Single source of truth for agent routing

---

## Migration Steps

### Phase 1: Create New Structure

```bash
# 1. Create new directories
mkdir -p .claude/plans
mkdir -p .claude/sessions
mkdir -p docs/architecture
mkdir -p docs/database
mkdir -p docs/features
mkdir -p docs/sync-service

# 2. Move agent docs
mv agent-instructions/cli-tools.md .claude/
mv agent-instructions/plans/* .claude/plans/

# 3. Move session notes
mv services/ge-sync/docs/EXPLORATION_SESSION_2026-01-31.md .claude/sessions/2026-01-31-exploration.md

# 4. Move root-level feature docs
mv GE_SCRAPER.md docs/features/ge-scraper.md
mv SCANNING_SESSIONS.md docs/features/scanning-sessions.md

# 5. Organize existing docs/ folder
mv docs/auth.md docs/architecture/
mv docs/product-lifecycle.md docs/architecture/
mv docs/production-endpoints.md docs/architecture/
mv docs/DATA_DICTIONARY.md docs/database/
mv docs/map.md docs/features/
mv docs/tanstack-query-migration.md docs/features/
mv docs/ge-sync-fg-sta.md docs/sync-service/

# 6. Create docs index
# (Create docs/README.md with index of all docs)
```

### Phase 2: Update CLAUDE.md

```bash
# Merge agent-instructions/index.md content into CLAUDE.md
# Update all paths in CLAUDE.md Quick Reference
# Add Documentation Organization section
```

### Phase 3: Clean Up

```bash
# Remove old directories
rm -rf agent-instructions/
rm -rf research/

# Update any internal links in docs
# (grep for old paths and update)
```

### Phase 4: Verify

```bash
# Check no broken links
grep -r "agent-instructions" . --include="*.md"
grep -r "research/ge-dms" . --include="*.md"

# Verify new structure
find .claude -name "*.md"
find docs -name "*.md"
```

---

## Benefits

### For Agents

1. **Single entry point** - CLAUDE.md is the only agent starting point
2. **Clear routing** - One table to rule them all
3. **Logical grouping** - Agent docs in .claude/, not mixed with human docs
4. **Session notes separated** - Permanent vs ephemeral docs clearly distinguished

### For Humans

1. **Organized by category** - architecture/, database/, features/ folders
2. **Easier discovery** - docs/README.md index
3. **Less root clutter** - Only 4 files at root level
4. **Clear ownership** - docs/ = human, .claude/ = agent

### For Maintenance

1. **No duplication** - Single routing table in CLAUDE.md
2. **Easier updates** - Change paths in one place
3. **Better git history** - Moves preserve history with `git mv`
4. **Clearer purpose** - Each folder has a clear role

---

## Alternative: Minimal Change

If full reorganization is too disruptive, minimal changes:

### Option A: Just Merge CLAUDE.md + index.md

1. Merge agent-instructions/index.md into CLAUDE.md
2. Delete agent-instructions/index.md
3. Keep everything else as-is

**Pros:** Minimal disruption, fixes main issue
**Cons:** Doesn't address other organizational problems

### Option B: Just Move Root Docs

1. Keep CLAUDE.md and agent-instructions/ separate
2. Move GE_SCRAPER.md and SCANNING_SESSIONS.md to docs/
3. Delete research/ folder

**Pros:** Cleans up root, removes deprecated content
**Cons:** Doesn't fix CLAUDE.md/index.md overlap

---

## Recommendation

**Full reorganization** (Proposed Structure above)

**Why:**
- Project is at a good inflection point (exploration complete, build working)
- Current confusion will compound as more docs are added
- One-time pain for long-term clarity
- Git history preserved with `git mv`
- Can be done incrementally (4 phases, commit each)

**When:**
- Now, before more docs are added
- Before next major feature work
- While structure is fresh in mind

---

## Questions for User

1. **Scope:** Full reorganization or minimal change (Option A/B)?
2. **research/ folder:** Delete completely or archive somewhere?
3. **.claude/ name:** OK with this name, or prefer `agent-docs/` or `_claude/`?
4. **Session notes:** Keep in .claude/sessions/ or somewhere else?
5. **docs/README.md:** Should I create a comprehensive index?
6. **Timing:** Do this now or after current work?

---

## Next Steps (If Approved)

1. Create migration script for Phase 1-3
2. Update CLAUDE.md with merged content
3. Create docs/README.md index
4. Run migration with git mv to preserve history
5. Update any broken internal links
6. Commit in logical phases (agent docs, human docs, cleanup)
7. Test that all links work
