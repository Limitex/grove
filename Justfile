# Grove — Task Runner
# Usage: just <task>

# List available tasks
default:
    @just --list

# Run in development mode (Tauri dev with HMR)
dev:
    WEBKIT_DISABLE_DMABUF_RENDERER=1 cargo tauri dev

# Build for development (type check + compile)
build:
    pnpm run build
    cd src-tauri && cargo build --release

# Build distributable packages (.deb, .AppImage, .dmg, .msi)
package:
    cargo tauri build

# Auto-format and fix all code
fmt:
    pnpm run fmt
    cd src-tauri && cargo fmt --all
    cd src-tauri && cargo clippy --fix --all-targets --all-features --allow-dirty --allow-staged -- -D warnings

# Quick compile check without building
check:
    pnpm exec tsc --noEmit
    cd src-tauri && cargo check

# Lint all code (format, types, clippy, unused exports)
lint:
    pnpm exec tsc --noEmit
    pnpm run lint
    pnpm run knip
    cd src-tauri && cargo fmt --all -- --check
    cd src-tauri && cargo clippy --all-targets --all-features -- -D warnings

# Generate TypeScript type bindings from Rust domain types (via ts-rs)
generate:
    cd src-tauri && cargo test export_bindings_
    @echo "Generated src/generated/*.ts"

# Run tests
test:
    cd src-tauri && cargo test

# Install dependencies
install:
    pnpm install

# Update all dependencies
update:
    pnpm update
    cd src-tauri && cargo update

# Generate Rust documentation
doc:
    cd src-tauri && cargo doc --no-deps --all-features --open

# Remove all build artifacts
clean:
    rm -rf dist src/generated
    cd src-tauri && cargo clean

# Remove everything and reinstall
reinstall: clean
    rm -rf node_modules
    pnpm install

# CI pipeline (generate -> lint -> test -> build)
ci: generate lint test build

# Bump version across all config files
# Usage: just release 0.2.0
release version: ci
    #!/usr/bin/env bash
    set -euo pipefail
    VERSION="{{version}}"

    echo "Bumping version to ${VERSION}..."

    sed -i "s/\"version\": \".*\"/\"version\": \"${VERSION}\"/" package.json
    sed -i "0,/^version = \".*\"/s//version = \"${VERSION}\"/" src-tauri/Cargo.toml
    sed -i "s/\"version\": \".*\"/\"version\": \"${VERSION}\"/" src-tauri/tauri.conf.json

    cd src-tauri && cargo check --quiet 2>/dev/null || true && cd ..

    echo "Version bumped to ${VERSION}"
    echo ""
    echo "Next steps:"
    echo "  1. git add -A && git commit -m \"release: v${VERSION}\""
    echo "  2. git tag v${VERSION}"
    echo "  3. git push origin main --tags"
