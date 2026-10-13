from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    ActivityLogViewSet,
    AttachmentViewSet,
    NotificationViewSet,
    ProfileViewSet,
    ProjectViewSet,
    TaskCommentViewSet,
    TaskViewSet,
    UserViewSet,
    analytics,
    health_check,
    register,
)


router = DefaultRouter()

router.register(
    "users",
    UserViewSet,
    basename="users",
)

router.register(
    "projects",
    ProjectViewSet,
    basename="projects",
)

router.register(
    "tasks",
    TaskViewSet,
    basename="tasks",
)

router.register(
    "comments",
    TaskCommentViewSet,
    basename="comments",
)

router.register(
    "attachments",
    AttachmentViewSet,
    basename="attachments",
)

router.register(
    "notifications",
    NotificationViewSet,
    basename="notifications",
)

router.register(
    "activity",
    ActivityLogViewSet,
    basename="activity",
)


urlpatterns = [
    path(
        "health/",
        health_check,
        name="health-check",
    ),
    path(
        "profile/",
        ProfileViewSet.as_view({"get": "list", "patch": "partial_update"}),
        name="profile",
    ),
    path(
        "auth/register/",
        register,
        name="register",
    ),
    path(
        "analytics/",
        analytics,
        name="analytics",
    ),
]

urlpatterns += router.urls