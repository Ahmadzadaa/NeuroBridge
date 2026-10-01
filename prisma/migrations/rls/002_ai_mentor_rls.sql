-- Row Level Security for the AI Mentor tables. Apply after 001_enable_rls.sql
-- (it defines the app_* helper functions) and after the ai_mentor migration.
--
-- Conversations are private to the participant: not even the organisation's
-- staff can read them. Usage and security rows carry no content and are
-- visible to the organisation's staff for reporting. The platform-wide daily
-- cost check runs with the super-admin flag, which is the only cross-tenant read.

ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_messages_policy ON ai_messages FOR ALL
  USING (
    app_is_super_admin()
    OR (tenant_id = app_current_tenant_id() AND user_id = app_current_user_id())
  )
  WITH CHECK (
    tenant_id = app_current_tenant_id() AND user_id = app_current_user_id()
  );

CREATE POLICY ai_conversation_summaries_policy ON ai_conversation_summaries FOR ALL
  USING (
    app_is_super_admin()
    OR (tenant_id = app_current_tenant_id() AND user_id = app_current_user_id())
  )
  WITH CHECK (
    tenant_id = app_current_tenant_id() AND user_id = app_current_user_id()
  );

CREATE POLICY ai_usage_logs_policy ON ai_usage_logs FOR ALL
  USING (app_is_super_admin() OR tenant_id = app_current_tenant_id())
  WITH CHECK (app_is_super_admin() OR tenant_id = app_current_tenant_id());

CREATE POLICY ai_security_events_policy ON ai_security_events FOR ALL
  USING (app_is_super_admin() OR tenant_id = app_current_tenant_id())
  WITH CHECK (app_is_super_admin() OR tenant_id = app_current_tenant_id());
