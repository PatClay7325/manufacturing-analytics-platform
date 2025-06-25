# Development Navigation SOP

## Overview
This document establishes the Standard Operating Procedures (SOP) for the Development section in the sidebar navigation of the Manufacturing Analytics Platform.

## Purpose
The Development section provides a centralized location for all development-related pages, testing tools, and debugging utilities. This ensures that all development activities are organized and easily accessible throughout the project lifecycle.

## Navigation Structure

### Parent Section: Development
- **Location**: Sidebar Navigation (Bottom section after Help)
- **Icon**: Code icon (lucide-react)
- **Auto-expanded**: Yes (included in default expanded sections)

### Child Pages

#### 1. Prometheus Test (`/test-prometheus`)
- **Purpose**: Test real data integration with Prometheus
- **Icon**: TestTube
- **Status**: ✅ Complete
- **Description**: Validates chart formatting, data visualization, and professional appearance

#### 2. Data Integration Tests (`/dev/data-integration`)
- **Purpose**: Test data source integrations and connections
- **Icon**: Beaker  
- **Status**: 📝 Placeholder created
- **Future Use**: Database connections, API integrations, data transformations

#### 3. UI Component Tests (`/dev/ui-components`)
- **Purpose**: Test and showcase UI components
- **Icon**: FlaskConical
- **Status**: 📝 Placeholder created
- **Future Use**: Component library, visual testing, interaction demos

#### 4. API Testing (`/dev/api-testing`)
- **Purpose**: Test API endpoints and backend services
- **Icon**: Terminal
- **Status**: 📝 Placeholder created
- **Future Use**: Endpoint validation, request/response testing, service monitoring

#### 5. Performance Tests (`/dev/performance`)
- **Purpose**: Performance testing and optimization tools
- **Icon**: GitBranch
- **Status**: 📝 Placeholder created
- **Future Use**: Load testing, performance metrics, optimization tools

#### 6. Debug Tools (`/dev/debugging`)
- **Purpose**: Debugging tools and diagnostic utilities
- **Icon**: Bug
- **Status**: 📝 Placeholder created
- **Future Use**: System diagnostics, error tracking, troubleshooting tools

## Implementation Details

### Sidebar Navigation Configuration
```typescript
{
  id: 'development',
  text: 'Development',
  section: 'development',
  icon: Code,
  children: [
    { id: 'test-prometheus', text: 'Prometheus Test', icon: TestTube, url: '/test-prometheus' },
    { id: 'data-integration', text: 'Data Integration Tests', icon: Beaker, url: '/dev/data-integration' },
    { id: 'ui-components', text: 'UI Component Tests', icon: FlaskConical, url: '/dev/ui-components' },
    { id: 'api-testing', text: 'API Testing', icon: Terminal, url: '/dev/api-testing' },
    { id: 'performance', text: 'Performance Tests', icon: GitBranch, url: '/dev/performance' },
    { id: 'debugging', text: 'Debug Tools', icon: Bug, url: '/dev/debugging' }
  ]
}
```

### Auto-Expansion Configuration
```typescript
const [expandedSections, setExpandedSections] = useState<Set<string>>(
  new Set(['dashboards', 'development'])
);
```

## Usage Guidelines

### For Developers
1. **Always use the Development section** for any testing, debugging, or development-specific pages
2. **Follow the established pattern** when adding new development pages:
   - Create in `/src/app/dev/[page-name]/page.tsx`
   - Add to sidebar navigation with appropriate icon
   - Include descriptive page title and purpose
   - Use consistent styling and PageLayout component

### For Project Reviews
1. **Navigate to Development section** to access all testing and development tools
2. **Use test-prometheus page** as the primary example of professional chart formatting
3. **Verify all development pages** are accessible and functional before project completion

### For Project Completion
1. **Comprehensive review** of all development pages ensures nothing is overlooked
2. **Central location** makes it easy to demonstrate all features and capabilities
3. **Testing validation** through organized development tools provides confidence in deliverables

## Benefits

### Organization
- **Centralized access** to all development tools
- **Consistent navigation** pattern throughout project
- **Clear separation** between production and development features

### Efficiency  
- **Quick access** to testing tools during development
- **Standardized approach** reduces decision-making overhead
- **Auto-expanded section** ensures visibility

### Quality Assurance
- **Systematic testing** through organized tool access
- **Professional presentation** for project reviews
- **Complete validation** before project delivery

## Maintenance

### Adding New Development Pages
1. Create page in `/src/app/dev/[new-page]/page.tsx`
2. Add navigation entry to `DashboardLayout.tsx`
3. Update this SOP document
4. Test navigation and page accessibility

### Removing Development Features
- Development section can be hidden or removed for production deployments
- Individual pages can be disabled while maintaining navigation structure
- All development routes are clearly separated from production routes

---

**Last Updated**: Current Implementation
**Status**: ✅ Active and Complete
**Next Review**: Upon project completion