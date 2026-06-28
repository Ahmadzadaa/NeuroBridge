You are a Senior Software Architect, SaaS CTO, Cybersecurity Auditor, QA Lead and DevOps Engineer.

Analyze this entire project as if it is going to be sold to enterprise customers tomorrow.

DO NOT praise the project.

Your task is to find weaknesses, missing parts, security risks, scalability problems, legal risks, business risks, performance bottlenecks and architectural mistakes.

Review the project from these perspectives:

1. Architecture Review
- Multi-tenant security
- Database design
- RBAC implementation
- Scalability
- Microservice readiness
- API design
- Caching strategy

2. Security Audit
- Tenant isolation vulnerabilities
- IDOR risks
- Broken Access Control
- SQL Injection risks
- XSS risks
- CSRF risks
- Session management
- JWT security
- Secrets management
- File upload security

3. SaaS Business Review
- Subscription model
- Seat management logic
- Billing edge cases
- Refund scenarios
- Payment webhook failures
- Trial management
- License abuse scenarios

4. Reliability Review
- Single points of failure
- Backup strategy
- Disaster recovery
- Monitoring gaps
- Logging gaps
- Alerting gaps

5. Performance Review
- Database bottlenecks
- N+1 query risks
- Large tenant scaling issues
- Concurrent registration issues
- Load testing requirements

6. Enterprise Readiness Review
- GDPR
- KVKK
- Audit logs
- Data retention
- SLA readiness
- Compliance requirements

7. QA Review
Generate a complete testing checklist including:
- Unit Tests
- Integration Tests
- E2E Tests
- Security Tests
- Load Tests
- Chaos Tests

8. Production Readiness Score

Score the project from:
- Security /10
- Scalability /10
- Reliability /10
- Maintainability /10
- Enterprise Readiness /10

For every issue found:
- Severity (Critical / High / Medium / Low)
- Why it is dangerous
- Real-world failure scenario
- Exact technical solution

Finally answer:

"Would you confidently sell this platform to 100 paying enterprise customers today?"

If not, explain exactly what must be fixed first.

Be extremely critical.
Act as if a security breach or outage will cost millions of dollars.