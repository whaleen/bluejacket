# TODO

Project-wide task list. Add new items here.

## Features

- [ ] Sanity count as explicit prep checklist item
- [ ] Floor display UI polish
- [ ] Expand GE sync beyond ASIS
- [ ] Enhanced load conflict tracking
- [ ] Reporting/analytics

## Types

- [ ] Refactor type files to derive from database.ts where possible
  - Use `Tables<"table_name">` from database.ts as base for types that map to tables
  - Keep manual types for JSON structures (`DisplayState`, `InventoryConflictGroup`, etc.)
  - Keep domain enums (`InventoryType`, `LoadStatus`, `SessionStatus`)
  - Keep composite/join types (`LoadWithItems`, `TrackedPartWithDetails`, etc.)

## Bugs

<!-- Add bugs here -->

## Chores

<!-- Add maintenance tasks here -->
