# Security Policy

Siti AI is a privacy product. We take security and privacy reports seriously and
appreciate responsible disclosure.

## Privacy & threat model

Siti is designed so that **chat content is processed entirely on-device**:

- The language model runs locally via the [Onde](https://ondeinference.com)
  engine. Prompts and generated text are **not** sent to Splitfire AB or any
  third party for inference.
- Model files are downloaded from public model hosts (e.g. Hugging Face) on
  first use and cached locally. That download is the primary outbound network
  activity related to the model.
- There is no account and no server-side chat storage.

What this policy is most interested in:

- Any path by which chat content, prompts, or user data leave the device
  unexpectedly.
- Sandbox escapes, insecure IPC between the UI and the Rust core, or unsafe
  handling of downloaded model files.
- Supply-chain or build-integrity issues (dependency, signing, or release).

## Reporting a vulnerability

**Please do not open a public GitHub issue for security reports.**

Preferred: use **GitHub → Security → "Report a vulnerability"** (private
advisory) on this repository.

Alternatively, email **privacy@getsiti.5mb.app**. If you'd like to encrypt,
request our PGP key in your first message.

Please include:

- A description of the issue and its impact.
- Steps to reproduce (proof-of-concept if possible).
- Affected version / platform (macOS, iOS, Android) and build.

## What to expect

- **Acknowledgement:** within 3 business days.
- **Assessment & triage:** we'll confirm the issue and share our planned fix and
  timeline.
- **Disclosure:** coordinated. We'll credit you in the advisory unless you prefer
  to remain anonymous.

## Scope

In scope: this repository (the Siti app) and its build/release pipeline.

The inference engine lives in its own repo — report engine issues at
<https://github.com/ondeinference/onde>. Model weights themselves are
third-party; report those to their respective publishers.

Thank you for helping keep Siti users safe.
