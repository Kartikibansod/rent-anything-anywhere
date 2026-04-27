# Migration Scripts

## Chat System Migration

This script migrates the existing message system to the new listing-based chat system.

### What it does:
1. Adds `averageRating`, `totalReviews`, and `isStudent` fields to all users
2. Creates `Chat` documents from existing messages, grouping them by listing + buyer + seller

### How to run:

```bash
cd server
node src/scripts/migrate-chats.js
```

### Notes:
- The script is idempotent - it won't create duplicate chats
- Existing messages will be preserved and associated with the new Chat documents
- Run this after deploying the new code to ensure the Chat model exists

## Manual Steps After Migration

1. Restart the server
2. Clear browser cache/localStorage if needed
3. Test chat functionality by:
   - Going to a listing detail page
   - Clicking "Chat" button
   - Verifying the chat opens with listing preview

## Rollback

If you need to rollback:
1. Drop the `chats` collection from MongoDB
2. Revert the code changes
3. Restart the server