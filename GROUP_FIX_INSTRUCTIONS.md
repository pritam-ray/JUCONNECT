# Fix for Group Joining Error - "Infinite Recursion in Policy"

## Problem
The error "infinite recursion detected in policy for relation 'group_members'" occurs because the current RLS (Row Level Security) policies have circular references. When checking if a user can view group members, the policy tries to check if they're a member by querying the same table it's trying to access.

## Solution
You need to run the SQL migration I created to fix the policies. Here's how:

### Option 1: Apply via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to "SQL Editor"
3. Create a new query and paste the contents of the migration file: `supabase/migrations/20250822000000_fix_group_policies.sql`
4. Run the query

### Option 2: Apply via CLI (if linked)
If you have your Supabase project linked locally:
```bash
npx supabase db push
```

## What the Fix Does
The new policies eliminate circular references by:

1. **For group_members table:**
   - Users can view their own membership directly
   - Users can view members of groups they belong to (using a subquery that doesn't create recursion)
   - Users can join groups without complex checks
   - Only group admins can manage other members

2. **For other group tables (messages, files, announcements):**
   - Uses subqueries to check membership instead of EXISTS clauses that reference the same table

## Key Changes
- Replaces recursive EXISTS clauses with subquery-based membership checks
- Separates view permissions from action permissions
- Ensures users can join groups without circular policy evaluation

## After Applying the Fix
1. Users should be able to join groups without the infinite recursion error
2. Group functionality will work normally
3. Security is maintained with proper access controls

## Alternative Immediate Fix
If you can't apply the migration immediately, you can temporarily disable RLS on the group_members table:
```sql
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
```

**Warning:** This removes security restrictions, so only use this temporarily and re-enable RLS after applying the proper fix.

## Testing
After applying the fix:
1. Try joining a group from the Groups page
2. Verify you can see group members
3. Test sending messages in the group
4. Confirm all group functionality works properly
