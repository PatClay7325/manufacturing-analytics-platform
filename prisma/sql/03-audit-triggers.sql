-- =============================================================================
-- AUDIT TRIGGER IMPLEMENTATION
-- =============================================================================
-- Purpose: Automatic audit logging for all critical tables
-- Compliance: ISO 9001 traceability requirements
-- =============================================================================

-- 1. Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(username, action, table_name, record_id, log_ts, after_data)
    VALUES(
      current_user,
      TG_OP,
      TG_TABLE_NAME,
      NEW::text,
      now(),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log(username, action, table_name, record_id, log_ts, before_data, after_data)
    VALUES(
      current_user,
      TG_OP,
      TG_TABLE_NAME,
      NEW::text,
      now(),
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log(username, action, table_name, record_id, log_ts, before_data)
    VALUES(
      current_user,
      TG_OP,
      TG_TABLE_NAME,
      OLD::text,
      now(),
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Apply audit triggers to critical fact tables
-- Production data auditing
CREATE TRIGGER trg_audit_fact_production
  AFTER INSERT OR UPDATE OR DELETE
  ON fact_production
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Downtime tracking
CREATE TRIGGER trg_audit_fact_downtime
  AFTER INSERT OR UPDATE OR DELETE
  ON fact_downtime
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Quality/Scrap tracking
CREATE TRIGGER trg_audit_fact_scrap
  AFTER INSERT OR UPDATE OR DELETE
  ON fact_scrap
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Maintenance tracking
CREATE TRIGGER trg_audit_fact_maintenance
  AFTER INSERT OR UPDATE OR DELETE
  ON fact_maintenance
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- 3. Apply audit triggers to critical dimension tables
-- Equipment changes (critical for tracking asset modifications)
CREATE TRIGGER trg_audit_dim_equipment
  AFTER INSERT OR UPDATE OR DELETE
  ON dim_equipment
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Product changes (for quality tracking)
CREATE TRIGGER trg_audit_dim_product
  AFTER INSERT OR UPDATE OR DELETE
  ON dim_product
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- 4. Specialized trigger for high-volume sensor events (lighter weight)
CREATE OR REPLACE FUNCTION audit_sensor_event_summary() RETURNS trigger AS $$
DECLARE
  event_count INTEGER;
BEGIN
  -- Only log summary for bulk inserts
  GET DIAGNOSTICS event_count = ROW_COUNT;
  
  IF event_count > 100 THEN
    INSERT INTO audit_log(username, action, table_name, record_id, log_ts, after_data)
    VALUES(
      current_user,
      'BULK_INSERT',
      'fact_sensor_event',
      'Bulk insert of ' || event_count || ' events',
      now(),
      jsonb_build_object(
        'count', event_count,
        'equipment_id', NEW.equipment_id,
        'timestamp_range', jsonb_build_array(
          (SELECT MIN(event_ts) FROM fact_sensor_event WHERE equipment_id = NEW.equipment_id),
          (SELECT MAX(event_ts) FROM fact_sensor_event WHERE equipment_id = NEW.equipment_id)
        )
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply lighter audit to sensor events
CREATE TRIGGER trg_audit_fact_sensor_event
  AFTER INSERT
  ON fact_sensor_event
  FOR EACH STATEMENT EXECUTE FUNCTION audit_sensor_event_summary();

-- 5. Audit log maintenance function
CREATE OR REPLACE FUNCTION maintain_audit_log(retention_days INTEGER DEFAULT 90) RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Archive old audit logs before deletion (optional)
  -- INSERT INTO audit_log_archive SELECT * FROM audit_log WHERE log_ts < CURRENT_TIMESTAMP - (retention_days || ' days')::INTERVAL;
  
  -- Delete old audit logs
  DELETE FROM audit_log 
  WHERE log_ts < CURRENT_TIMESTAMP - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the maintenance activity
  INSERT INTO system_metrics(metric_type, metric_name, metric_value, metric_unit, service_name)
  VALUES ('maintenance', 'audit_logs_purged', deleted_count, 'rows', 'audit_log_maintenance');
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 6. Grant necessary permissions
GRANT EXECUTE ON FUNCTION audit_trigger_function() TO PUBLIC;
GRANT EXECUTE ON FUNCTION audit_sensor_event_summary() TO PUBLIC;
GRANT EXECUTE ON FUNCTION maintain_audit_log(INTEGER) TO PUBLIC;