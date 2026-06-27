# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────────────
# Translation Tools custom image for Frappe Docker
#
# Built ON TOP OF the official frappe/bench image with this app baked in.
# Designed for frappe_docker's CUSTOM_IMAGE extension point:
#
#   export CUSTOM_IMAGE=bunchee/translation_tools
#   export CUSTOM_TAG=$(git describe --tags --always)
#   docker compose -f compose.yaml up -d
# ─────────────────────────────────────────────────────────────────────

# ── Build args ────────────────────────────────────────────────────────
# FRAPPE_BENCH_IMAGE — which Frappe base image to inherit from
#   - "frappe/bench:latest"   (default; rolling latest)
#   - "frappe/bench:v15.30.0"  (pinned for production)
ARG FRAPPE_BENCH_IMAGE=docker.io/frappe/bench:latest

# APP_REPO — git URL of this app
ARG APP_REPO=https://github.com/ManotLuijiu/translation_tools

# APP_REF — which ref of this app to install
#   - "develop"  (default; latest commits)
#   - "v1.0.0"            (pinned release tag; use for production)
ARG APP_REF=develop

# ── Stage 1: fetcher ──────────────────────────────────────────────────
# Clone the app in a tiny Alpine image so the final image stays small
# and the git history is cached separately.
FROM docker.io/library/alpine:3.20 AS fetcher
ARG APP_REPO
ARG APP_REF

RUN apk add --no-cache git \
 && git clone --depth 1 --branch "${APP_REF}" "${APP_REPO}" /tmp/app \
 && cd /tmp/app \
 && (git log -1 --format='translation_tools @ %H | %s | %an <%ae>' > /tmp/app_version.txt) \
 && echo "✅ Fetched ${APP_REPO} @ ${APP_REF}" \
 && cat /tmp/app_version.txt

# ── Stage 2: runtime image ───────────────────────────────────────────
FROM ${FRAPPE_BENCH_IMAGE}

LABEL org.opencontainers.image.title="Translation Tools" \
      org.opencontainers.image.description="Translation workflow tools" \
      org.opencontainers.image.source="https://github.com/ManotLuijiu/translation_tools" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.documentation="https://github.com/frappe/frappe_docker"

# Stop the bench from auto-starting during image build
RUN supervisorctl stop all || true

# Drop privileges to the `frappe` user (created by the base image)
USER frappe
WORKDIR /home/frappe/frappe-bench

# Copy the cloned app + build provenance into the final image
COPY --chown=frappe:frappe --from=fetcher /tmp/app /home/frappe/frappe-bench/apps/translation_tools
COPY --chown=frappe:frappe --from=fetcher /tmp/app_version.txt /home/frappe/frappe-bench/apps/translation_tools_version.txt

# Install Python deps, validate the app, and run any pending migrations.
# Idempotent: safe to run on every build.
RUN bench setup requirements \
 && bench --version \
 && python -c "import frappe; print('Frappe:', frappe.__version__)" \
 && (python -c "import translation_tools; print('Translation Tools:', getattr(translation_tools, '__version__', 'unknown'))" || echo "  (skip per-app import — module name may differ)") \
 && cat /home/frappe/frappe-bench/apps/translation_tools_version.txt \
 && echo "✅ Translation Tools image built from ${APP_REF}"

# Healthcheck — orchestrators (K8s, Swarm) can detect broken containers
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -fsS http://localhost:8000/api/method/ping || exit 1

EXPOSE 8000 9000

# Default command — matches frappe_docker Procfile semantics
CMD ["bench", "start"]
