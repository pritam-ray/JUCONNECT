# Group Chat File Sharing & Auto-Cleanup System

This system implements file sharing in group chats with automatic cleanup after 2 weeks to manage storage space.

## Features

✅ **File Upload in Group Chats**
- Support for PDF, DOC, DOCX, TXT, JPG, PNG files (up to 5MB each)
- Files stored in Supabase Storage under `group-files/{groupId}/` folders
- Immediate UI updates when files are uploaded
- Download links and file size information
- Delete own files functionality

✅ **Automatic Data Cleanup**
- All group messages (text + files) automatically deleted after 2 weeks
- Files removed from both database and Supabase Storage
- Cleanup operations logged for monitoring
- Configurable via database functions

✅ **User Experience**
- Clear visual indication of file uploads in progress
- Error handling with user-friendly messages
- File type and size validation
- Information banner about 2-week retention policy

## Setup Instructions

### 1. Apply Database Migrations

Run these migrations in your Supabase dashboard in order:

```sql
-- 1. Apply the automatic cleanup system
\i supabase/migrations/20250822030000_setup_automatic_cleanup.sql

-- 2. Test the cleanup functionality (optional)
\i supabase/migrations/20250823040000_test_cleanup.sql
```

### 2. Deploy Edge Function (Option 1 - Recommended)

For automatic scheduled cleanup:

```bash
# Deploy the cleanup Edge Function
npx supabase functions deploy cleanup-group-data

# Set up a webhook or cron job to call it daily
# Example: Call https://your-project.supabase.co/functions/v1/cleanup-group-data daily
```

### 3. Manual Database Cleanup (Option 2)

If you prefer manual control, run this SQL command periodically:

```sql
SELECT cleanup_old_group_data();
```

### 4. Set up Scheduled Cleanup (Option 3 - If pg_cron is available)

If your Supabase instance has pg_cron enabled, the migration will automatically create a daily cleanup job at 2 AM UTC.

## File Upload Implementation

### Frontend Components

- **GroupChatInterface**: Enhanced with file upload UI and error handling
- **File Upload Service**: Handles file validation, upload, and cleanup
- **Real-time Updates**: Files appear immediately in chat

### Backend Services

- **groupFileService.ts**: Manages file uploads, deletions, and cleanup
- **Database Functions**: Automatic cleanup with logging
- **Edge Functions**: Scheduled cleanup operations

## File Storage Structure

```
supabase-storage/files/
└── group-files/
    ├── {group-id-1}/
    │   ├── timestamp-random-filename.pdf
    │   └── timestamp-random-filename.jpg
    └── {group-id-2}/
        └── timestamp-random-filename.docx
```

## Cleanup Monitoring

Check cleanup logs:

```sql
-- View recent cleanup operations
SELECT * FROM recent_cleanup_stats;

-- Manual cleanup with logging
SELECT cleanup_old_group_data();
```

## Security Features

- File type validation (only allowed extensions)
- File size limits (5MB max)
- User ownership verification for file deletion
- Secure file storage in Supabase
- Automatic virus scanning (if configured)

## Configuration

### File Size Limits
Edit `src/services/fileUploadService.ts`:

```typescript
const FILE_SIZE_LIMITS = {
  pdf: 5 * 1024 * 1024,   // 5MB
  // Add or modify limits as needed
}
```

### Retention Period
Edit cleanup function to change from 2 weeks:

```sql
-- Change INTERVAL '14 days' to desired period
cutoff_date := NOW() - INTERVAL '14 days';
```

### Allowed File Types
Edit `GroupChatInterface.tsx` and `fileUploadService.ts`:

```typescript
// Add or remove file types
accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
```

## Testing

1. **Upload a file** in a group chat
2. **Check storage** in Supabase dashboard
3. **Test cleanup** by running `SELECT cleanup_old_group_data();`
4. **Monitor logs** in the `cleanup_logs` table

## Troubleshooting

### Files not uploading
- Check Supabase storage permissions
- Verify file size and type restrictions
- Check browser console for errors

### Cleanup not working
- Verify database functions are created
- Check Edge Function deployment
- Review cleanup logs for errors

### Storage space issues
- Reduce retention period
- Implement file size limits
- Monitor cleanup log statistics

## Performance Considerations

- Cleanup runs during low-traffic hours (2 AM UTC)
- File uploads are chunked for large files
- Database indexes optimize cleanup queries
- Storage operations are logged for monitoring
