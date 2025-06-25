# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-20

### Added
- Initial release of ISO-ready agent system
- Intent Classifier Agent with semantic embedding support
- ISO Compliance Agent mapping intents to ISO standards (22400-2, 9001, 14224, 50001, 14001, 45001, 55000)
- Memory Pruner Agent with configurable retention policies
- Session memory and audit trail persistence
- OpenTelemetry instrumentation for distributed tracing
- JWT and API key authentication
- Role-based authorization (admin, manager, operator, viewer)
- Rate limiting middleware with configurable limits
- Health check endpoint with dependency monitoring
- Docker support with multi-stage build
- CI/CD pipeline with GitHub Actions
- Comprehensive test suite (unit, integration, E2E)
- OpenAPI 3.0 specification
- Production-ready error handling and logging

### Security
- Input sanitization to prevent XSS
- Sensitive data redaction in logs
- Non-root Docker container
- Environment variable validation

### Documentation
- Complete API documentation
- Architecture overview
- Deployment guide
- Troubleshooting guide

## [0.9.0] - 2024-01-15 (Pre-release)

### Added
- Basic agent framework
- Prototype intent classification
- Initial ISO standard mappings

### Changed
- Refactored to use Prisma ORM
- Migrated to Next.js 14 app router

### Fixed
- Memory leak in session storage
- Rate limiter race condition

## [0.8.0] - 2024-01-10 (Pre-release)

### Added
- Manufacturing context models
- Basic authentication
- Initial test coverage

### Known Issues
- Embedding service not implemented
- No production deployment config
- Limited ISO standard coverage