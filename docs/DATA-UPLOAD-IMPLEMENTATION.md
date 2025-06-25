# Production-Ready Data Upload System

## Overview

The Manufacturing Analytics Platform now includes a comprehensive, secure, and scalable data upload system designed for production environments.

## Key Features

### Security
- **Authentication**: NextAuth integration with session validation
- **Rate Limiting**: Configurable rate limits per user (10 uploads per hour default)
- **File Sanitization**: Filename sanitization to prevent path traversal attacks
- **Virus Scanning**: Integrated file scanner for malware detection
- **File Size Limits**: 100MB default limit with configurable options
- **MIME Type Validation**: Only allow CSV, JSON, and Excel files

### Performance
- **Streaming Processing**: Handle large files without memory issues
- **Batch Processing**: Process records in configurable chunks (1000 default)
- **Background Jobs**: Async processing with job queue
- **Progress Tracking**: Real-time progress updates via polling
- **Memory Management**: Automatic memory limit checks during processing

### Data Integrity
- **Transaction Support**: Atomic batch inserts with rollback on failure
- **Deduplication**: Optional duplicate detection and removal
- **Data Validation**: Zod schema validation for each record
- **Business Rule Validation**: Custom validation rules (e.g., good parts <= total parts)
- **Error Handling**: Detailed error tracking with row-level information

### Monitoring & Observability
- **Audit Logging**: Complete audit trail of all upload activities
- **Metrics Collection**: Performance metrics and usage statistics
- **Progress Tracking**: Real-time upload progress in database
- **Error Reporting**: Detailed error logs with context

## Architecture

### Components

1. **API Route** (`/api/import/manufacturing-data`)
   - Handles file upload, validation, and job creation
   - Returns immediate response with tracking information

2. **Job Queue** (`JobQueue`)
   - Background processing with retry logic
   - Priority-based execution
   - Graceful shutdown handling

3. **Import Service** (`ManufacturingDataImportService`)
   - Streaming CSV/JSON processing
   - Batch processing with transactions
   - Deduplication and validation

4. **Supporting Services**
   - `RateLimiter`: Redis-backed or in-memory rate limiting
   - `FileScanner`: Security scanning for uploaded files
   - `AuditLogger`: Comprehensive audit logging
   - `MetricsCollector`: Application metrics

### Database Schema

```prisma
model DataUpload {
  id                String    @id @default(cuid())
  userId            String
  fileName          String
  fileSize          Int
  mimeType          String
  status            String    // pending, processing, completed, failed
  totalRecords      Int?
  successfulRecords Int?
  failedRecords     Int?
  processingTime    Int?
  errors            Json?
  // ... additional fields
}

model JobQueue {
  id                String    @id @default(cuid())
  type              String
  payload           String    // JSON payload
  status            String
  priority          String
  attempts          Int
  // ... additional fields
}
```

## Usage

### Frontend Integration

```typescript
// Upload a file
const formData = new FormData();
formData.append('file', file);
formData.append('workUnitId', 'unit-123');
formData.append('importType', 'csv');
formData.append('deduplicate', 'true');
formData.append('validateData', 'true');

const response = await fetch('/api/import/manufacturing-data', {
  method: 'POST',
  body: formData
});

const result = await response.json();
// Returns: { success, uploadId, jobId, status, tracking }
```

### Check Upload Status

```typescript
// Get specific upload status
const response = await fetch(`/api/import/manufacturing-data?uploadId=${uploadId}`);
const { upload, progress } = await response.json();

// Get upload history
const response = await fetch('/api/import/manufacturing-data?limit=20');
const { uploads, pagination } = await response.json();
```

## Configuration

### Environment Variables

```env
# Redis for rate limiting (optional - uses in-memory if not set)
REDIS_URL=redis://localhost:6379

# File upload limits
MAX_FILE_SIZE=104857600  # 100MB in bytes
UPLOAD_RATE_LIMIT=10     # Uploads per hour

# Job processing
JOB_CONCURRENCY=5        # Concurrent job workers
JOB_POLL_INTERVAL=1000   # Job polling interval in ms
```

### Security Configuration

```typescript
// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/json',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

// File size limit
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// Rate limiting
const RATE_LIMIT = {
  max: 10,
  window: '1h'
};
```

## Error Handling

The system provides detailed error information at multiple levels:

1. **Upload Errors**: File validation, size limits, MIME type
2. **Processing Errors**: Parse errors, validation failures
3. **Business Logic Errors**: Invalid data relationships
4. **System Errors**: Database failures, memory limits

### Error Response Format

```json
{
  "error": "Import failed",
  "message": "User-friendly error message",
  "supportId": "unique-error-id",
  "details": {
    "errors": [
      {
        "row": 125,
        "field": "goodParts",
        "value": 150,
        "error": "Good parts cannot exceed total parts produced"
      }
    ]
  }
}
```

## Best Practices

1. **Always validate data** before processing
2. **Use deduplication** for repeated imports
3. **Monitor memory usage** for large files
4. **Implement retry logic** for failed uploads
5. **Set appropriate rate limits** based on usage
6. **Regular cleanup** of old upload records
7. **Monitor job queue** health and performance

## Monitoring

### Key Metrics
- Upload success/failure rates
- Processing time per file
- Memory usage during processing
- Queue depth and processing lag
- Error rates by type

### Alerts
- High error rates
- Queue backlog
- Memory limit exceeded
- Rate limit violations

## Troubleshooting

### Common Issues

1. **"File too large"**
   - Check MAX_FILE_SIZE configuration
   - Consider chunked uploads for very large files

2. **"Rate limit exceeded"**
   - Wait for rate limit window to reset
   - Adjust rate limits if needed

3. **"Processing timeout"**
   - Check job queue health
   - Verify database performance
   - Consider smaller batch sizes

4. **"Memory limit exceeded"**
   - Reduce batch size
   - Check for memory leaks
   - Scale up worker resources

## Future Enhancements

- [ ] Chunked file upload for resume capability
- [ ] WebSocket support for real-time progress
- [ ] S3/cloud storage integration
- [ ] Multi-tenant isolation
- [ ] Data transformation pipelines
- [ ] Automated data quality reports
- [ ] Export functionality
- [ ] Scheduled imports