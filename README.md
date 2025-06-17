# Adaptive Factory AI Solutions, Inc.

A clean, modern web application for manufacturing intelligence and analytics built with Next.js, React, TypeScript, and Tailwind CSS.

## Features

- **Manufacturing Dashboard**: Real-time monitoring of OEE, production metrics, and performance indicators
- **Equipment Monitoring**: Track equipment status, performance, and maintenance schedules
- **Alerts & Notifications**: Stay informed about critical issues and maintenance requirements
- **AI Assistant**: Get insights and recommendations through natural language conversations

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Data Visualization**: Highcharts
- **Database**: Prisma with PostgreSQL
- **Authentication**: (To be implemented)

## Project Structure

```
clean-project/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── dashboard/        # Dashboard page
│   │   ├── equipment/        # Equipment monitoring page
│   │   ├── alerts/           # Alerts page
│   │   ├── manufacturing-chat/ # AI assistant page
│   │   ├── globals.css       # Global styles
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Home page
│   ├── components/           # Shared React components
│   ├── lib/                  # Utility functions and shared logic
│   ├── hooks/                # Custom React hooks
│   └── types/                # TypeScript type definitions
├── public/                   # Static assets
├── prisma/                   # Prisma schema and migrations
├── next.config.js            # Next.js configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Project dependencies
```

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/manufacturing-intelligence-platform.git
   cd manufacturing-intelligence-platform
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Initialize the Mock Service Worker:
   ```bash
   npm run msw:init
   # or
   yarn msw:init
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Mock API Server

The project includes a mock API server that intercepts API requests during development and returns mock data. This allows for frontend development without requiring a backend server.

- Mock data files are located in `src/mocks/data/`
- API handlers are defined in `src/mocks/handlers.ts`
- The mock server is automatically initialized in development mode

To add new mock endpoints:
1. Add mock data in `src/mocks/data/`
2. Add handlers in `src/mocks/handlers.ts`
3. No restart is needed - changes will be reflected automatically

## Development Workflow

This project follows a structured development workflow with branches organized for different purposes:

- `main-Production-ready-code`: Production-ready code
- `develop-Integration-branch`: Integration branch for completed features
- `feature/*`: New feature development
- `bugfix/*`: Bug corrections
- `hotfix/*`: Critical production fixes

## Design Principles

This project follows these key design principles:

1. **Clean Architecture**: Separation of concerns with clear boundaries between UI, business logic, and data access.
2. **Minimal Dependencies**: Only essential packages are included to reduce bloat and maintenance burden.
3. **Type Safety**: TypeScript is used throughout to ensure type safety and improve developer experience.
4. **Component-Based Design**: UI is built with reusable React components following best practices.
5. **Responsive Design**: All pages are responsive and work on mobile, tablet, and desktop.

## Benefits of Clean Architecture

1. **No Bloat**: Started from scratch without any template bloat
2. **Minimal Dependencies**: Only includes what's actually needed
3. **Modern Patterns**: Uses latest React and Next.js patterns
4. **Performance**: Fast and lightweight
5. **Maintainable**: Easy to understand and extend

## Development Approach

This project was built from scratch with a focus on simplicity and maintainability:

1. Started with a clean Next.js App Router structure
2. Added Tailwind CSS for styling
3. Created essential page components (Home, Dashboard, Equipment, Alerts, Chat)
4. Implemented responsive layouts and UI components
5. Added mock data for demonstration purposes

## Future Enhancements

- [ ] Authentication and user management
- [ ] Database integration with Prisma
- [ ] Real-time data updates
- [ ] Integration with manufacturing systems
- [ ] Advanced analytics and reporting
- [ ] Production deployment setup

## Folder Structure Best Practices

- Keep components small and focused on a single responsibility
- Group related functionality in dedicated folders
- Use consistent naming conventions
- Keep business logic separate from UI components
- Organize CSS using Tailwind's utility-first approach

## License

This project is licensed under the MIT License - see the LICENSE file for details