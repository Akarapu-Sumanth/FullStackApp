from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from api.serializers import SafeTokenRefreshSerializer


class SafeTokenRefreshView(TokenRefreshView):
    serializer_class = SafeTokenRefreshSerializer


urlpatterns = [
    path("admin/", admin.site.urls),

    path("api/", include("api.urls")),

    path(
        "api/auth/login/",
        TokenObtainPairView.as_view(),
        name="token-obtain",
    ),

    path(
        "api/auth/refresh/",
        SafeTokenRefreshView.as_view(),
        name="token-refresh",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)