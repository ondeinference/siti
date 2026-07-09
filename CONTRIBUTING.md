# Contributing to Siti AI

Thanks for your interest — Siti is both a shipping product and the reference app
for the [Onde](https://ondeinference.com) inference engine, so clean, readable
contributions genuinely help other developers.

## Ground rules

- Be kind and constructive. This project follows a [Code of Conduct](CODE_OF_CONDUCT.md).
- For security issues, **do not open a public issue** — follow [SECURITY.md](SECURITY.md).
- Discuss non-trivial changes in an issue before opening a large PR.

## Contributor License Agreement (CLA)

Before we can merge your first contribution, you'll need to sign our
[Contributor License Agreement](CLA.md). It's lightweight and only needs to be
done once. When you open a pull request, the CLA bot will comment with a link if
a signature is needed.

Why a CLA: Siti's code is Apache-2.0, but the project sits alongside a
commercially licensed SDK. The CLA lets Splitfire AB keep both open-source and
commercial licensing options open while guaranteeing your contribution stays
available under the open license.

## Development setup

**Prerequisites:** [Rust](https://rustup.rs) (stable), [pnpm](https://pnpm.io),
and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) (Xcode on
macOS).

```bash
pnpm install
make dev        # start the Tauri dev server (or: pnpm tauri dev)
```

The Onde engine is pulled from crates.io — you do **not** need a separate SDK
checkout. To hack on Siti and Onde together, uncomment the `[patch.crates-io]`
block in `src-tauri/Cargo.toml` and point it at your local `onde` checkout.

## Before you open a PR

```bash
make fmt        # cargo fmt
make lint       # clippy + tsc — must pass with no warnings
make build      # must compile
```

- Keep changes focused; one logical change per PR.
- Match the surrounding style. The codebase is deliberately well-commented where
  the "why" is non-obvious — keep that up.
- Update docs when you change behavior.
- New Rust code should be `clippy`-clean; new UI code should typecheck.

## Commit messages

Write clear, imperative commit messages ("Add model download retry", not
"added stuff"). Reference issues where relevant (`Fixes #123`).

## Pull requests

- Fill out the PR template.
- Ensure CI is green.
- A maintainer will review; expect a round or two of feedback. We care about the
  details because this codebase is meant to be read.

## Reporting bugs & requesting features

Use the issue templates. Good bug reports include your platform/version, steps to
reproduce, and what you expected vs. what happened.

## License of contributions

By contributing, you agree that your contributions are licensed under
[Apache-2.0](LICENSE) and covered by the terms of the [CLA](CLA.md).
