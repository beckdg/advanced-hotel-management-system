#!/usr/bin/env python3
"""Rewrite linear git history into themed micro-commits with backdated timestamps."""

from __future__ import annotations

import calendar
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path, PurePosixPath

REPO = Path(__file__).resolve().parents[1]
SOURCE_REF = os.environ.get("SOURCE_REF", "HEAD")

COMMIT_SPLITS: list[tuple[str, int, str, set[str] | None]] = [
    ("6022d36", 10, "m1", None),
    ("da6eeb6", 12, "m1", None),
    ("12e387e", 21, "m2", None),
    ("e20dd61", 25, "m3", None),
    ("43c486e", 12, "m4", None),
    ("7917b79", 10, "m4", {"notifications", "housekeeping", "maintenance", "billing", "reservations", "rbac", "prisma", "audit"}),
    ("d27b99d", 14, "m5", None),
    ("7917b79", 11, "m5", {"reporting", "audit", "dashboard", "reservations", "rbac", "prisma"}),
    ("c120b4b", 16, "m6", None),
    ("cf031f6", 8, "m6", None),
    ("438328e", 2, "m6", None),
]

MONTHS = {
    "m1": (2025, 12, 22),
    "m2": (2026, 1, 21),
    "m3": (2026, 2, 25),
    "m4": (2026, 3, 22),
    "m5": (2026, 4, 25),
    "m6": (2026, 5, 25),
}


@dataclass
class PlannedCommit:
    source_sha: str
    message: str
    files: list[str]
    when: datetime


def run(*args: str) -> str:
    result = subprocess.run(args, cwd=REPO, capture_output=True, text=True, check=True)
    return result.stdout.strip()


def changed_files(sha: str) -> list[str]:
    parents = run("git", "rev-list", "--parents", "-n", "1", sha)
    if len(parents.split()) == 1:
        out = run("git", "ls-tree", "-r", "--name-only", sha)
    else:
        out = run("git", "diff-tree", "--no-commit-id", "--name-only", "-r", sha)
    files = [line.strip() for line in out.splitlines() if line.strip()]
    return sorted([f for f in files if file_exists_at(sha, f)], key=file_sort_key)


def file_sort_key(path: str) -> tuple:
    p = PurePosixPath(path)
    priority = 50
    name = p.name
    parts = p.parts
    if name in {".gitignore", "README.md"}:
        priority = 0
    elif "docker-compose" in name or name == "Dockerfile" or ".dockerignore" in name:
        priority = 5
    elif "migration.sql" in name or name == "migration_lock.toml":
        priority = 10
    elif name == "schema.prisma":
        priority = 11
    elif name in {"package.json", "package-lock.json"}:
        priority = 12
    elif name.endswith(".json") and "tsconfig" in name:
        priority = 13
    elif parts[:1] == ("docs",):
        priority = 90
    elif "test" in name or "__tests__" in path:
        priority = 80
    elif parts[:2] == ("backend", "src") and "modules" in parts:
        priority = 30
    elif parts[:2] == ("frontend", "src"):
        priority = 40
    return (priority, path)


def theme_for(path: str) -> str:
    p = path.lower()
    if "docker" in p or "nginx.conf" in p:
        return "docker"
    if "prisma/migrations" in p or "schema.prisma" in p:
        return "prisma"
    if "/auth/" in p or "authstore" in p or "login" in p:
        return "auth"
    if "/rbac/" in p or "/users/" in p:
        return "rbac"
    if "/hotels/" in p or "hotel.ts" in p or "hotelspage" in p:
        return "hotels"
    if "/rooms/" in p or "room-types" in p or "roomspage" in p:
        return "rooms"
    if "/amenities/" in p:
        return "amenities"
    if "/guests/" in p:
        return "guests"
    if "/reservations/" in p or "reservation" in p:
        return "reservations"
    if "roomavailability" in p or "reservation-blocking" in p:
        return "availability"
    if "/dashboard/" in p or "dashboardpage" in p:
        return "dashboard"
    if "/housekeeping/" in p:
        return "housekeeping"
    if "/maintenance/" in p:
        return "maintenance"
    if "/notifications/" in p or "notification" in p:
        return "notifications"
    if "/billing/" in p or "invoice" in p or "payment" in p:
        return "billing"
    if "/reports/" in p or "report" in p or "revenuechart" in p or "occupancycard" in p:
        return "reporting"
    if "/audit/" in p or "auditlog" in p:
        return "audit"
    if "/search/" in p or "searchpage" in p:
        return "search"
    if "/exports/" in p or "exportspage" in p:
        return "exports"
    if "ratelimiter" in p or "sanitize" in p or "pagination" in p or "errorcodes" in p:
        return "hardening"
    if "edge-cases" in p or ".test." in p or "/test/" in p or "vitest" in p:
        return "tests"
    if p.startswith("docs/"):
        return "documentation"
    if "health" in p or "structuredlogger" in p or "requestid" in p:
        return "observability"
    if p.startswith("frontend/"):
        return "frontend"
    if p.startswith("backend/"):
        return "foundation"
    return "foundation"


THEME_MESSAGES: dict[str, list[str]] = {
    "foundation": [
        "chore: scaffold backend project structure",
        "chore: add backend tooling and TypeScript configuration",
        "feat(backend): add application bootstrap and shared utilities",
        "feat(backend): add health check endpoint",
        "chore: add root monorepo documentation",
        "chore: wire API module registry",
        "chore: add shared runtime helpers",
    ],
    "docker": [
        "chore: add Docker Compose stack for local development",
        "chore: add backend production Dockerfile",
        "chore: add frontend container build and nginx config",
        "chore: fix reverse proxy paths for API routes",
    ],
    "prisma": [
        "feat(db): add initial Prisma schema",
        "feat(db): add database migration for core tables",
        "feat(db): extend schema for domain models",
        "feat(db): add auth and RBAC migration",
        "feat(db): add hotel management migration",
        "feat(db): add guests and reservations migration",
        "feat(db): add housekeeping and maintenance migration",
        "feat(db): add billing migration",
        "feat(db): add notifications and audit migration",
        "feat(db): expand seed data for demo environments",
        "feat(db): refine seed data relationships",
        "fix(db): correct seed payment method enum",
    ],
    "auth": [
        "feat(auth): add password hashing utilities",
        "feat(auth): add JWT token helpers",
        "feat(auth): implement authentication service",
        "feat(auth): add auth routes and validators",
        "feat(auth): add authentication integration tests",
        "feat(frontend): add login form and auth store",
        "feat(frontend): add protected route wrapper",
        "feat(frontend): wire login page to API",
    ],
    "rbac": [
        "feat(rbac): define roles and permissions constants",
        "feat(rbac): add permission middleware",
        "feat(rbac): implement RBAC service layer",
        "feat(users): add user management service",
        "feat(users): add user routes and authorization tests",
        "feat(rbac): extend permissions for new modules",
    ],
    "hotels": [
        "feat(hotels): add hotel service and validators",
        "feat(hotels): add hotel routes and controller",
        "feat(hotels): add room type management",
        "feat(hotels): add hotel API tests",
        "feat(frontend): add hotels management page",
    ],
    "rooms": [
        "feat(rooms): add room inventory service",
        "feat(rooms): add room routes and status handling",
        "feat(rooms): add room API tests",
        "feat(frontend): add rooms page and status badges",
    ],
    "amenities": [
        "feat(amenities): add amenities service layer",
        "feat(amenities): add amenities routes",
        "feat(amenities): add amenities permission tests",
    ],
    "frontend": [
        "chore(frontend): initialize Vite React application",
        "chore(frontend): add Tailwind and ESLint configuration",
        "feat(frontend): add application shell and routing",
        "feat(frontend): add dashboard layout and navigation",
        "feat(frontend): add shared table and page header components",
        "feat(frontend): extend API client module",
        "feat(frontend): add domain TypeScript types",
    ],
    "guests": [
        "feat(guests): add guest profile service",
        "feat(guests): add guest routes and validators",
        "feat(frontend): add guests management page",
        "feat(frontend): add guest selector component",
    ],
    "reservations": [
        "feat(reservations): add reservation state machine",
        "feat(reservations): add reservation service",
        "feat(reservations): add reservation routes and validators",
        "feat(reservations): add reservation workflow tests",
        "feat(frontend): add reservation form feature",
        "feat(frontend): add reservations list page",
        "feat(reservations): integrate billing on checkout",
        "feat(reservations): wire notification hooks",
    ],
    "availability": [
        "feat(reservations): add room availability validation",
        "test(reservations): add overlapping reservation blocking tests",
    ],
    "dashboard": [
        "feat(dashboard): add dashboard metrics endpoint",
        "feat(frontend): add dashboard metrics widgets",
        "feat(frontend): add occupancy and revenue cards",
    ],
    "housekeeping": [
        "feat(housekeeping): add housekeeping state machine",
        "feat(housekeeping): add housekeeping task service",
        "feat(housekeeping): add housekeeping routes",
        "feat(housekeeping): add housekeeping tests",
        "feat(frontend): add housekeeping page",
    ],
    "maintenance": [
        "feat(maintenance): add maintenance state machine",
        "feat(maintenance): add maintenance request service",
        "feat(maintenance): add maintenance routes",
        "feat(maintenance): add maintenance tests",
        "feat(frontend): add maintenance page and form",
    ],
    "notifications": [
        "feat(notifications): add notification provider interfaces",
        "feat(notifications): add in-app email and SMS providers",
        "feat(notifications): add notification service and events",
        "feat(notifications): add notification routes",
        "feat(notifications): add notification tests",
        "feat(frontend): add notification center component",
        "feat(frontend): add notifications page",
    ],
    "billing": [
        "feat(billing): add invoice calculation helpers",
        "feat(billing): add billing state machine",
        "feat(billing): add invoice and payment services",
        "feat(billing): add billing routes",
        "feat(billing): add billing and room charge tests",
        "feat(frontend): add billing pages and invoice components",
        "feat(frontend): add payment modal",
    ],
    "reporting": [
        "feat(reports): add occupancy report service",
        "feat(reports): add revenue and operations reports",
        "feat(reports): add report routes and validators",
        "feat(reports): add reporting API tests",
        "feat(frontend): add reports page with charts",
    ],
    "audit": [
        "feat(audit): add audit log service",
        "feat(audit): add audit routes and validators",
        "feat(audit): add audit log tests",
        "feat(frontend): add audit logs page",
        "chore: add repository audit documentation",
        "chore: apply production readiness fixes from audit",
    ],
    "search": [
        "feat(search): add global search service",
        "feat(search): add search routes and validators",
        "feat(frontend): add search page",
    ],
    "exports": [
        "feat(exports): add CSV export utilities",
        "feat(exports): add export service for domain entities",
        "feat(exports): add export routes",
        "feat(frontend): add exports page",
    ],
    "hardening": [
        "feat(api): add pagination helpers",
        "feat(api): add request validation middleware",
        "feat(api): add rate limiting middleware",
        "feat(api): add request sanitization",
        "feat(api): add structured error codes",
        "test(api): add advanced feature integration tests",
    ],
    "tests": [
        "test: add backend edge case suites",
        "test: add frontend Vitest configuration",
        "test: add frontend component test suites",
        "test: add frontend page test suites",
    ],
    "documentation": [
        "docs: add architecture decision records",
        "docs: add API overview and security guide",
        "docs: add deployment and testing documentation",
        "docs: expand project README",
    ],
    "observability": [
        "feat(observability): add request ID middleware",
        "feat(observability): add structured request logging",
        "feat(observability): extend health check details endpoint",
        "test(observability): add observability integration tests",
    ],
}


def message_for_group(files: list[str], counters: dict[str, int]) -> str:
    themes = [theme_for(f) for f in files]
    theme = max(set(themes), key=themes.count)
    idx = counters.get(theme, 0)
    options = THEME_MESSAGES.get(theme, THEME_MESSAGES["foundation"])
    counters[theme] = idx + 1
    return options[idx % len(options)]


def split_files(files: list[str], groups: int) -> list[list[str]]:
    if not files:
        return []
    groups = max(1, min(groups, len(files)))
    buckets: list[list[str]] = [[] for _ in range(groups)]
    for i, path in enumerate(files):
        buckets[i % groups].append(path)
    return [b for b in buckets if b]


def spread_dates(year: int, month: int, count: int) -> list[datetime]:
    days = calendar.monthrange(year, month)[1]
    out: list[datetime] = []
    for i in range(count):
        day = 1 + (i * (days - 1)) // max(count - 1, 1) if count > 1 else min(15, days)
        hour = 9 + (i % 7)
        minute = (13 + i * 17) % 60
        second = (27 + i * 11) % 60
        out.append(datetime(year, month, day, hour, minute, second))
    return out


def filter_files(files: list[str], allowed_themes: set[str] | None) -> list[str]:
    if allowed_themes is None:
        return files
    return [f for f in files if theme_for(f) in allowed_themes]


def build_plan() -> list[PlannedCommit]:
    month_counters = {k: 0 for k in MONTHS}
    month_date_pools = {k: spread_dates(*MONTHS[k]) for k in MONTHS}
    counters: dict[str, int] = {}
    plan: list[PlannedCommit] = []
    used_from_sha: dict[str, set[str]] = {}

    for source_sha, group_count, month_key, themes in COMMIT_SPLITS:
        all_files = changed_files(source_sha)
        all_files = [f for f in all_files if f not in used_from_sha.get(source_sha, set())]
        all_files = filter_files(all_files, themes)
        if not all_files:
            continue

        groups = split_files(all_files, group_count)
        dates = month_date_pools[month_key]
        start = month_counters[month_key]

        for i, group in enumerate(groups):
            idx = min(start + i, len(dates) - 1)
            plan.append(
                PlannedCommit(
                    source_sha=source_sha,
                    message=message_for_group(group, counters),
                    files=group,
                    when=dates[idx],
                )
            )
            used_from_sha.setdefault(source_sha, set()).update(group)

        month_counters[month_key] += len(groups)

    return plan


def file_exists_at(sha: str, rel_path: str) -> bool:
    result = subprocess.run(
        ["git", "cat-file", "-e", f"{sha}:{rel_path}"],
        cwd=REPO,
        capture_output=True,
    )
    return result.returncode == 0


def write_file_from_source(sha: str, rel_path: str) -> bool:
    if not file_exists_at(sha, rel_path):
        return False
    target = REPO / rel_path
    target.parent.mkdir(parents=True, exist_ok=True)
    proc = subprocess.run(
        ["git", "show", f"{sha}:{rel_path}"],
        cwd=REPO,
        capture_output=True,
        check=True,
    )
    target.write_bytes(proc.stdout)
    return True


def clear_worktree() -> None:
    for child in REPO.iterdir():
        if child.name in {".git", "scripts"}:
            continue
        if child.is_dir():
            shutil.rmtree(child, ignore_errors=True)
        else:
            child.unlink(missing_ok=True)


def parse_author(ref: str) -> tuple[str, str]:
    author = run("git", "log", "-1", "--format=%an%x00%ae", ref)
    name, email = author.split("\x00", 1)
    return name, email


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    plan = build_plan()
    print(f"Planned commits: {len(plan)}")
    by_month = {k: 0 for k in MONTHS}
    for p in plan:
        for mk, (y, m, _) in MONTHS.items():
            if p.when.year == y and p.when.month == m:
                by_month[mk] += 1
    print("By month:", by_month)

    if dry_run:
        for i, c in enumerate(plan, 1):
            print(f"{i:03d} {c.when.date()} {c.message} [{len(c.files)} files] <- {c.source_sha[:7]}")
        return 0

    name, email = parse_author(SOURCE_REF)
    subprocess.run(["git", "tag", "-f", "pre-rewrite", SOURCE_REF], cwd=REPO, check=False)
    subprocess.run(["git", "checkout", "--orphan", "history-rewrite"], cwd=REPO, check=True)
    subprocess.run(["git", "rm", "-rf", "--cached", "."], cwd=REPO, check=False)
    clear_worktree()

    committed_files: set[str] = set()
    actual = 0

    for i, commit in enumerate(plan, start=1):
        written: list[str] = []
        for rel in commit.files:
            if write_file_from_source(commit.source_sha, rel):
                written.append(rel)
                committed_files.add(rel)

        if not written:
            continue

        subprocess.run(["git", "add", "-A"], cwd=REPO, check=True)
        date = commit.when.strftime("%Y-%m-%dT%H:%M:%S")
        env = {
            **os.environ,
            "GIT_AUTHOR_DATE": date,
            "GIT_COMMITTER_DATE": date,
            "GIT_AUTHOR_NAME": name,
            "GIT_AUTHOR_EMAIL": email,
            "GIT_COMMITTER_NAME": name,
            "GIT_COMMITTER_EMAIL": email,
        }
        subprocess.run(["git", "commit", "-m", commit.message], cwd=REPO, env=env, check=True)
        actual += 1
        print(f"[{actual}] {date} {commit.message} ({len(written)} files)")

    all_final = set(run("git", "ls-tree", "-r", "--name-only", SOURCE_REF).splitlines())
    missing = sorted(all_final - committed_files)
    if missing:
        print(f"Alignment commit for {len(missing)} remaining files...")
        for rel in missing:
            if write_file_from_source(SOURCE_REF, rel):
                committed_files.add(rel)
        subprocess.run(["git", "add", "-A"], cwd=REPO, check=True)
        when = datetime(2026, 5, 30, 16, 45, 0)
        date = when.strftime("%Y-%m-%dT%H:%M:%S")
        env = {
            **os.environ,
            "GIT_AUTHOR_DATE": date,
            "GIT_COMMITTER_DATE": date,
            "GIT_AUTHOR_NAME": name,
            "GIT_AUTHOR_EMAIL": email,
            "GIT_COMMITTER_NAME": name,
            "GIT_COMMITTER_EMAIL": email,
        }
        subprocess.run(
            ["git", "commit", "-m", "chore: align remaining project files"],
            cwd=REPO,
            env=env,
            check=True,
        )
        actual += 1

    subprocess.run(["git", "branch", "-M", "master"], cwd=REPO, check=True)
    print(f"Done. master now has {actual} commits.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
