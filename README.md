# Grove

A worktree-first Git GUI built with Tauri.

> **Work on multiple branches simultaneously — each in its own directory, visible at a glance.**

## Why Grove?

Every Git GUI treats worktrees as an afterthought. Branch switching is the default, and worktree support is buried in a submenu.

Grove flips this: **worktrees are the primary unit of work**. Each branch lives in its own directory, and Grove gives you a dashboard to see, manage, and act on all of them at once.

This is especially useful for:

- **AI-assisted development** — Run multiple Claude Code sessions in isolated worktrees
- **Parallel code review** — Check out multiple PRs simultaneously
- **Context switching without stashing** — Switch directories, not branches

## Features

### Worktree Management

- Dashboard with grid/list view of all worktrees
- Create, remove, and prune worktrees
- Per-worktree status: modified/staged/untracked/conflicted counts, ahead/behind
- Open worktrees in editor, terminal, or file manager

### Git Operations

- **GitHub Desktop-style diff view** — Split-pane with file list + syntax-highlighted diff
- **Stage/unstage/discard** per file
- **Commit** with summary + description
- **Fetch/pull/push** per worktree
- **Squash** consecutive commits from HEAD
- **Cherry-pick** commits from history
- **Interactive rebase** — Drag-and-drop commit reordering with pick/squash/drop
- **Amend** last commit message
- **Revert** commits
- **Reset** to specific commits
- **Range diff** — Shift-select commits to view combined diff

### Claude Code Integration

- **Persistent tmux sessions** — Sessions survive app restarts
- **Multiple sessions per worktree** — Named sessions (e.g., "refactor", "review")
- **Live status detection** — See which sessions are idle/running via CPU monitoring
- **Session management panel** — Dashboard view of all active sessions

### Clone & Setup

- **Bare clone workflow** — Clone repos into `~/Documents/Grove/<name>/` with worktree structure
- Configurable clone directory

### UI

- Custom title bar with window controls
- Resizable panels (dashboard / detail / sessions)
- Dark/light/system theme with green-tinted color palette
- Syntax highlighting powered by Shiki (VSCode grammars)
- Keyboard-first navigation (vim-style hjkl)
- Built with shadcn/ui + Tailwind CSS

## Tech Stack

| Layer     | Technology                                                    |
| --------- | ------------------------------------------------------------- |
| Framework | [Tauri v2](https://v2.tauri.app/)                             |
| Backend   | Rust + [git2-rs](https://github.com/rust-lang/git2-rs)        |
| Frontend  | React 19 + TypeScript                                         |
| UI        | [shadcn/ui](https://ui.shadcn.com/) (Radix) + Tailwind CSS v4 |
| Icons     | [Lucide](https://lucide.dev/)                                 |
| Syntax    | [Shiki](https://shiki.matsu.io/)                              |

## Development

### Prerequisites

- Rust (latest stable)
- Node.js (LTS) + [pnpm](https://pnpm.io/)
- [just](https://github.com/casey/just) (task runner, optional)
- System dependencies for [Tauri v2](https://v2.tauri.app/start/prerequisites/)

### Setup

```sh
git clone https://github.com/limitex/grove.git
cd grove
pnpm install
```

### Run

```sh
just dev
# or: WEBKIT_DISABLE_DMABUF_RENDERER=1 cargo tauri dev
```

### Build

```sh
just build       # Development build
just package     # Distributable packages (.deb, .AppImage, .dmg, .msi)
```

### Project Structure

```
grove/
├── src-tauri/src/           # Rust backend (layered architecture)
│   ├── domain/              # Pure domain models & types
│   ├── infra/               # Infrastructure (git2, git CLI, file I/O)
│   │   ├── repository/      # Write operations
│   │   ├── query/           # Read operations
│   │   ├── persistence/     # Config & repo store
│   │   └── claude/          # tmux session management
│   ├── service/             # Business logic
│   └── api/                 # Tauri command handlers
├── src/                     # React frontend (feature-based)
│   ├── api/                 # Typed invoke() wrappers
│   ├── features/            # Feature modules
│   ├── shared/              # Cross-feature components & hooks
│   ├── components/ui/       # shadcn/ui primitives
│   └── index.css            # Tailwind + theme
└── .github/workflows/       # CI/CD
```

## Keyboard Shortcuts

| Key             | Action             |
| --------------- | ------------------ |
| `hjkl` / arrows | Navigate worktrees |
| `Enter`         | Open in editor     |
| `n`             | New worktree       |
| `d`             | Remove worktree    |
| `t`             | Open in terminal   |
| `F`             | Fetch all remotes  |
| `r`             | Refresh            |
| `/`             | Focus search       |
| `?`             | Show shortcuts     |

## Configuration

Settings are stored in `~/.config/grove/config.toml`:

```toml
[general]
theme = "system"                    # system | light | dark
clone_dir = "/home/user/Documents/Grove"

[editor]
command = "code"
args = ["{path}"]

[terminal]
command = "ghostty"
args = ["-e", "fish", "-C", "cd {path}"]

[claude]
command = "claude"
args = []
```

## License

[GPL-3.0](LICENSE)
