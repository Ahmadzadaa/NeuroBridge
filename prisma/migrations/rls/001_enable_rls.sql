-- Row Level Security policies for BizSim multi-tenant isolation
-- Applied after Prisma migration. Run as database superuser or migration role.

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_ai_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recovery_codes ENABLE ROW LEVEL SECURITY;

-- Helper: super admin bypass
CREATE OR REPLACE FUNCTION app_is_super_admin() RETURNS boolean AS $$
  SELECT coalesce(current_setting('app.is_super_admin', true), 'false') = 'true';
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_current_tenant_id() RETURNS text AS $$
  SELECT nullif(current_setting('app.current_tenant_id', true), '');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS text AS $$
  SELECT nullif(current_setting('app.current_user_id', true), '');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_current_role() RETURNS text AS $$
  SELECT nullif(current_setting('app.current_role', true), '');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_is_tenant_staff() RETURNS boolean AS $$
  SELECT app_current_role() IN ('TENANT_ADMIN', 'TENANT_VIEWER');
$$ LANGUAGE sql STABLE;

-- Tenants
DROP POLICY IF EXISTS tenants_policy ON tenants;
CREATE POLICY tenants_policy ON tenants FOR ALL
  USING (
    app_is_super_admin()
    OR id = app_current_tenant_id()
  )
  WITH CHECK (
    app_is_super_admin()
    OR id = app_current_tenant_id()
  );

-- Users
DROP POLICY IF EXISTS users_policy ON users;
CREATE POLICY users_policy ON users FOR ALL
  USING (
    app_is_super_admin()
    OR id = app_current_user_id()
    OR (tenant_id = app_current_tenant_id() AND app_is_tenant_staff())
  )
  WITH CHECK (
    app_is_super_admin()
    OR (tenant_id = app_current_tenant_id() AND app_current_role() = 'TENANT_ADMIN')
    OR id = app_current_user_id()
  );

-- Programs
DROP POLICY IF EXISTS programs_policy ON programs;
CREATE POLICY programs_policy ON programs FOR ALL
  USING (
    app_is_super_admin()
    OR tenant_id = app_current_tenant_id()
  )
  WITH CHECK (
    app_is_super_admin()
    OR (tenant_id = app_current_tenant_id() AND app_current_role() = 'TENANT_ADMIN')
  );

-- Participants
DROP POLICY IF EXISTS participants_policy ON participants;
CREATE POLICY participants_policy ON participants FOR ALL
  USING (
    app_is_super_admin()
    OR user_id = app_current_user_id()
    OR (
      app_is_tenant_staff()
      AND program_id IN (
        SELECT id FROM programs WHERE tenant_id = app_current_tenant_id()
      )
    )
  )
  WITH CHECK (
    app_is_super_admin()
    OR (
      app_current_role() = 'TENANT_ADMIN'
      AND program_id IN (
        SELECT id FROM programs WHERE tenant_id = app_current_tenant_id()
      )
    )
  );

-- Program child tables (inherit via program tenant)
DROP POLICY IF EXISTS program_simulations_policy ON program_simulations;
CREATE POLICY program_simulations_policy ON program_simulations FOR ALL
  USING (
    app_is_super_admin()
    OR program_id IN (SELECT id FROM programs WHERE tenant_id = app_current_tenant_id())
  )
  WITH CHECK (
    app_is_super_admin()
    OR (
      app_current_role() = 'TENANT_ADMIN'
      AND program_id IN (SELECT id FROM programs WHERE tenant_id = app_current_tenant_id())
    )
  );

DROP POLICY IF EXISTS program_trainings_policy ON program_trainings;
CREATE POLICY program_trainings_policy ON program_trainings FOR ALL
  USING (
    app_is_super_admin()
    OR program_id IN (SELECT id FROM programs WHERE tenant_id = app_current_tenant_id())
  )
  WITH CHECK (
    app_is_super_admin()
    OR (
      app_current_role() = 'TENANT_ADMIN'
      AND program_id IN (SELECT id FROM programs WHERE tenant_id = app_current_tenant_id())
    )
  );

DROP POLICY IF EXISTS program_ai_tools_policy ON program_ai_tools;
CREATE POLICY program_ai_tools_policy ON program_ai_tools FOR ALL
  USING (
    app_is_super_admin()
    OR program_id IN (SELECT id FROM programs WHERE tenant_id = app_current_tenant_id())
  )
  WITH CHECK (
    app_is_super_admin()
    OR (
      app_current_role() = 'TENANT_ADMIN'
      AND program_id IN (SELECT id FROM programs WHERE tenant_id = app_current_tenant_id())
    )
  );

-- Payments
DROP POLICY IF EXISTS payments_policy ON payments;
CREATE POLICY payments_policy ON payments FOR ALL
  USING (
    app_is_super_admin()
    OR tenant_id = app_current_tenant_id()
  )
  WITH CHECK (
    app_is_super_admin()
    OR tenant_id = app_current_tenant_id()
  );

-- Audit logs
DROP POLICY IF EXISTS audit_logs_policy ON audit_logs;
CREATE POLICY audit_logs_policy ON audit_logs FOR ALL
  USING (
    app_is_super_admin()
    OR tenant_id = app_current_tenant_id()
  )
  WITH CHECK (
    app_is_super_admin()
    OR tenant_id = app_current_tenant_id()
  );

-- Tenant settings
DROP POLICY IF EXISTS tenant_settings_policy ON tenant_settings;
CREATE POLICY tenant_settings_policy ON tenant_settings FOR ALL
  USING (
    app_is_super_admin()
    OR tenant_id = app_current_tenant_id()
  )
  WITH CHECK (
    app_is_super_admin()
    OR (tenant_id = app_current_tenant_id() AND app_current_role() = 'TENANT_ADMIN')
  );

-- User-owned resources
DROP POLICY IF EXISTS certificates_policy ON certificates;
CREATE POLICY certificates_policy ON certificates FOR ALL
  USING (
    app_is_super_admin()
    OR user_id = app_current_user_id()
    OR (
      app_is_tenant_staff()
      AND user_id IN (SELECT id FROM users WHERE tenant_id = app_current_tenant_id())
    )
  )
  WITH CHECK (
    app_is_super_admin()
    OR user_id = app_current_user_id()
  );

DROP POLICY IF EXISTS coin_transactions_policy ON coin_transactions;
CREATE POLICY coin_transactions_policy ON coin_transactions FOR ALL
  USING (
    app_is_super_admin()
    OR user_id = app_current_user_id()
    OR (
      app_is_tenant_staff()
      AND user_id IN (SELECT id FROM users WHERE tenant_id = app_current_tenant_id())
    )
  )
  WITH CHECK (
    app_is_super_admin()
    OR user_id = app_current_user_id()
  );

DROP POLICY IF EXISTS user_badges_policy ON user_badges;
CREATE POLICY user_badges_policy ON user_badges FOR ALL
  USING (
    app_is_super_admin()
    OR user_id = app_current_user_id()
    OR (
      app_is_tenant_staff()
      AND user_id IN (SELECT id FROM users WHERE tenant_id = app_current_tenant_id())
    )
  )
  WITH CHECK (
    app_is_super_admin()
    OR user_id = app_current_user_id()
  );

DROP POLICY IF EXISTS user_recovery_codes_policy ON user_recovery_codes;
CREATE POLICY user_recovery_codes_policy ON user_recovery_codes FOR ALL
  USING (
    app_is_super_admin()
    OR user_id = app_current_user_id()
  )
  WITH CHECK (
    app_is_super_admin()
    OR user_id = app_current_user_id()
  );

-- Global reference tables (badges, simulations) — read-only for app role, no RLS needed
-- Prisma migrations user must GRANT bypass or manage via superuser for seed operations
