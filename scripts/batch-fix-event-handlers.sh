#!/bin/bash

echo "🔧 Fixing event handler optional chaining..."

# Function to fix a file
fix_file() {
    local file="$1"
    echo "  Fixing: $file"
    
    # Use sed to replace e?.target with e.target and similar patterns
    sed -i 's/\be?\.\(target\|currentTarget\)/e.\1/g' "$file"
    sed -i 's/\bevent?\.\(target\|currentTarget\)/event.\1/g' "$file"
    sed -i 's/\bevt?\.\(target\|currentTarget\)/evt.\1/g' "$file"
    sed -i 's/\bev?\.\(target\|currentTarget\)/ev.\1/g' "$file"
}

# Change to project directory
cd /mnt/d/Source/manufacturing-analytics-platform

# Fix all the files
fix_file "src/app/alerts/[id]/page.tsx"
fix_file "src/app/dashboards/browse/page.tsx"
fix_file "src/app/diagnostics/DiagnosticsPageContent.tsx"
fix_file "src/components/dashboard/AlertRulesEditor.tsx"
fix_file "src/components/dashboard/options/TextOptions.tsx"
fix_file "src/components/diagnostics/DiagnosticChartsEnhanced.tsx"
fix_file "src/components/panels/TablePanel.tsx"
fix_file "src/components/chat/ChatHistory.tsx"
fix_file "src/components/dashboard/FieldConfigEditor.tsx"
fix_file "src/components/diagnostics/MetricsTestPanel.tsx"
fix_file "src/components/equipment/EquipmentList.tsx"
fix_file "src/components/explore/QueryEditor.tsx"
fix_file "src/components/explore/TimeRangeSelector.tsx"
fix_file "src/components/grafana/GrafanaPanel.tsx"
fix_file "src/components/dashboard/options/StatOptions.tsx"
fix_file "src/components/dashboard/options/TimeSeriesOptions.tsx"
fix_file "src/components/dashboard/VariableEditor.tsx"
fix_file "src/components/alerts/AlertList.tsx"
fix_file "src/app/dashboards/page.tsx"
fix_file "src/components/layout/GrafanaLayout.tsx"
fix_file "src/components/dashboards/DashboardSearch.tsx"
fix_file "src/components/dashboards/DashboardFilters.tsx"
fix_file "src/components/dashboard/TransformationsEditor.tsx"
fix_file "src/components/dashboard/SaveDashboardModal.tsx"
fix_file "src/components/dashboard/QueryEditor.tsx"
fix_file "src/components/dashboard/PanelLibrary.tsx"
fix_file "src/components/dashboard/options/TableOptions.tsx"
fix_file "src/components/dashboard/options/GaugeOptions.tsx"
fix_file "src/app/test-chat/page.tsx"
fix_file "src/app/dashboards/grafana/page.tsx"

echo "✅ Event handler fixes complete!"