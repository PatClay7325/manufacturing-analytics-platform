/**
 * Template Validation API Route
 * Validates template configuration and compatibility
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { 
  TemplateValidationResult,
  TemplateValidationError,
  TemplateValidationWarning,
  CompatibilityIssue
} from '@/types/template';
import { Dashboard, Panel } from '@/types/dashboard';

interface RouteParams {
  params: {
    id: string;
  };
}

// POST /api/templates/[id]/validate - Validate template
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();
    const { config, targetVersion } = body;

    // Get template if ID provided, or validate the provided config
    let templateConfig: Dashboard;
    let templateData: any = null;

    if (params.id !== 'new') {
      templateData = await prisma.dashboardTemplate.findUnique({
        where: { id: params.id }
      });

      if (!templateData) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }

      templateConfig = templateData.config as Dashboard;
    } else {
      templateConfig = config;
    }

    if (!templateConfig) {
      return NextResponse.json(
        { error: 'No configuration provided for validation' },
        { status: 400 }
      );
    }

    // Perform validation
    const validationResult = await validateTemplate(
      templateConfig,
      targetVersion || '1.0.0',
      templateData
    );

    return NextResponse.json(validationResult);
  } catch (error) {
    console.error('Template validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate template' },
      { status: 500 }
    );
  }
}

// Main validation function
async function validateTemplate(
  config: Dashboard,
  targetVersion: string,
  templateData?: any
): Promise<TemplateValidationResult> {
  const errors: TemplateValidationError[] = [];
  const warnings: TemplateValidationWarning[] = [];
  const compatibilityIssues: CompatibilityIssue[] = [];

  // Basic structure validation
  validateBasicStructure(config, errors);

  // Panel validation
  validatePanels(config.panels || [], errors, warnings);

  // Variable validation
  validateVariables(config.templating?.list || [], errors, warnings);

  // Data source validation
  await validateDataSources(config, warnings, compatibilityIssues);

  // Plugin compatibility validation
  validatePluginCompatibility(config, targetVersion, compatibilityIssues);

  // Manufacturing-specific validation
  if (templateData?.manufacturingType) {
    validateManufacturingRequirements(
      config,
      templateData.manufacturingType,
      warnings
    );
  }

  // Performance validation
  validatePerformance(config, warnings);

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    compatibilityIssues
  };
}

// Validate basic dashboard structure
function validateBasicStructure(config: Dashboard, errors: TemplateValidationError[]) {
  if (!config.title) {
    errors.push({
      code: 'MISSING_TITLE',
      message: 'Dashboard title is required',
      path: 'title',
      severity: 'error'
    });
  }

  if (!config.panels || !Array.isArray(config.panels)) {
    errors.push({
      code: 'MISSING_PANELS',
      message: 'Dashboard must have panels array',
      path: 'panels',
      severity: 'error'
    });
  }

  if (!config.schemaVersion) {
    errors.push({
      code: 'MISSING_SCHEMA_VERSION',
      message: 'Schema version is required',
      path: 'schemaVersion',
      severity: 'error'
    });
  }

  // Validate time range
  if (config.time) {
    if (!config.time.from || !config.time.to) {
      errors.push({
        code: 'INVALID_TIME_RANGE',
        message: 'Time range must have both from and to values',
        path: 'time',
        severity: 'error'
      });
    }
  }
}

// Validate panels
function validatePanels(
  panels: Panel[],
  errors: TemplateValidationError[],
  warnings: TemplateValidationWarning[]
) {
  if (panels.length === 0) {
    warnings.push({
      code: 'NO_PANELS',
      message: 'Dashboard has no panels',
      path: 'panels',
      suggestion: 'Add at least one panel to make the dashboard useful'
    });
    return;
  }

  const panelIds = new Set<number>();
  
  panels.forEach((panel, index) => {
    const panelPath = `panels[${index}]`;

    // Check required fields
    if (!panel.id) {
      errors.push({
        code: 'MISSING_PANEL_ID',
        message: 'Panel ID is required',
        path: `${panelPath}.id`,
        severity: 'error'
      });
    } else {
      // Check for duplicate IDs
      if (panelIds.has(panel.id)) {
        errors.push({
          code: 'DUPLICATE_PANEL_ID',
          message: `Duplicate panel ID: ${panel.id}`,
          path: `${panelPath}.id`,
          severity: 'error'
        });
      }
      panelIds.add(panel.id);
    }

    if (!panel.title) {
      warnings.push({
        code: 'MISSING_PANEL_TITLE',
        message: 'Panel should have a title',
        path: `${panelPath}.title`,
        suggestion: 'Add a descriptive title for better usability'
      });
    }

    if (!panel.type) {
      errors.push({
        code: 'MISSING_PANEL_TYPE',
        message: 'Panel type is required',
        path: `${panelPath}.type`,
        severity: 'error'
      });
    }

    // Validate grid position
    if (!panel.gridPos) {
      errors.push({
        code: 'MISSING_GRID_POS',
        message: 'Panel grid position is required',
        path: `${panelPath}.gridPos`,
        severity: 'error'
      });
    } else {
      const { x, y, w, h } = panel.gridPos;
      if (x < 0 || y < 0 || w <= 0 || h <= 0) {
        errors.push({
          code: 'INVALID_GRID_POS',
          message: 'Invalid grid position values',
          path: `${panelPath}.gridPos`,
          severity: 'error'
        });
      }

      if (x + w > 24) {
        warnings.push({
          code: 'GRID_OVERFLOW',
          message: 'Panel extends beyond grid width (24 units)',
          path: `${panelPath}.gridPos`,
          suggestion: 'Adjust panel width or position'
        });
      }
    }

    // Validate targets
    if (!panel.targets || panel.targets.length === 0) {
      if (panel.type !== 'text' && panel.type !== 'dashlist') {
        warnings.push({
          code: 'NO_TARGETS',
          message: 'Panel has no data targets',
          path: `${panelPath}.targets`,
          suggestion: 'Add data targets or use a static panel type'
        });
      }
    }

    // Validate field config
    if (!panel.fieldConfig) {
      warnings.push({
        code: 'MISSING_FIELD_CONFIG',
        message: 'Panel should have field configuration',
        path: `${panelPath}.fieldConfig`,
        suggestion: 'Add field configuration for better data presentation'
      });
    }
  });
}

// Validate template variables
function validateVariables(
  variables: any[],
  errors: TemplateValidationError[],
  warnings: TemplateValidationWarning[]
) {
  const variableNames = new Set<string>();

  variables.forEach((variable, index) => {
    const varPath = `templating.list[${index}]`;

    if (!variable.name) {
      errors.push({
        code: 'MISSING_VARIABLE_NAME',
        message: 'Variable name is required',
        path: `${varPath}.name`,
        severity: 'error'
      });
    } else {
      // Check for duplicate names
      if (variableNames.has(variable.name)) {
        errors.push({
          code: 'DUPLICATE_VARIABLE_NAME',
          message: `Duplicate variable name: ${variable.name}`,
          path: `${varPath}.name`,
          severity: 'error'
        });
      }
      variableNames.add(variable.name);

      // Validate variable name format
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable.name)) {
        errors.push({
          code: 'INVALID_VARIABLE_NAME',
          message: 'Variable name must start with letter/underscore and contain only alphanumeric characters and underscores',
          path: `${varPath}.name`,
          severity: 'error'
        });
      }
    }

    if (!variable.type) {
      errors.push({
        code: 'MISSING_VARIABLE_TYPE',
        message: 'Variable type is required',
        path: `${varPath}.type`,
        severity: 'error'
      });
    }

    // Type-specific validation
    if (variable.type === 'query' && !variable.query) {
      errors.push({
        code: 'MISSING_QUERY',
        message: 'Query variable must have a query',
        path: `${varPath}.query`,
        severity: 'error'
      });
    }

    if (variable.type === 'custom' && (!variable.options || variable.options.length === 0)) {
      warnings.push({
        code: 'EMPTY_CUSTOM_VARIABLE',
        message: 'Custom variable has no options',
        path: `${varPath}.options`,
        suggestion: 'Add options for the custom variable'
      });
    }
  });
}

// Validate data sources
async function validateDataSources(
  config: Dashboard,
  warnings: TemplateValidationWarning[],
  compatibilityIssues: CompatibilityIssue[]
) {
  const dataSources = new Set<string>();

  // Collect data sources from panels
  (config.panels || []).forEach((panel, panelIndex) => {
    (panel.targets || []).forEach((target, targetIndex) => {
      if (target.datasource) {
        const dsRef = typeof target.datasource === 'string' 
          ? target.datasource 
          : target.datasource.uid || target.datasource.name;
        
        if (dsRef) {
          dataSources.add(dsRef);
        }
      }
    });
  });

  // Check if data sources are commonly available
  const commonDataSources = ['prometheus', 'postgresql', 'mysql', 'influxdb'];
  
  dataSources.forEach(ds => {
    if (!commonDataSources.includes(ds.toLowerCase())) {
      compatibilityIssues.push({
        component: `Data Source: ${ds}`,
        issue: 'Data source may not be commonly available',
        impact: 'medium',
        workaround: 'Ensure this data source is installed and configured'
      });
    }
  });
}

// Validate plugin compatibility
function validatePluginCompatibility(
  config: Dashboard,
  targetVersion: string,
  compatibilityIssues: CompatibilityIssue[]
) {
  const panelTypes = new Set<string>();

  (config.panels || []).forEach(panel => {
    if (panel.type) {
      panelTypes.add(panel.type);
    }
  });

  // Check for deprecated panel types
  const deprecatedPanels = ['graph', 'singlestat', 'table-old'];
  
  panelTypes.forEach(type => {
    if (deprecatedPanels.includes(type)) {
      compatibilityIssues.push({
        component: `Panel Type: ${type}`,
        issue: 'Panel type is deprecated',
        impact: 'high',
        workaround: 'Consider migrating to newer panel types'
      });
    }
  });

  // Check for experimental panel types
  const experimentalPanels = ['canvas', 'geomap', 'nodeGraph'];
  
  panelTypes.forEach(type => {
    if (experimentalPanels.includes(type)) {
      compatibilityIssues.push({
        component: `Panel Type: ${type}`,
        issue: 'Panel type is experimental',
        impact: 'low',
        workaround: 'May have limited functionality or change in future versions'
      });
    }
  });
}

// Validate manufacturing-specific requirements
function validateManufacturingRequirements(
  config: Dashboard,
  manufacturingType: string,
  warnings: TemplateValidationWarning[]
) {
  const panels = config.panels || [];

  switch (manufacturingType) {
    case 'oee':
      validateOEERequirements(panels, warnings);
      break;
    case 'quality':
      validateQualityRequirements(panels, warnings);
      break;
    case 'maintenance':
      validateMaintenanceRequirements(panels, warnings);
      break;
    // Add more manufacturing type validations as needed
  }
}

function validateOEERequirements(panels: Panel[], warnings: TemplateValidationWarning[]) {
  const hasAvailabilityMetric = panels.some(p => 
    p.title?.toLowerCase().includes('availability') ||
    JSON.stringify(p.targets).includes('availability')
  );

  const hasPerformanceMetric = panels.some(p => 
    p.title?.toLowerCase().includes('performance') ||
    JSON.stringify(p.targets).includes('performance')
  );

  const hasQualityMetric = panels.some(p => 
    p.title?.toLowerCase().includes('quality') ||
    JSON.stringify(p.targets).includes('quality')
  );

  if (!hasAvailabilityMetric) {
    warnings.push({
      code: 'MISSING_OEE_AVAILABILITY',
      message: 'OEE dashboard should include availability metrics',
      suggestion: 'Add panels showing equipment availability'
    });
  }

  if (!hasPerformanceMetric) {
    warnings.push({
      code: 'MISSING_OEE_PERFORMANCE',
      message: 'OEE dashboard should include performance metrics',
      suggestion: 'Add panels showing equipment performance'
    });
  }

  if (!hasQualityMetric) {
    warnings.push({
      code: 'MISSING_OEE_QUALITY',
      message: 'OEE dashboard should include quality metrics',
      suggestion: 'Add panels showing quality metrics'
    });
  }
}

function validateQualityRequirements(panels: Panel[], warnings: TemplateValidationWarning[]) {
  const hasDefectTracking = panels.some(p => 
    p.title?.toLowerCase().includes('defect') ||
    JSON.stringify(p.targets).includes('defect')
  );

  if (!hasDefectTracking) {
    warnings.push({
      code: 'MISSING_DEFECT_TRACKING',
      message: 'Quality dashboard should include defect tracking',
      suggestion: 'Add panels showing defect rates and trends'
    });
  }
}

function validateMaintenanceRequirements(panels: Panel[], warnings: TemplateValidationWarning[]) {
  const hasMaintenanceSchedule = panels.some(p => 
    p.title?.toLowerCase().includes('maintenance') ||
    p.title?.toLowerCase().includes('schedule')
  );

  if (!hasMaintenanceSchedule) {
    warnings.push({
      code: 'MISSING_MAINTENANCE_SCHEDULE',
      message: 'Maintenance dashboard should include maintenance schedule',
      suggestion: 'Add panels showing upcoming maintenance activities'
    });
  }
}

// Validate performance considerations
function validatePerformance(config: Dashboard, warnings: TemplateValidationWarning[]) {
  const panels = config.panels || [];

  if (panels.length > 20) {
    warnings.push({
      code: 'TOO_MANY_PANELS',
      message: `Dashboard has ${panels.length} panels, which may impact performance`,
      suggestion: 'Consider splitting into multiple dashboards or using lazy loading'
    });
  }

  // Check for potential performance issues with queries
  let totalTargets = 0;
  panels.forEach(panel => {
    totalTargets += (panel.targets || []).length;
  });

  if (totalTargets > 50) {
    warnings.push({
      code: 'TOO_MANY_QUERIES',
      message: `Dashboard has ${totalTargets} data targets, which may impact performance`,
      suggestion: 'Consider combining queries or using more efficient data sources'
    });
  }
}