# Development Environment Setup

This document outlines the prerequisites and setup instructions required to build, run, and develop **NOAH** on macOS, Linux, and Windows.

---

## 1. Universal Prerequisites (All Platforms)

1. **Rust Toolchain**:
   - Install via `rustup`: [https://rustup.rs/](https://rustup.rs/)
   - Minimum supported Rust version: `>= 1.77.2`
   - Cargo components:
     ```bash
     rustup component add clippy rustfmt
     ```

2. **Node.js & Package Manager**:
   - Node.js: `>= 20.x LTS` ([https://nodejs.org/](https://nodejs.org/))
   - Recommended package manager: `pnpm` (or `npm`)
     ```bash
     npm install -g pnpm
     ```

3. **Tauri CLI**:
   - Can be used via `pnpm tauri` or installed globally via Cargo:
     ```bash
     cargo install tauri-cli --version "^2.0"
     ```

---

## 2. Platform-Specific Prerequisites

### macOS
- **Xcode Command Line Tools**:
  ```bash
  xcode-select --install