# Bun Runtime Migration Plan

**Goal**: Migrate from Node.js + pnpm + Vite to Bun runtime for faster builds and development.
**Status**: Planning phase - DO NOT IMPLEMENT YET
**Created**: 2026-02-06

---

## Executive Summary

Current Vercel builds take 4+ minutes. Bun promises:
- **10-30x faster** package installs
- **2-4x faster** bundling than Vite
- **3x faster** test execution
- Drop-in Node.js replacement (90%+ compatible)

**Estimated time savings**: 4 minutes → 30-60 seconds (best case)

---

## Current Stack Analysis

### Package Manager: pnpm v10.28.0
- Install time: ~2-3s (cached), unknown (cold)
- Lockfile: `pnpm-lock.yaml`
- Workspace support: Not currently used

### Runtime: Node.js
- Used for: Build scripts, Vercel deployment
- Version: Unknown (check with `node --version`)

### Bundler: Vite
- Config: `vite.config.ts`
- Plugins:
  - `@vitejs/plugin-react`
  - `@tailwindcss/vite`
  - Path aliases (`@/*`)
- Build command: `tsc -b && vite build`

### Key Dependencies to Validate
- ✅ `@supabase/supabase-js` - Should work (pure JS)
- ✅ `@tanstack/react-query` - Should work
- ✅ `react` / `react-dom` - Fully supported
- ✅ `tailwindcss` - Fully supported
- ⚠️ `husky` - May need adjustments for git hooks
- ❓ Custom Node.js APIs - Need to audit codebase

---

## Migration Strategy: Phased Approach

### Phase 1: Package Manager Only (LOW RISK)
**Goal**: Replace pnpm with Bun's package manager, keep everything else.

**Changes Required**:
1. Replace `pnpm install` → `bun install`
2. Delete `pnpm-lock.yaml`
3. Add `bun.lockb` to git
4. Update CI/CD commands
5. Update Vercel build settings

**Expected Savings**: 5-15 seconds (minimal, but validates Bun setup)

**Rollback**: Easy - just switch back to pnpm

---

### Phase 2: Development Runtime (MEDIUM RISK)
**Goal**: Use Bun for local dev server, keep Node.js for production.

**Changes Required**:
1. Update dev script: `bun --bun vite`
2. Test HMR and dev experience
3. Validate Supabase client works
4. Test all features locally

**Expected Savings**: Faster dev server startup (1-2s → instant)

**Rollback**: Easy - just use `npm run dev` instead

---

### Phase 3: Replace Vite with Bun's Bundler (HIGH RISK)
**Goal**: Use Bun's built-in bundler for production builds.

**Changes Required**:
1. Create `bun-build.ts` script:
   ```typescript
   await Bun.build({
     entrypoints: ['./src/main.tsx'],
     outdir: './dist',
     target: 'browser',
     minify: true,
     sourcemap: 'external',
     splitting: true
   });
   ```
2. Replace `vite.config.ts` functionality:
   - Path aliases (`@/*`)
   - React plugin equivalent
   - Tailwind processing
   - Public assets handling
3. Update `index.html` processing
4. Test all build outputs

**Expected Savings**: 8-20 seconds (Bun bundler is faster than Vite)

**Rollback**: Medium difficulty - revert build scripts

---

### Phase 4: Full Production Runtime (HIGHEST RISK)
**Goal**: Deploy with Bun runtime on Vercel.

**Changes Required**:
1. Update Vercel configuration:
   ```json
   {
     "buildCommand": "bun run build:prod",
     "framework": null,
     "installCommand": "bun install"
   }
   ```
2. Verify Vercel supports Bun (may need custom Docker)
3. Test production deployment
4. Monitor for runtime issues

**Expected Savings**: Total build 4min → 30-60s

**Rollback**: Difficult - requires redeployment

---

## Compatibility Assessment

### Known Compatible
- ✅ React 18
- ✅ TypeScript
- ✅ Tailwind CSS
- ✅ ESM modules
- ✅ Most npm packages
- ✅ Supabase client
- ✅ React Query
- ✅ Lucide icons
- ✅ Recharts

### Requires Testing
- ⚠️ Husky git hooks (may need `bunx husky`)
- ⚠️ PostCSS plugins
- ⚠️ Vite plugins (won't work if switching to Bun bundler)
- ⚠️ Source maps generation
- ⚠️ Environment variable handling

### Known Issues
- ❌ Some Node.js native modules (rare in browser apps)
- ❌ `node:` protocol imports (easily fixable)
- ❌ Vite-specific plugins (Phase 3 only)

---

## Pre-Migration Checklist

### 1. Audit Codebase
- [ ] Search for `require()` calls (should use `import`)
- [ ] Search for `node:` imports (e.g., `node:path`)
- [ ] Search for Node.js-specific APIs (fs, crypto, etc.)
- [ ] List all Vite plugins in use
- [ ] Document custom build scripts

### 2. Measure Current Performance
Create baseline metrics:
- [ ] Local `bun install` time (cold cache)
- [ ] Local `bun install` time (warm cache)
- [ ] Local build time: `time pnpm run build:prod`
- [ ] Vercel deploy time (from logs)
- [ ] Dev server startup time
- [ ] HMR update time

### 3. Environment Setup
- [ ] Install Bun: `curl -fsSL https://bun.sh/install | bash`
- [ ] Verify version: `bun --version` (aim for v1.0.20+)
- [ ] Test basic commands: `bun --help`

### 4. Create Test Branch
- [ ] Branch: `experiment/bun-migration`
- [ ] Keep main branch on Node.js + pnpm
- [ ] Document all changes in this branch

---

## Step-by-Step Migration Guide

### Phase 1: Package Manager (Start Here)

```bash
# 1. Install Bun globally
curl -fsSL https://bun.sh/install | bash

# 2. Remove old lockfile
rm pnpm-lock.yaml

# 3. Install with Bun
bun install

# 4. Test build
bun run build:prod

# 5. Test dev server
bun run dev

# 6. If successful, commit
git add bun.lockb package.json
git commit -m "Migrate to Bun package manager"
```

**Verification**:
- [ ] All dependencies installed
- [ ] Build completes successfully
- [ ] Dev server runs without errors
- [ ] All features work locally

---

### Phase 2: Development Runtime

```bash
# 1. Update package.json scripts
{
  "dev": "bun --bun vite",
  "build:prod": "bun run tsc -b && bun --bun vite build"
}

# 2. Test dev server
bun run dev

# 3. Test all features in browser
- Map functionality
- Scanner
- Dashboard
- Data quality
- Session management
```

**Verification**:
- [ ] Dev server starts faster
- [ ] HMR works correctly
- [ ] No console errors
- [ ] Supabase connection works
- [ ] All UI interactive elements work

---

### Phase 3: Bun Bundler (Advanced)

⚠️ **WARNING**: This is a significant change. Only proceed if Phase 1 & 2 are stable.

**File**: `scripts/bun-build.ts`
```typescript
import { resolve } from 'path';

const result = await Bun.build({
  entrypoints: ['./src/main.tsx'],
  outdir: './dist',
  target: 'browser',
  minify: true,
  sourcemap: 'external',
  splitting: true,
  naming: {
    entry: '[dir]/[name].[hash].[ext]',
    chunk: '[name]-[hash].[ext]',
    asset: '[name].[hash].[ext]'
  },
  external: [], // List any externals
  define: {
    'process.env.NODE_ENV': '"production"',
    // Add other env vars
  }
});

if (!result.success) {
  console.error('Build failed:', result.logs);
  process.exit(1);
}

console.log('Build complete!');
```

**Copy index.html and assets**:
```typescript
// After Bun.build, copy public assets and process index.html
import { copyFileSync, readdirSync } from 'fs';
// ... implement asset copying
```

**Update package.json**:
```json
{
  "build:prod": "bun run scripts/bun-build.ts"
}
```

**Verification**:
- [ ] Build outputs to `dist/`
- [ ] HTML references correct hashed files
- [ ] Assets are copied
- [ ] App loads in browser
- [ ] Source maps work
- [ ] All features work in production build

---

### Phase 4: Vercel Deployment

**Update `vercel.json`**:
```json
{
  "buildCommand": "bun install && bun run build:prod",
  "installCommand": "bun install",
  "framework": null
}
```

**Or use custom Docker** (if Vercel doesn't support Bun natively):
```dockerfile
FROM oven/bun:1 as builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install
COPY . .
RUN bun run build:prod

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

**Verification**:
- [ ] Deployment succeeds
- [ ] Build time reduced significantly
- [ ] Production app works correctly
- [ ] No runtime errors
- [ ] Performance is acceptable

---

## Risk Assessment

### Phase 1: LOW RISK ✅
- **Failure mode**: Can't install deps
- **Impact**: Can revert to pnpm immediately
- **Mitigation**: Test on branch first

### Phase 2: MEDIUM RISK ⚠️
- **Failure mode**: Dev server doesn't work, HMR broken
- **Impact**: Local development affected, production unchanged
- **Mitigation**: Keep Node.js available for fallback

### Phase 3: HIGH RISK ⚠️⚠️
- **Failure mode**: Build outputs incorrect, app broken in production
- **Impact**: Can't deploy, need to revert
- **Mitigation**: Extensive testing, keep Vite config as backup

### Phase 4: HIGHEST RISK ⚠️⚠️⚠️
- **Failure mode**: Production deployment broken, runtime errors
- **Impact**: Site down until rollback
- **Mitigation**: Deploy to preview first, have rollback plan ready

---

## Rollback Strategy

### Phase 1 Rollback
```bash
git revert <commit>
rm bun.lockb
pnpm install
```

### Phase 2-4 Rollback
```bash
# Revert to known good commit
git reset --hard <last-working-commit>
git push --force origin main  # Only if safe

# Or create revert PR
git revert <bad-commit>
```

---

## Performance Benchmarks to Measure

### Before Migration (Baseline)
- [ ] Cold install time: `time pnpm install --force`
- [ ] Warm install time: `time pnpm install`
- [ ] Build time: `time pnpm run build:prod`
- [ ] Dev server start: `time until server ready`
- [ ] Vercel deploy time: (from logs)

### After Each Phase
- [ ] Repeat all measurements
- [ ] Document improvements
- [ ] Note any regressions

### Success Criteria
- **Install time**: 50%+ faster
- **Build time**: 30%+ faster
- **Vercel deploy**: Under 1 minute total
- **No regressions**: All features work correctly

---

## Known Gotchas

### 1. Environment Variables
Bun uses `Bun.env` instead of `process.env` (though `process.env` still works):
```typescript
// Both work, but Bun.env is faster
const apiUrl = Bun.env.VITE_SUPABASE_URL;
const apiUrl = process.env.VITE_SUPABASE_URL;
```

### 2. Import Paths
Bun resolves imports slightly differently. May need `tsconfig.json` adjustments:
```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler", // Important for Bun
    "types": ["bun-types"]
  }
}
```

### 3. Husky Hooks
Git hooks may need to use `bunx` instead of `npx`:
```bash
# .husky/pre-commit
bunx lint-staged
```

### 4. Source Maps
Bun generates source maps differently. May need to adjust error tracking:
```typescript
await Bun.build({
  sourcemap: 'external', // or 'inline' or 'none'
});
```

### 5. CSS/Tailwind Processing
If using PostCSS plugins, verify they work with Bun's bundler:
```typescript
// May need to process CSS separately
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
// ... manual processing
```

---

## Testing Checklist

### Functional Testing
After each phase, verify:
- [ ] App loads without errors
- [ ] Map displays correctly
- [ ] Scanner captures input
- [ ] Supabase queries work
- [ ] Dashboard shows data
- [ ] Authentication works
- [ ] Navigation works
- [ ] All interactive elements respond

### Performance Testing
- [ ] Lighthouse score (should be similar or better)
- [ ] Time to Interactive (TTI)
- [ ] First Contentful Paint (FCP)
- [ ] Bundle size (should be similar)

### Edge Cases
- [ ] Error boundaries catch errors
- [ ] Offline behavior
- [ ] Network errors handled
- [ ] Long-running queries

---

## Alternative: Skip Vite, Use Bun Bundler Only

If Phase 3 is too risky, consider:
1. Keep Vite for development (fast HMR)
2. Use Bun bundler only for production builds
3. Best of both worlds approach

```json
{
  "dev": "vite",
  "build:prod": "bun run scripts/bun-build.ts"
}
```

---

## Resources

### Official Docs
- Bun Installation: https://bun.sh/docs/installation
- Bun Bundler: https://bun.sh/docs/bundler
- Bun Runtime API: https://bun.sh/docs/api
- Bun vs Node.js: https://bun.sh/docs/runtime/nodejs-apis

### Community Resources
- Bun Discord: https://bun.sh/discord
- Bun GitHub Issues: https://github.com/oven-sh/bun/issues
- Bun Examples: https://github.com/oven-sh/bun/tree/main/examples

### Vercel + Bun
- Check Vercel docs for Bun support status
- May need custom build image
- Community examples: Search "vercel bun deployment"

---

## Decision Log

### 2026-02-06: Planning Phase
- **Decision**: Create migration plan, do not implement yet
- **Reason**: Need to understand full scope and risks
- **Next Steps**: Review plan, get stakeholder buy-in, schedule migration window

### Future Decisions
- [ ] Phase 1 go/no-go date: ___________
- [ ] Phase 2 go/no-go date: ___________
- [ ] Phase 3 evaluation: Skip or proceed?
- [ ] Phase 4 evaluation: Skip or proceed?

---

## Questions to Answer Before Starting

1. **What is actually slow in the 4-minute build?**
   - Install phase?
   - TypeScript compilation?
   - Vite bundling?
   - Asset processing?
   - Need to see full Vercel logs to diagnose

2. **Can we optimize current stack first?**
   - Remove `tsc -b` from production build?
   - Enable persistent caching on Vercel?
   - Reduce bundle size?
   - May get 2-3x improvement without Bun

3. **What's the ROI?**
   - How many deploys per day?
   - Cost of migration time vs. time saved?
   - Risk of breaking production?

4. **Vercel support for Bun?**
   - Does Vercel officially support Bun runtime?
   - Need custom Docker container?
   - Any additional costs?

---

## Recommended Next Steps

1. **Get full Vercel build logs** to identify actual bottleneck
2. **Try quick wins first**:
   - Remove `tsc -b` from prod build (may save 1-2 minutes)
   - Enable Vercel build cache properly
   - Optimize dependencies
3. **Test Phase 1 on local machine** to validate Bun works
4. **Schedule migration** only if quick wins aren't enough
5. **Start with Phase 1 only**, evaluate before proceeding

---

## Status Updates

**2026-02-06**: Document created, awaiting review and build log analysis.

