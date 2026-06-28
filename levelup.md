# ENTERPRISE HARDENING & PRODUCTION READINESS PROMPT

You are a Principal Software Architect, Enterprise SaaS CTO, Senior Security Engineer, DevOps Lead, QA Lead, and PostgreSQL Expert.

You have already completed a production audit and identified critical issues.

Your mission is NOT to create new features.

Your mission is to transform this codebase into a production-ready enterprise SaaS platform.

Rules:

* Do not create mock implementations.
* Do not create placeholder code.
* Do not create TODO comments.
* Every implementation must be production-grade.
* Every fix must include code changes, tests, and documentation.
* Every security recommendation must be implemented, not merely described.

---

## PHASE 1 — CRITICAL SECURITY FIXES

Fix every Critical and High severity issue.

### RBAC

Implement strict RBAC across every API route.

Roles:

* SUPER_ADMIN
* TENANT_ADMIN
* TENANT_VIEWER
* PARTICIPANT

Requirements:

* Central authorization middleware
* Permission matrix
* Role tests
* Endpoint tests

Verify that:

* PARTICIPANT cannot access tenant administration data
* TENANT_VIEWER cannot modify data
* TENANT_ADMIN only sees own tenant
* SUPER_ADMIN can access all tenants

Generate:

* Middleware
* Authorization helpers
* Integration tests

---

### Multi-Tenant Isolation

Implement enterprise-grade tenant isolation.

Requirements:

* PostgreSQL migration
* Remove SQLite
* Prisma migrations
* PostgreSQL Row Level Security (RLS)
* Tenant policies
* Tenant context middleware

Generate:

* SQL policies
* Prisma updates
* Migration files
* Isolation tests

Required tests:

Tenant A must never access Tenant B data.

Test:

* API
* Database
* Reports
* Participants
* Certificates
* Coin system

---

### Input Validation

Add Zod validation to:

* Every API route
* Every form
* Every webhook

Reject:

* Invalid dates
* Invalid enums
* Invalid seat counts
* XSS payloads
* Malformed requests

Generate tests.

---

### Rate Limiting

Protect:

* Login
* Registration
* AI endpoints
* Webhooks

Implement:

* Upstash Rate Limit
  or
* Redis-based limiter

Generate tests.

---

### 2FA

Implement TOTP 2FA.

Required:

* SUPER_ADMIN
* TENANT_ADMIN

Generate:

* QR generation
* Recovery codes
* Backup flow
* Tests

---

## PHASE 2 — CORE BUSINESS MODEL

Implement complete seat licensing architecture.

Requirements:

### Registration

Registration must:

* Consume seat atomically
* Reject if seat limit reached
* Support concurrent registrations

Use:

* Database transactions
* Row locking

Generate tests for:

* 500 concurrent registrations

---

### Payment Integration

Implement:

* Stripe
* Payriff/Iyzico abstraction layer

Requirements:

* Webhooks
* Idempotency
* Retry handling
* Failed payment handling
* Refund handling

Tests required.

---

### Seat Upgrade System

Requirements:

50 seats
→ purchase 50 more
→ automatically become 100

All updates through webhook events.

Generate:

* DB logic
* Services
* Tests

---

## PHASE 3 — ENTERPRISE OPERATIONS

Implement:

### Monitoring

Sentry

CloudWatch

Health endpoints

Business metrics:

* Registration rate
* Payment failures
* AI usage
* Seat utilization

Generate dashboards.

---

### Audit Logging

Track:

* Login
* Logout
* Payment
* User creation
* Role changes
* Seat changes
* Report exports
* Settings updates

Store:

* user_id
* tenant_id
* ip
* action
* timestamp

Generate viewer UI.

---

### Backups

Implement:

* Daily backup strategy
* Restore procedures
* Runbook

Generate documentation.

---

## PHASE 4 — PERFORMANCE

Optimize for:

* 100 enterprise customers
* 50,000 participants
* 5,000 concurrent users

Implement:

* Redis caching
* Pagination
* Query optimization
* Background jobs
* Queue architecture

Generate:

* Performance benchmarks
* Load testing scripts (k6)

---

## PHASE 5 — TESTING

Create:

### Unit Tests

Minimum 80% coverage.

### Integration Tests

All critical flows.

### E2E Tests

Playwright.

Required scenarios:

* Tenant purchase
* Program creation
* Participant registration
* Seat exhaustion
* Payment success
* Payment failure
* Certificate generation
* Multi-language switching

---

## PHASE 6 — AWS PRODUCTION DEPLOYMENT

Generate:

* Docker
* GitHub Actions
* ECS/Fargate
* RDS PostgreSQL
* CloudFront
* S3
* Secrets Manager

Include:

* Staging
* Production

---

## FINAL REQUIREMENT

After implementation:

Generate a new audit report.

Target:

Security: 9+/10
Scalability: 9+/10
Reliability: 9+/10
Enterprise Readiness: 9+/10

Do not stop until all critical findings from the previous audit are fully resolved.

For every completed task:

1. Show changed files
2. Show code diff
3. Show tests added
4. Show verification result
5. Show remaining risks
