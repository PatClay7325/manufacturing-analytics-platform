# User Preferences and Settings Persistence System

## Overview

This implementation provides a complete user preferences and settings persistence system that matches manufacturingPlatform's user preferences functionality. The system includes comprehensive preference management, real-time updates, offline support, and organization-level defaults.

## 🏗️ Architecture

### Database Schema

**UserPreferences Model (`prisma/schema.prisma`):**
- Comprehensive preference storage with organized categories
- JSON custom settings support
- Version tracking for migrations
- Relationship with User model

**OrganizationDefaults Model:**
- Organization-wide default settings
- Feature flags and security policies
- Resource limits and data retention settings
- Branding customization options

**PreferenceChangeHistory Model:**
- Complete audit trail of preference changes
- User, IP, and timestamp tracking
- Change source and reason logging

### API Routes

**User Preferences API (`/api/user/preferences`):**
- `GET` - Retrieve user preferences with auto-creation of defaults
- `PUT` - Update preferences with validation and change tracking
- `PATCH` - Partial preference updates
- `POST /reset` - Reset preferences to defaults

**Organization Preferences API (`/api/org/preferences`):**
- `GET` - Retrieve organization defaults
- `PUT` - Update organization defaults (admin only)
- Admin role validation and comprehensive change logging

## 🎨 User Interface

### UserPreferencesManager Component

**Multi-tab Interface:**
- UI Preferences (Theme, Language, Navigation)
- Localization (Timezone, Date/Time formats)
- Dashboard Defaults (Time ranges, Auto-refresh)
- Notifications (Email, Browser, Desktop, Alert filtering)
- Accessibility (Motion, Contrast, Font size, Screen reader)
- Privacy & Security (Analytics, Feature toggles)
- Data Display (Units, Formatting, Decimal places)

**Features:**
- Real-time preference updates
- Search functionality across all settings
- Visual feedback and validation
- Reset to defaults capability

### QuickSettingsMenu Component

**Header Integration:**
- Quick theme switching
- Language selection
- Font size adjustment
- Common toggle switches
- Direct link to full preferences

**Responsive Design:**
- Dropdown menu with organized sections
- Visual theme preview
- Instant preference updates

### PreferencesSearch Component

**Smart Search:**
- Searchable settings database
- Keyword and category matching
- Quick navigation to specific settings
- Visual result highlighting

## 🔧 Technical Implementation

### PreferencesProvider Context

**Real-time State Management:**
```typescript
- preferences: UserPreferences | null
- loading: boolean
- error: string | null
- updatePreferences: (updates: PreferenceUpdate) => Promise<void>
- resetPreferences: () => Promise<void>
- applyTheme: (theme) => void
- appliedTheme: 'light' | 'dark'
```

**Advanced Features:**
- Optimistic updates with rollback
- Debounced server synchronization
- LocalStorage fallback for offline support
- Automatic theme application
- System theme detection

### Preference Categories

#### UI Preferences
- **Theme**: Light, Dark, System
- **Language**: 20+ supported languages
- **Timezone**: Browser or specific timezone
- **Date/Time Formats**: Multiple international formats
- **Week Start**: Sunday or Monday

#### Dashboard Preferences
- **Home Dashboard**: Default landing dashboard
- **Time Range**: Default time window for queries
- **Auto Refresh**: Automatic dashboard refresh intervals
- **Query History**: Number of stored queries

#### Editor Preferences
- **Default Datasource**: Primary data source
- **Tooltip Mode**: Single, Multi, or None
- **Explore Mode**: Metrics, Logs, or Traces
- **Query Timeout**: Maximum query execution time
- **Live Now**: Real-time data streaming

#### Notification Preferences
- **Channels**: Email, Browser, Desktop
- **Alert Filtering**: By severity level
- **Sound**: Notification audio alerts
- **Timing**: Quiet hours and frequency

#### Accessibility Preferences
- **Motion**: Reduce animations
- **Contrast**: High contrast mode
- **Font Size**: Small, Medium, Large
- **Keyboard**: Shortcut preferences
- **Screen Reader**: Optimization features
- **Focus**: Visual focus indicators

#### Privacy Preferences
- **Analytics**: Usage data sharing
- **Storage**: Query and dashboard caching
- **Features**: Announcements and experimental features
- **Developer**: Advanced debugging tools

#### Data Display Preferences
- **Units**: Metric vs Imperial
- **Null Values**: Display format for missing data
- **Decimals**: Precision settings
- **Separators**: Number formatting

## 🔐 Security Features

### Organization Controls
- **Password Policies**: Minimum length, complexity
- **Session Management**: Timeout configuration
- **Feature Flags**: Enable/disable functionality
- **Resource Limits**: Per-user quotas
- **Audit Logging**: Complete change tracking

### Validation & Safety
- **Input Validation**: Zod schema validation
- **Type Safety**: Full TypeScript support
- **Error Handling**: Graceful degradation
- **Change Tracking**: Audit trail for compliance

## 📊 Data Persistence

### Storage Strategy
- **Primary**: PostgreSQL with Prisma ORM
- **Cache**: LocalStorage for offline support
- **Sync**: Debounced updates to prevent spam
- **Backup**: Change history for recovery

### Migration Support
- **Versioning**: Preference schema versions
- **Defaults**: Automatic default value application
- **Compatibility**: Backward compatibility handling

## 🚀 Usage Examples

### Basic Usage
```typescript
import { usePreferences } from '@/contexts/PreferencesContext';

function MyComponent() {
  const { preferences, updatePreferences } = usePreferences();
  
  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    updatePreferences({ ui: { theme } });
  };
  
  return (
    <div className={preferences?.ui.theme === 'dark' ? 'dark' : ''}>
      {/* Component content */}
    </div>
  );
}
```

### Organization Settings
```typescript
// Admin-only organization defaults
const updateOrgDefaults = async (defaults: Partial<OrganizationDefaults>) => {
  const response = await fetch('/api/org/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(defaults),
  });
  return response.json();
};
```

### Search Integration
```typescript
<PreferencesSearch 
  onResultClick={(category, item) => {
    setActiveTab(category);
    // Navigate to specific setting
  }} 
/>
```

## 🎯 Key Features

### ✅ Complete Preference Coverage
- All major manufacturingPlatform preference categories
- Extensive customization options
- Organization-level defaults
- Per-user overrides

### ✅ Real-time Updates
- Instant UI changes
- Optimistic updates
- Offline support
- Change synchronization

### ✅ Search & Discovery
- Intelligent preference search
- Category-based organization
- Quick access shortcuts
- Visual navigation aids

### ✅ Accessibility Support
- Screen reader optimization
- Keyboard navigation
- High contrast modes
- Motion reduction
- Font scaling

### ✅ Security & Compliance
- Complete audit trails
- Role-based access control
- Change tracking
- Data validation

### ✅ Developer Experience
- Type-safe APIs
- Comprehensive validation
- Error handling
- Testing coverage

## 📁 File Structure

```
src/
├── types/preferences.ts                    # TypeScript interfaces
├── contexts/PreferencesContext.tsx        # React context provider
├── components/settings/
│   ├── UserPreferencesManager.tsx         # Main preferences UI
│   ├── QuickSettingsMenu.tsx             # Header quick menu
│   └── PreferencesSearch.tsx             # Search functionality
├── app/api/
│   ├── user/preferences/
│   │   ├── route.ts                      # User preferences API
│   │   └── reset/route.ts                # Reset preferences
│   └── org/preferences/route.ts          # Organization API
├── app/profile/preferences/page.tsx       # Preferences page
├── app/admin/organization-settings/page.tsx # Admin settings
└── __tests__/preferences.integration.test.ts # Test coverage
```

## 🔧 Installation & Setup

1. **Database Migration**: Run Prisma migrations to add preference tables
2. **Environment**: Add PreferencesProvider to app layout
3. **Navigation**: Add preference links to user menu
4. **Admin**: Set up organization settings for admins

## 🎨 Customization

The system is highly customizable and extensible:

- **Custom Settings**: Add organization-specific preferences
- **Validation**: Extend Zod schemas for custom rules
- **UI Components**: Customize the preference interface
- **Themes**: Add custom theme options
- **Languages**: Extend language support

## 🔄 Future Enhancements

- **Import/Export**: Preference backup and restore
- **Profiles**: Multiple preference profiles per user
- **Sync**: Cross-device preference synchronization
- **Analytics**: Usage analytics for preference adoption
- **Templates**: Preference templates for new users

## 📚 API Reference

See the individual API route files for detailed parameter and response documentation. All APIs include comprehensive error handling, validation, and TypeScript support.

## 🧪 Testing

Comprehensive test coverage includes:
- Integration tests for database operations
- Preference validation and constraints
- Change tracking and audit trails
- Organization defaults management
- API endpoint testing

The implementation provides a production-ready user preferences system that matches and extends manufacturingPlatform's functionality while maintaining excellent performance, security, and user experience.