-- Check if AI enhancement tables exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dim_date_range') 
        THEN 'DimDateRange table: EXISTS'
        ELSE 'DimDateRange table: MISSING'
    END AS dim_date_range_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ontology_term') 
        THEN 'OntologyTerm table: EXISTS'
        ELSE 'OntologyTerm table: MISSING'
    END AS ontology_term_status;

-- Count records in each table if they exist
SELECT 'dim_date_range records:' as table_info, COUNT(*) as count FROM dim_date_range
UNION ALL
SELECT 'ontology_term records:', COUNT(*) FROM ontology_term;