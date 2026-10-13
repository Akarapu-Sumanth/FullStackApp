# Feature Configuration

## Browser Notifications

Desktop notifications require a browser that supports the Notifications API and explicit user permission. The Settings page asks for permission only after the user selects **Allow notifications**. Notifications are polled while the authenticated app is open, every 60 seconds; existing unread items are not replayed as desktop alerts. Production sites must use HTTPS. Browser notification blocking must be changed in the browser's site settings.

## Email Digests

Email digests are not implemented yet: the application has no digest sender or scheduled worker, and the Settings page reports them as unavailable. Django SMTP settings can be supplied through `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `EMAIL_USE_SSL`, and `DEFAULT_FROM_EMAIL`. Configuring a mail transport alone does not send digests. Before enabling this feature, implement and test a digest job, schedule a worker, and verify provider delivery and bounce handling. Keep credentials in the deployment secret store, not in source control.

## Avatar Uploads

Avatars accept verified JPEG, PNG, or WebP images up to 5 MB and 4096 by 4096 pixels. Local development stores uploads under `MEDIA_ROOT` (default `backend/media`) and serves them only with Django debug media routes. For durable production uploads, install requirements and set `AWS_STORAGE_BUCKET_NAME` and `AWS_S3_REGION_NAME`; the storage backend uses the AWS credential provider chain (prefer the App Runner instance role). Keep the bucket private so Django storage URLs remain signed, and configure bucket CORS for the deployed frontend origin if the browser needs to fetch avatars directly. Without an S3 bucket, production must mount a persistent filesystem at `MEDIA_ROOT`; ephemeral container storage is not durable.

## Production Transport Security

With `DEBUG=False`, Django defaults to HTTPS redirects, secure session and CSRF cookies, and a one-year HSTS max-age. App Runner must terminate TLS and overwrite `X-Forwarded-Proto`; the API must not be directly reachable through a path that lets clients spoof that header. Set `ALLOWED_HOSTS`, CORS origins, and trusted origins to the deployed hostnames. HSTS subdomain coverage and preload are deliberately opt-in: enable them only after every affected hostname is permanently HTTPS-capable and the domain owner accepts the long-lived browser policy.

## Session Reminder

The reminder is browser-local and checks the refresh JWT expiry. It appears during the final 24 hours of the configured seven-day refresh-token lifetime while the app is open. It does not extend a token or replace the normal refresh/reauthentication flow. Theme, workspace name, and reminder preference are saved in this browser's local storage and are not synchronized across devices.
