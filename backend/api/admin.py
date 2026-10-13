from django.contrib import admin

from .models import (
    ActivityLog,
    Attachment,
    Notification,
    Profile,
    Project,
    ProjectMember,
    Task,
    TaskComment,
)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "display_name",
        "timezone",
        "created_at",
    )
    search_fields = (
        "user__username",
        "display_name",
    )


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "owner",
        "status",
        "deadline",
        "created_at",
    )
    list_filter = ("status",)
    search_fields = (
        "name",
        "owner__username",
    )


@admin.register(ProjectMember)
class ProjectMemberAdmin(admin.ModelAdmin):
    list_display = (
        "project",
        "user",
        "role",
        "joined_at",
    )
    list_filter = ("role",)
    search_fields = (
        "project__name",
        "user__username",
    )


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "project",
        "user",
        "assigned_to",
        "status",
        "priority",
        "due_date",
    )
    list_filter = (
        "status",
        "priority",
    )
    search_fields = (
        "title",
        "user__username",
        "assigned_to__username",
    )


@admin.register(TaskComment)
class TaskCommentAdmin(admin.ModelAdmin):
    list_display = (
        "task",
        "user",
        "created_at",
    )
    search_fields = (
        "content",
        "user__username",
    )


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = (
        "task",
        "uploaded_by",
        "uploaded_at",
    )


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "title",
        "notification_type",
        "read",
        "created_at",
    )
    list_filter = (
        "notification_type",
        "read",
    )


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "action",
        "project",
        "task",
        "created_at",
    )
    list_filter = ("action",)