# Aliyun Phone SMS OTP Setup

China mainland phone-number login using Alibaba Cloud Dypnsapi. This is a specialized auth method — only enable it if your product targets mainland China users.

## How It Works

The flow uses Better Auth's `phoneNumber` plugin with Aliyun as the SMS delivery backend:

1. User enters a `+86` phone number
2. Server calls Aliyun `SendSmsVerifyCode` to deliver an OTP
3. User enters the code
4. Server calls Aliyun `CheckSmsVerifyCode` to verify
5. Better Auth creates/signs-in the user — phone-only users get a generated username and a placeholder email

The implementation is in:
- `apps/server/src/sms/providers/aliyun.ts` — SMS delivery and verification
- `apps/server/src/lib/auth.ts` lines 263-284 — Better Auth phone plugin config

## Prerequisites

1. Enable SMS in `packages/app-config/src/app-config.ts`:
   ```typescript
   auth: {
     methods: {
       smsEnabled: true,
     },
   },
   ```

2. Create a RAM user in Alibaba Cloud:
   - Go to RAM Console → Users → Create User
   - Access configuration: select **Use permanent AccessKey to access**
   - Copy `AccessKey ID` and `AccessKey Secret`
   - Go to user detail → Permissions → Grant Permission
   - Search `dypns`, grant **AliyunDypnsReadOnlyAccess** and **AliyunDypnsFullAccess**

3. Write credentials to env files:
   ```
   # apps/server/.dev.vars AND apps/server/.env.production
   ALIBABA_CLOUD_ACCESS_KEY_ID=your_key_id
   ALIBABA_CLOUD_ACCESS_KEY_SECRET=your_key_secret
   ```

## Built-in SMS Parameters

These are pre-configured and should not be changed unless you have a custom Aliyun SMS signature:

- `ALIYUN_SMS_VERSION` — API version
- `ALIYUN_SMS_SIGN_NAME` — SMS signature name
- `ALIYUN_SMS_TEMPLATE_CODE` — SMS template ID

## Phone-Only Mode

If your product is China-only and you want phone login as the sole auth method:

```typescript
methods: {
  emailPasswordEnabled: false,
  emailOtpEnabled: false,
  smsEnabled: true,
  githubEnabled: false,
  googleEnabled: false,
  appleEnabled: false,
},
```

This works because Better Auth generates a placeholder email for phone-only users via `buildPhoneCompatibilityEmail()`. The placeholder is an HMAC digest — the raw phone number is never stored in the email column.

Note: `RESEND_API_KEY` is still needed if you enable password reset or email verification elsewhere, but for phone-only mode it can be left empty.
