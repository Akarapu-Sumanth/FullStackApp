
from pathlib import Path
import os
from datetime import timedelta

from dotenv import load_dotenv
from django.core.exceptions import ImproperlyConfigured


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env_bool(name, default=False):
    return os.getenv(name, str(default)).strip().lower() == "true"


# Core settings
DEBUG = env_bool("DEBUG", False)

SECRET_KEY = os.getenv("SECRET_KEY", "").strip()
if not SECRET_KEY:
    raise ImproperlyConfigured(
        "Set a strong SECRET_KEY in the backend .env file."
    )

ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv(
        "ALLOWED_HOSTS", "localhost,127.0.0.1"
    ).split(",")
    if host.strip()
]


# HTTPS and cookie security.
# For local HTTP development, set these values in backend/.env:
# SECURE_SSL_REDIRECT=False
# SESSION_COOKIE_SECURE=False
# CSRF_COOKIE_SECURE=False
# USE_X_FORWARDED_PROTO=False
#
# For production, configure HTTPS at the reverse proxy and
# explicitly set the appropriate secure values in the environment.
SECURE_SSL_REDIRECT = env_bool(
    "SECURE_SSL_REDIRECT", not DEBUG
)
SESSION_COOKIE_SECURE = env_bool(
    "SESSION_COOKIE_SECURE", not DEBUG
)
CSRF_COOKIE_SECURE = env_bool(
    "CSRF_COOKIE_SECURE", not DEBUG
)
SECURE_HSTS_SECONDS = int(
    os.getenv("SECURE_HSTS_SECONDS", "0" if DEBUG else "31536000")
)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool(
    "SECURE_HSTS_INCLUDE_SUBDOMAINS", False
)
SECURE_HSTS_PRELOAD = env_bool("SECURE_HSTS_PRELOAD", False)

SECURE_PROXY_SSL_HEADER = (
    ("HTTP_X_FORWARDED_PROTO", "https")
    if env_bool("USE_X_FORWARDED_PROTO", not DEBUG)
    else None
)


# Applications
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "api",
]


# Middleware
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# PostgreSQL database
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME", "fullstackapp"),
        "USER": os.getenv("DB_USER", "fullstackuser"),
        "PASSWORD": os.getenv("DB_PASSWORD", ""),
        "HOST": os.getenv("DB_HOST", "fullstackapp-postgres"),
        "PORT": os.getenv("DB_PORT", "5432"),
        "CONN_MAX_AGE": int(os.getenv("DB_CONN_MAX_AGE", "60")),
        "OPTIONS": {
            "sslmode": os.getenv("DB_SSLMODE", "prefer"),
        },
    }
}

if not DEBUG and not DATABASES["default"]["PASSWORD"]:
    raise ImproperlyConfigured(
        "Set DB_PASSWORD in the backend .env file."
    )


# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "UserAttributeSimilarityValidator"
        )
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "MinimumLengthValidator"
        )
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "CommonPasswordValidator"
        )
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "NumericPasswordValidator"
        )
    },
]


# Localization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True


# Static and media files
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

MEDIA_URL = os.getenv("MEDIA_URL", "/media/")
if not MEDIA_URL.endswith("/"):
    MEDIA_URL += "/"

MEDIA_ROOT = Path(
    os.getenv("MEDIA_ROOT", str(BASE_DIR / "media"))
)
if not MEDIA_ROOT.is_absolute():
    MEDIA_ROOT = BASE_DIR / MEDIA_ROOT


# Optional AWS S3 storage
AWS_STORAGE_BUCKET_NAME = os.getenv(
    "AWS_STORAGE_BUCKET_NAME", ""
)

if AWS_STORAGE_BUCKET_NAME:
    INSTALLED_APPS += ["storages"]

    AWS_S3_REGION_NAME = os.getenv("AWS_S3_REGION_NAME", "")
    AWS_QUERYSTRING_AUTH = True
    AWS_DEFAULT_ACL = None

    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
            "OPTIONS": {
                "bucket_name": AWS_STORAGE_BUCKET_NAME,
                "region_name": AWS_S3_REGION_NAME or None,
                "default_acl": None,
                "querystring_auth": True,
            },
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# CORS and CSRF
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        (
            "http://localhost:3000,"
            "http://127.0.0.1:3000,"
            "http://localhost:5173,"
            "http://127.0.0.1:5173"
        ),
    ).split(",")
    if origin.strip()
]

CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CSRF_TRUSTED_ORIGINS",
        (
            "http://localhost:3000,"
            "http://127.0.0.1:3000,"
            "http://localhost:5173,"
            "http://127.0.0.1:5173"
        ),
    ).split(",")
    if origin.strip()
]


# Django REST Framework and JWT
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
}


# Email
EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    (
        "django.core.mail.backends.smtp.EmailBackend"
        if os.getenv("EMAIL_HOST")
        else "django.core.mail.backends.console.EmailBackend"
    ),
)
EMAIL_HOST = os.getenv("EMAIL_HOST", "")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
EMAIL_USE_SSL = env_bool("EMAIL_USE_SSL", False)
DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL", "noreply@nexusflow.invalid"
)
