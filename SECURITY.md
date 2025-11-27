# Security Configuration Guide

## Overview

This application is configured with multiple layers of security to prevent unauthorized access, injection attacks, privilege escalation, and data breaches.

## 1. Firebase Configuration

### Securing Firebase Credentials

**DO NOT expose Firebase credentials in client code for production.**

1. **Create a Service Account for Backend Only**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Generate a new private key
   - Download the JSON file

2. **Set Environment Variable Securely**
   ```bash
   # On deployment platform (not in .env file):
   FIREBASE_SERVICE_ACCOUNT_KEY="<entire JSON content as string>"
   ```

3. **Client Firebase Configuration**
   - The public Firebase config (API key, project ID) is safe to use in client
   - However, Firestore rules prevent any direct write access to sensitive collections

### Firestore Security Rules

The deployed `firestore.rules` implements:

- **Default Deny All**: Every collection defaults to `allow read, write: if false`
- **User Data Protection**: Users can only access their own profile data
- **Admin Field Protection**: Users cannot modify `isAdmin` field in any way
- **Message Privacy**: Users can only read/write messages in their own conversations
- **License Management**: Only admins can manage licenses (via backend API)
- **System Collections**: IP bans, user bans, settings are admin-only (via backend API)

## 2. Backend API Security

### Admin Operations via Backend Only

All sensitive operations go through the backend API:

- **POST /api/admin/verify** - Verify admin status
- **POST /api/admin/ban-user** - Ban a user
- **POST /api/admin/ban-ip** - Ban an IP address
- **POST /api/admin/delete-user** - Delete a user
- **GET /api/admin/users** - List all users
- **POST /api/admin/create-license** - Create license key

### Authentication Flow

1. Client sends `idToken` (from Firebase Auth) to backend
2. Backend verifies token with Firebase Admin SDK
3. Backend checks `isAdmin` field in Firestore
4. If admin, backend performs the operation
5. Client never directly accesses sensitive collections

### Input Validation

All endpoints validate input using Zod:

- **Token Format**: Strict regex validation `^[A-Za-z0-9_\-\.]+$`
- **Token Length**: Min 10, max 3000 characters
- **User IDs**: Min 10, max 100 characters
- **Reasons/Text**: Min 5, max 500 characters, trimmed
- **IP Addresses**: Must be valid IPv4 or IPv6
- **Durations**: Int, min 1, max 36500 days

### No Direct Database Access

- Clients never have direct Firestore write access to sensitive collections
- All modifications go through validated backend endpoints
- Backend logs all admin actions for auditing

## 3. Injection Attack Prevention

### HTML/XSS Protection

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

### Input Sanitization

- All user input is trimmed and validated with Zod
- No direct concatenation into queries or database operations
- All strings limited to max 500 characters (except tokens)

### Query Protection

- Firestore rules prevent querying system collections
- No way to enumerate users or licenses via client
- Backend queries are immutable and server-controlled

## 4. Admin Privilege Protection

### Preventing Privilege Escalation

The `isAdmin` field:

1. **Cannot be set at user creation** - defaults to `false`
2. **Cannot be modified by users** - Firestore rules reject any update containing `isAdmin`
3. **Cannot be modified via client** - only backend can set it
4. **Can only be granted via backend** - requires previous admin verification
5. **Is verified on every admin action** - checked against Firebase Auth token

### Backend Admin Verification

Every admin endpoint:
1. Validates the ID token with Firebase
2. Decodes the token to get user UID
3. Checks the `isAdmin` field in Firestore
4. Fails if user is not admin

```typescript
static async verifyAdmin(idToken: string): Promise<string> {
  const auth = getAdminAuth();
  const decodedToken = await auth.verifyIdToken(idToken);
  
  const db = getAdminDb();
  const userDoc = await db.collection("users").doc(decodedToken.uid).get();
  
  if (!userDoc.exists || !userDoc.data()?.isAdmin) {
    throw new Error("Unauthorized: Not an admin");
  }
  
  return decodedToken.uid;
}
```

### Setting Initial Admin

To create the first admin:

1. **Via Firebase Console (RECOMMENDED)**
   - Create user via Authentication
   - Go to Firestore → users collection
   - Create/edit document with `isAdmin: true`

2. **Via Backend Service Account** (if you have direct access)
   ```typescript
   const db = getAdminDb();
   await db.collection("users").doc(userId).update({
     isAdmin: true
   });
   ```

**Never expose admin credentials in code or .env files.**

## 5. Environment Variable Security

### Required Variables

```bash
# Backend only (set on deployment platform):
FIREBASE_SERVICE_ACCOUNT_KEY="{...entire JSON...}"

# Optional:
PING_MESSAGE="pong"
```

### Safe Variables

These are safe to expose (not sensitive):
- React app config (vite.config.ts)
- Firebase public config (API key, project ID)

### Never Expose

- Private keys
- Service account credentials
- Admin tokens
- Database credentials

## 6. Logging and Auditing

All admin actions are logged:

```
[ADMIN_ACTION] {adminUid} banned user {userId}. Reason: {reason}
[ADMIN_ACTION] {adminUid} created license {licenseKey}
[ADMIN_ACTION] {adminUid} banned IP {ipAddress}. Reason: {reason}
[ADMIN_ACTION] {adminUid} deleted user {userId}
```

Review these logs regularly for suspicious activity.

## 7. Deployment Security Checklist

- [ ] Set `FIREBASE_SERVICE_ACCOUNT_KEY` on deployment platform
- [ ] Do NOT commit `.env` with secrets
- [ ] Do NOT commit `firebaseConfig` with private keys
- [ ] Enable HTTPS only
- [ ] Set CORS to allow only your domain
- [ ] Configure rate limiting on API endpoints
- [ ] Monitor admin action logs
- [ ] Regularly review user access and permissions
- [ ] Keep Firebase rules updated
- [ ] Enable Firebase Security Monitoring

## 8. Common Security Issues

### Issue: "Missing or insufficient permissions" errors

**Cause**: Firestore rules are too restrictive for legitimate operations.

**Solution**:
1. Check the specific operation in the rules
2. Verify user is authenticated
3. Verify operation matches the rules
4. Use backend API for admin operations

### Issue: Users can see other users' data

**Cause**: Read rules are too permissive.

**Solution**:
- Review `firestore.rules` - ensure users can only read their own data
- Use backend API for aggregated data (like admin user list)

### Issue: Admin password visible in code

**Solution**:
- There is no admin password
- Admin status is set in Firestore `isAdmin: true`
- Can only be set via backend or Firebase Console
- Never hardcoded

### Issue: Injection attacks in admin panel

**Solution**:
- All input validated with Zod before database operations
- All strings trimmed and length-limited
- No direct string concatenation in queries
- All operations use Firestore API (not SQL)

## 9. Testing Security

### Test Privilege Escalation

```bash
# Try to set isAdmin: true as regular user
# Should fail silently (rule blocks it)
curl -X POST https://your-app.com/api/admin/verify \
  -H "Content-Type: application/json" \
  -d '{"idToken":"fake-token"}'
# Expected: 401 Unauthorized
```

### Test Injection

```bash
# Try SQL/NoSQL injection
curl -X POST https://your-app.com/api/admin/ban-user \
  -H "Content-Type: application/json" \
  -d '{
    "idToken":"valid-token",
    "userId":"1; DROP TABLE users;--",
    "reason":"test",
    "duration":1
  }'
# Expected: 400 Bad Request (invalid userId format)
```

### Test Token Validation

```bash
# Try various token formats
# Valid tokens: Signed Firebase tokens (generated by SDK)
# Invalid tokens: Obviously wrong format
# Should reject anything not matching the strict pattern
```

## 10. Support and Incident Response

If you suspect a security issue:

1. **Do not publicize the issue immediately**
2. **Document the issue with:**
   - What was accessed/modified
   - When it happened
   - What admin logs show
   - Who had access
3. **Review relevant logs** and audit trail
4. **Take remedial action:**
   - Ban compromised accounts
   - Ban suspicious IPs
   - Rotate credentials if needed
   - Check Firebase activity logs
5. **Test the fix** before considering it resolved

## References

- [Firebase Security Best Practices](https://firebase.google.com/docs/database/security)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/start)
- [OWASP Prevention Cheat Sheets](https://cheatsheetseries.owasp.org/)
