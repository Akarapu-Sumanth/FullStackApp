from .models import (
    ActivityLog,
    Notification,
    ProjectMember,
)


def create_activity(
    *,
    user,
    action,
    description,
    project=None,
    task=None,
):
    return ActivityLog.objects.create(
        user=user,
        action=action,
        description=description,
        project=project,
        task=task,
    )


def create_notification(
    *,
    user,
    notification_type,
    title,
    message,
    project=None,
    task=None,
):
    return Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        message=message,
        project=project,
        task=task,
    )


def notify_project_members(
    *,
    project,
    notification_type,
    title,
    message,
    exclude_user=None,
    task=None,
):
    memberships = ProjectMember.objects.filter(
        project=project
    ).select_related("user")

    notifications = []

    for membership in memberships:
        if (
            exclude_user
            and membership.user_id == exclude_user.id
        ):
            continue

        notifications.append(
            Notification(
                user=membership.user,
                notification_type=notification_type,
                title=title,
                message=message,
                project=project,
                task=task,
            )
        )

    if notifications:
        Notification.objects.bulk_create(
            notifications
        )