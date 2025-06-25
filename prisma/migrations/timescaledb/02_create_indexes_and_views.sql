-- Additional indexes for performance optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_time_desc ON manufacturing_metrics (timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_composite ON manufacturing_metrics (equipment_id, metric_name, timestamp DESC);

-- Create materialized view for equipment performance summary
CREATE MATERIALIZED VIEW equipment_performance_summary AS
SELECT 
    e.id as equipment_id,
    e.name as equipment_name,
    e.type as equipment_type,
    e.production_line_id,
    pl.name as production_line_name,
    NOW() - MAX(m.timestamp) as time_since_last_update,
    COUNT(DISTINCT DATE(m.timestamp)) as days_with_data,
    AVG(m.metric_value) FILTER (WHERE m.metric_name = 'oee') as avg_oee,
    MIN(m.metric_value) FILTER (WHERE m.metric_name = 'oee') as min_oee,
    MAX(m.metric_value) FILTER (WHERE m.metric_name = 'oee') as max_oee,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY m.metric_value) FILTER (WHERE m.metric_name = 'oee') as median_oee,
    SUM(m.metric_value) FILTER (WHERE m.metric_name = 'production_count') as total_production,
    SUM(m.metric_value) FILTER (WHERE m.metric_name = 'reject_count') as total_rejects,
    CASE 
        WHEN SUM(m.metric_value) FILTER (WHERE m.metric_name = 'production_count') > 0
        THEN SUM(m.metric_value) FILTER (WHERE m.metric_name = 'reject_count') / 
             SUM(m.metric_value) FILTER (WHERE m.metric_name = 'production_count') * 100
        ELSE 0
    END as reject_rate
FROM equipment e
LEFT JOIN production_lines pl ON e.production_line_id = pl.id
LEFT JOIN manufacturing_metrics m ON e.id = m.equipment_id
WHERE m.timestamp > NOW() - INTERVAL '30 days'
GROUP BY e.id, e.name, e.type, e.production_line_id, pl.name;

-- Create index on the materialized view
CREATE INDEX idx_equipment_perf_summary_line ON equipment_performance_summary (production_line_id);
CREATE INDEX idx_equipment_perf_summary_oee ON equipment_performance_summary (avg_oee DESC);

-- Create view for real-time production status
CREATE OR REPLACE VIEW production_status_realtime AS
WITH latest_status AS (
    SELECT DISTINCT ON (equipment_id)
        equipment_id,
        status,
        timestamp,
        reason
    FROM equipment_status
    WHERE timestamp > NOW() - INTERVAL '1 hour'
    ORDER BY equipment_id, timestamp DESC
),
latest_metrics AS (
    SELECT 
        equipment_id,
        MAX(timestamp) as last_update,
        AVG(metric_value) FILTER (WHERE metric_name = 'oee' AND timestamp > NOW() - INTERVAL '15 minutes') as current_oee,
        SUM(metric_value) FILTER (WHERE metric_name = 'production_count' AND timestamp > NOW() - INTERVAL '1 hour') as hourly_production
    FROM manufacturing_metrics
    WHERE timestamp > NOW() - INTERVAL '1 hour'
    GROUP BY equipment_id
)
SELECT 
    e.id as equipment_id,
    e.name as equipment_name,
    e.type as equipment_type,
    COALESCE(ls.status, 'unknown') as current_status,
    ls.reason as status_reason,
    ls.timestamp as status_updated_at,
    lm.current_oee,
    lm.hourly_production,
    lm.last_update as metrics_updated_at,
    CASE 
        WHEN lm.last_update < NOW() - INTERVAL '5 minutes' THEN 'stale'
        WHEN lm.last_update < NOW() - INTERVAL '1 minute' THEN 'delayed'
        ELSE 'live'
    END as data_freshness
FROM equipment e
LEFT JOIN latest_status ls ON e.id = ls.equipment_id
LEFT JOIN latest_metrics lm ON e.id = lm.equipment_id;

-- Create view for shift-based OEE analysis
CREATE OR REPLACE VIEW shift_oee_analysis AS
WITH shift_boundaries AS (
    SELECT 
        generate_series(
            DATE_TRUNC('day', NOW() - INTERVAL '30 days'),
            DATE_TRUNC('day', NOW()),
            INTERVAL '1 day'
        ) as day,
        unnest(ARRAY[
            'morning'::text,
            'afternoon'::text,
            'night'::text
        ]) as shift_name,
        unnest(ARRAY[
            TIME '06:00:00'::time,
            TIME '14:00:00'::time,
            TIME '22:00:00'::time
        ]) as shift_start,
        unnest(ARRAY[
            TIME '14:00:00'::time,
            TIME '22:00:00'::time,
            TIME '06:00:00'::time
        ]) as shift_end
)
SELECT 
    sb.day::date as shift_date,
    sb.shift_name,
    m.equipment_id,
    AVG(m.metric_value) FILTER (WHERE m.metric_name = 'oee') as avg_oee,
    AVG(m.metric_value) FILTER (WHERE m.metric_name = 'availability') as avg_availability,
    AVG(m.metric_value) FILTER (WHERE m.metric_name = 'performance') as avg_performance,
    AVG(m.metric_value) FILTER (WHERE m.metric_name = 'quality') as avg_quality,
    SUM(m.metric_value) FILTER (WHERE m.metric_name = 'production_count') as total_production,
    SUM(m.metric_value) FILTER (WHERE m.metric_name = 'good_count') as total_good,
    SUM(m.metric_value) FILTER (WHERE m.metric_name = 'reject_count') as total_reject,
    COUNT(DISTINCT m.timestamp) as data_points
FROM shift_boundaries sb
CROSS JOIN manufacturing_metrics m
WHERE 
    m.timestamp >= sb.day + sb.shift_start
    AND m.timestamp < CASE 
        WHEN sb.shift_end < sb.shift_start 
        THEN sb.day + INTERVAL '1 day' + sb.shift_end
        ELSE sb.day + sb.shift_end
    END
    AND m.metric_name IN ('oee', 'availability', 'performance', 'quality', 'production_count', 'good_count', 'reject_count')
GROUP BY sb.day, sb.shift_name, m.equipment_id;

-- Create view for quality analysis
CREATE OR REPLACE VIEW quality_analysis AS
WITH quality_data AS (
    SELECT 
        timestamp,
        equipment_id,
        metric_value as production_count
    FROM manufacturing_metrics
    WHERE metric_name = 'production_count'
        AND timestamp > NOW() - INTERVAL '7 days'
),
reject_data AS (
    SELECT 
        timestamp,
        equipment_id,
        metric_value as reject_count
    FROM manufacturing_metrics
    WHERE metric_name = 'reject_count'
        AND timestamp > NOW() - INTERVAL '7 days'
)
SELECT 
    DATE_TRUNC('hour', q.timestamp) as hour,
    q.equipment_id,
    e.name as equipment_name,
    SUM(q.production_count) as total_produced,
    SUM(r.reject_count) as total_rejected,
    CASE 
        WHEN SUM(q.production_count) > 0
        THEN (SUM(q.production_count) - SUM(r.reject_count)) / SUM(q.production_count) * 100
        ELSE 0
    END as quality_rate,
    COUNT(*) as sample_count
FROM quality_data q
JOIN reject_data r ON q.equipment_id = r.equipment_id 
    AND DATE_TRUNC('minute', q.timestamp) = DATE_TRUNC('minute', r.timestamp)
JOIN equipment e ON q.equipment_id = e.id
GROUP BY DATE_TRUNC('hour', q.timestamp), q.equipment_id, e.name
ORDER BY hour DESC, equipment_id;

-- Create function to calculate MTBF (Mean Time Between Failures)
CREATE OR REPLACE FUNCTION calculate_mtbf(
    p_equipment_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
) RETURNS TABLE (
    total_runtime_hours DOUBLE PRECISION,
    failure_count INTEGER,
    mtbf_hours DOUBLE PRECISION
) AS $$
DECLARE
    v_total_runtime INTERVAL;
    v_failure_count INTEGER;
BEGIN
    -- Calculate total runtime
    SELECT SUM(
        CASE 
            WHEN end_time IS NOT NULL THEN end_time - start_time
            ELSE p_end_date - start_time
        END
    ) INTO v_total_runtime
    FROM (
        SELECT 
            timestamp as start_time,
            LEAD(timestamp) OVER (ORDER BY timestamp) as end_time,
            status
        FROM equipment_status
        WHERE equipment_id = p_equipment_id
            AND timestamp BETWEEN p_start_date AND p_end_date
    ) t
    WHERE status = 'running';

    -- Count failures
    SELECT COUNT(*) INTO v_failure_count
    FROM downtime_events
    WHERE equipment_id = p_equipment_id
        AND start_time BETWEEN p_start_date AND p_end_date
        AND reason_category IN ('mechanical_failure', 'electrical_failure', 'software_error');

    RETURN QUERY
    SELECT 
        EXTRACT(EPOCH FROM v_total_runtime) / 3600 as total_runtime_hours,
        v_failure_count as failure_count,
        CASE 
            WHEN v_failure_count > 0 
            THEN EXTRACT(EPOCH FROM v_total_runtime) / 3600 / v_failure_count
            ELSE EXTRACT(EPOCH FROM v_total_runtime) / 3600
        END as mtbf_hours;
END;
$$ LANGUAGE plpgsql;

-- Create function to get production line efficiency
CREATE OR REPLACE FUNCTION get_production_line_efficiency(
    p_line_id UUID,
    p_time_range INTERVAL DEFAULT INTERVAL '24 hours'
) RETURNS TABLE (
    line_id UUID,
    line_name TEXT,
    avg_oee DOUBLE PRECISION,
    total_production INTEGER,
    active_equipment_count INTEGER,
    best_performing_equipment TEXT,
    worst_performing_equipment TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH line_metrics AS (
        SELECT 
            e.production_line_id,
            e.id as equipment_id,
            e.name as equipment_name,
            AVG(m.metric_value) FILTER (WHERE m.metric_name = 'oee') as equipment_oee,
            SUM(m.metric_value) FILTER (WHERE m.metric_name = 'production_count') as equipment_production
        FROM equipment e
        JOIN manufacturing_metrics m ON e.id = m.equipment_id
        WHERE e.production_line_id = p_line_id
            AND m.timestamp > NOW() - p_time_range
        GROUP BY e.production_line_id, e.id, e.name
    )
    SELECT 
        pl.id as line_id,
        pl.name as line_name,
        AVG(lm.equipment_oee) as avg_oee,
        SUM(lm.equipment_production)::INTEGER as total_production,
        COUNT(DISTINCT lm.equipment_id)::INTEGER as active_equipment_count,
        MAX(lm.equipment_name) FILTER (WHERE lm.equipment_oee = MAX(lm.equipment_oee) OVER()) as best_performing_equipment,
        MAX(lm.equipment_name) FILTER (WHERE lm.equipment_oee = MIN(lm.equipment_oee) OVER()) as worst_performing_equipment
    FROM production_lines pl
    JOIN line_metrics lm ON pl.id = lm.production_line_id
    WHERE pl.id = p_line_id
    GROUP BY pl.id, pl.name;
END;
$$ LANGUAGE plpgsql;

-- Refresh materialized views
REFRESH MATERIALIZED VIEW equipment_performance_summary;

-- Create scheduled job to refresh materialized views (requires pg_cron extension)
-- SELECT cron.schedule('refresh-equipment-performance', '*/15 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY equipment_performance_summary;');