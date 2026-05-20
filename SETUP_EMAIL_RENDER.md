# Email OTP on Render (Gmail SMTP)

SmartInsure sends **6-digit codes** for:
- **Register** → verify email
- **Forgot password** → reset OTP

## 1. Render environment variables

Open your **Render** service → **Environment** and set:

| Key | Value |
|-----|--------|
| `APP_URL` | `https://insuradrive.vercel.app` |
| `SMTP_SERVER` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Your Gmail address (e.g. `shubhmak1305@gmail.com`) |
| `SMTP_PASS` | Gmail **App Password** (16 characters, no spaces) |
| `FROM_NAME` | `SmartInsure` |

Then click **Save Changes** → **Manual Deploy** (or wait for auto-deploy).

## 2. Create a Gmail App Password

1. Google Account → **Security** → turn on **2-Step Verification**
2. **App passwords** → create app “Mail” / “Other (SmartInsure)”
3. Copy the 16-character password → paste into Render as `SMTP_PASS` (remove spaces)

Do **not** use your normal Gmail password.

## 3. Verify SMTP on Render

After deploy, sign in as **admin** and open (with your JWT):

```
GET https://smart-vehicle-data-management-system.onrender.com/api/auth/smtp-verify
Authorization: Bearer YOUR_ADMIN_TOKEN
```

Response should include `"ok": true`.

Or check public health:

```
GET https://smart-vehicle-data-management-system.onrender.com/health
```

Look for `"email": { "configured": true, ... }`.

## 4. Test in the app

1. **Register** → you should receive an email with a 6-digit code
2. Enter the code on the verification screen
3. **Forgot password** → enter email → receive reset OTP → enter OTP + new password

## Troubleshooting

| Issue | Fix |
|--------|-----|
| No email received | Check spam; confirm `SMTP_USER` / `SMTP_PASS` on Render |
| “Could not send email” | Redeploy after saving env vars; test `/api/auth/smtp-verify` |
| University email blocks mail | Use Gmail for `SMTP_USER` or a transactional provider (SendGrid) |
| Link in email wrong | Set `APP_URL` to `https://insuradrive.vercel.app` |
