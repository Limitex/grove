# Contributing to Grove

Thank you for your interest in contributing to Grove!

## Development Setup

1. Install prerequisites:
   - Rust (latest stable via [rustup](https://rustup.rs/))
   - Node.js (LTS via [mise](https://mise.jdx.dev/), nvm, or fnm)
   - [pnpm](https://pnpm.io/) (package manager)
   - [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your platform

2. Clone and install:
   ```sh
   git clone https://github.com/limitex/grove.git
   cd grove
   pnpm install
   ```

3. Run in development:
   ```sh
   just dev
   # or: WEBKIT_DISABLE_DMABUF_RENDERER=1 cargo tauri dev
   ```

## Project Structure

### Backend (`src-tauri/src/`) — Layered Architecture

- **`domain/`** — Pure domain models (types, errors).
- **`infra/`** — Infrastructure (git2, git CLI, file I/O, tmux).
- **`service/`** — Business logic orchestrating infra.
- **`api/`** — Tauri command handlers.

### Frontend (`src/`) — Feature-based Architecture

- **`api/`** — Typed `invoke()` wrappers for all backend calls.
- **`features/`** — Feature modules (worktree, diff, commit, claude, repo, settings).
- **`shared/`** — Cross-feature components and hooks.
- **`components/ui/`** — shadcn/ui primitives.

## Code Style

- **Rust**: `cargo clippy -- -D warnings` must pass. `cargo fmt` for formatting.
- **TypeScript**: Biome for lint + format, `tsc --noEmit` for type checking, knip for unused exports/deps. Run `just lint` to verify all.
- **Source code**: All in English.
- **Commits**: English, descriptive messages.

## Making Changes

1. Create a branch from `main`.
2. Make your changes.
3. Verify:
   ```sh
   just check   # Quick type check + cargo check
   just lint     # Full lint (tsc + Biome + knip + cargo fmt + clippy)
   ```
4. Submit a pull request.

## Adding a New Git Operation

1. Add the domain type in `src-tauri/src/domain/` if needed.
2. Add the infrastructure function in `src-tauri/src/infra/repository/` (writes) or `src-tauri/src/infra/query/` (reads).
3. Add the service function in `src-tauri/src/service/`.
4. Add the Tauri command in `src-tauri/src/api/` (wrap with `super::blocking()`) and register it in `src-tauri/src/lib.rs`.
5. Run `just generate` to auto-generate TypeScript types from Rust via ts-rs. Re-export in `src/types.ts` if needed.
6. Add the API wrapper in `src/api/` and call it from the frontend feature.

## Adding a New UI Component

- Use shadcn/ui components from `src/components/ui/`.
- Use Lucide icons consistently.
- Follow Tailwind CSS patterns established in existing components.
- Use `cn()` from `src/lib/utils.ts` for conditional classes.
- Place feature-specific components in the relevant `src/features/*/components/` directory.

## Reporting Issues

- Use GitHub Issues with the provided templates.
- Include your OS, GPU, and terminal emulator for display/launch issues.

## License

By contributing, you agree that your contributions will be licensed under the GNU General Public License v3.0.
