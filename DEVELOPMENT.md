# Development Environment Setup

This document outlines the prerequisites and setup instructions required to build, run, and develop NOAH on macOS, Linux, and Windows.

---

## 1. Universal Prerequisites (All Platforms)
These tools are required regardless of your operating system:

1. Rust Toolchain:
   - Install via rustup: https://rustup.rs/
   - Minimum supported Rust version: >= 1.77.2
   - Cargo components: run 'rustup component add clippy rustfmt'

2. Node.js & Package Manager:
   - Node.js: >= 20.x LTS (https://nodejs.org/)
   - Package manager: npm or pnpm

3. Tauri CLI:
   - Can be run via 'npx tauri' / 'pnpm tauri' or installed globally.

---

## 2. Platform-Specific Prerequisites

### macOS
- Xcode Command Line Tools:
  Run in terminal:
  xcode-select --install

### Linux (Ubuntu / Debian / Raspberry Pi OS)
Tauri requires system webview libraries and GTK build packages.
Run in terminal:
  sudo apt update
  sudo apt install -y \
    libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libxdo-dev \
    libssl-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev

### Windows 11
- Microsoft C++ Build Tools (via Visual Studio Installer):
  Workload: Desktop development with C++
- WebView2 Runtime (pre-installed on Windows 11, required on Windows 10).

---

## 3. Project Setup & First Run (All Platforms)
Once the prerequisites for your OS above are met:

1. Clone the repository:
   git clone https://github.com/realadissu/noah.git
   cd noah

2. Install frontend dependencies:
   npm install

3. Run in development mode:
   npm run tauri dev

---

## 4. Running Tests & Quality Checks
Always ensure all tests and linter checks pass before committing:

- Run Rust Backend Tests:
  cargo test --manifest-path src-tauri/Cargo.toml

- Run Rust Clippy (Linter):
  cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings

- Run Frontend Tests & Typecheck:
  npm test
  npm run check