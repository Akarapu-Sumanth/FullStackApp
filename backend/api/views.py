from django.contrib.auth.models import User
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

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
from .permissions import (
    IsProjectAdmin,
    IsProjectMember,
    ProjectAccessPermission,
    TaskAccessPermission,
)
from .serializers import (
    ActivityLogSerializer,
    AttachmentSerializer,
    NotificationSerializer,
    ProfileSerializer,
    ProjectMemberSerializer,
    ProjectSerializer,
    RegisterSerializer,
    TaskCommentSerializer,
    TaskSerializer,
    UserSerializer,
)
from .services import create_activity, create_notification, notify_project_members


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok"})


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            User.objects.filter(
                Q(owned_projects__members__user=self.request.user)
                | Q(project_memberships__project__owner=self.request.user)
            )
            .distinct()
            .order_by("username")
        )


class ProfileViewSet(viewsets.ModelViewSet):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Profile.objects.filter(user=self.request.user)

    def get_object(self):
        profile, _ = Profile.objects.get_or_create(
            user=self.request.user,
            defaults={"display_name": self.request.user.username},
        )
        return profile

    def list(self, request, *args, **kwargs):
        profile = self.get_object()
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        profile = self.get_object()
        serializer = self.get_serializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, ProjectAccessPermission]

    def get_queryset(self):
        queryset = Project.objects.filter(
            Q(owner=self.request.user) | Q(members__user=self.request.user)
        ).distinct().select_related("owner").order_by("-created_at")

        search = self.request.query_params.get("search")
        status_value = self.request.query_params.get("status")

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )
        if status_value:
            queryset = queryset.filter(status=status_value)

        return queryset.annotate(
            members_count=Count("members", distinct=True),
            tasks_count=Count("tasks", distinct=True),
        )

    def perform_create(self, serializer):
        project = serializer.save(owner=self.request.user)
        ProjectMember.objects.create(
            project=project,
            user=self.request.user,
            role=ProjectMember.Role.OWNER,
        )
        create_activity(
            user=self.request.user,
            action=ActivityLog.Action.PROJECT_CREATED,
            description=f"Created project '{project.name}'",
            project=project,
        )

    def perform_update(self, serializer):
        project = serializer.save()
        create_activity(
            user=self.request.user,
            action=ActivityLog.Action.PROJECT_UPDATED,
            description=f"Updated project '{project.name}'",
            project=project,
        )
        notify_project_members(
            project=project,
            notification_type=Notification.NotificationType.PROJECT_UPDATE,
            title="Project updated",
            message=f"Project '{project.name}' was updated.",
            exclude_user=self.request.user,
        )

    def perform_destroy(self, instance):
        create_activity(
            user=self.request.user,
            action=ActivityLog.Action.PROJECT_ARCHIVED,
            description=f"Archived project '{instance.name}'",
            project=instance,
        )
        instance.delete()

    @action(detail=True, methods=["get", "post", "delete"], permission_classes=[IsAuthenticated, IsProjectMember])
    def members(self, request, pk=None):
        project = self.get_object()

        if request.method in ["POST", "DELETE"]:
            if not IsProjectAdmin().has_object_permission(request, self, project):
                self.permission_denied(request, message="Only admins can manage project members.")

            serializer = ProjectMemberSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.validated_data["user"]

            if request.method == "DELETE":
                if user.id == project.owner_id:
                    return Response(
                        {"detail": "The project owner cannot be removed."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                deleted, _ = project.members.filter(user=user).delete()
                if not deleted:
                    return Response(status=status.HTTP_404_NOT_FOUND)
                return Response(status=status.HTTP_204_NO_CONTENT)

            role = serializer.validated_data.get("role", ProjectMember.Role.MEMBER)

            if role == ProjectMember.Role.OWNER and user.id != project.owner_id:
                return Response(
                    {"role": "Only the project owner can hold the owner role."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            membership, created = ProjectMember.objects.get_or_create(
                project=project,
                user=user,
                defaults={"role": role},
            )
            if not created:
                membership.role = role
                membership.save(update_fields=["role"])

            create_notification(
                user=user,
                notification_type=Notification.NotificationType.PROJECT_INVITE,
                title="Added to project",
                message=f"You were added to '{project.name}'.",
                project=project,
            )
            return Response(
                ProjectMemberSerializer(membership).data,
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
            )

        memberships = project.members.select_related("user")
        return Response(ProjectMemberSerializer(memberships, many=True).data)


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated, TaskAccessPermission]

    def get_queryset(self):
        queryset = Task.objects.filter(
            Q(user=self.request.user)
            | Q(assigned_to=self.request.user)
            | Q(project__owner=self.request.user)
            | Q(project__members__user=self.request.user)
        ).distinct().select_related("user", "assigned_to", "project").order_by("-created_at")

        project_id = self.request.query_params.get("project")
        status_value = self.request.query_params.get("status")
        priority_value = self.request.query_params.get("priority")
        assigned_to = self.request.query_params.get("assigned_to")
        due_date = self.request.query_params.get("due_date")
        search = self.request.query_params.get("search")
        ordering = self.request.query_params.get("ordering")

        if project_id:
            queryset = queryset.filter(project_id=project_id)
        if status_value:
            queryset = queryset.filter(status=status_value)
        if priority_value:
            queryset = queryset.filter(priority=priority_value)
        if assigned_to:
            queryset = queryset.filter(assigned_to_id=assigned_to)
        if due_date:
            queryset = queryset.filter(due_date__date=due_date)
        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(description__icontains=search))

        if ordering in ["-created_at", "created_at", "-due_date", "due_date", "priority", "status"]:
            queryset = queryset.order_by(ordering)

        return queryset

    def perform_create(self, serializer):
        task = serializer.save(user=self.request.user)
        create_activity(
            user=self.request.user,
            action=ActivityLog.Action.TASK_CREATED,
            description=f"Created task '{task.title}'",
            project=task.project,
            task=task,
        )
        if task.assigned_to:
            create_notification(
                user=task.assigned_to,
                notification_type=Notification.NotificationType.TASK_ASSIGNED,
                title="Task assigned",
                message=f"You were assigned '{task.title}'.",
                project=task.project,
                task=task,
            )

    def perform_update(self, serializer):
        previous_status = serializer.instance.status
        task = serializer.save()
        create_activity(
            user=self.request.user,
            action=ActivityLog.Action.TASK_UPDATED,
            description=f"Updated task '{task.title}'",
            project=task.project,
            task=task,
        )
        if previous_status != Task.Status.COMPLETED and task.status == Task.Status.COMPLETED:
            create_activity(
                user=self.request.user,
                action=ActivityLog.Action.TASK_COMPLETED,
                description=f"Completed task '{task.title}'",
                project=task.project,
                task=task,
            )
            if task.user_id != self.request.user.id:
                create_notification(
                    user=task.user,
                    notification_type=Notification.NotificationType.TASK_COMPLETED,
                    title="Task completed",
                    message=f"'{task.title}' was completed.",
                    project=task.project,
                    task=task,
                )


class TaskCommentViewSet(viewsets.ModelViewSet):
    serializer_class = TaskCommentSerializer
    permission_classes = [IsAuthenticated, TaskAccessPermission]

    def get_queryset(self):
        return TaskComment.objects.filter(
            Q(task__user=self.request.user)
            | Q(task__assigned_to=self.request.user)
            | Q(task__project__owner=self.request.user)
            | Q(task__project__members__user=self.request.user)
        ).distinct().select_related("user", "task")

    def perform_create(self, serializer):
        task = get_object_or_404(Task, id=self.request.data.get("task"))
        self.check_object_permissions(self.request, task)
        serializer.save(user=self.request.user, task=task)
        create_activity(
            user=self.request.user,
            action=ActivityLog.Action.COMMENT_CREATED,
            description=f"Commented on '{task.title}'",
            project=task.project,
            task=task,
        )
        recipients = set()
        if task.user_id != self.request.user.id:
            recipients.add(task.user)
        if task.assigned_to and task.assigned_to_id != self.request.user.id:
            recipients.add(task.assigned_to)
        for recipient in recipients:
            create_notification(
                user=recipient,
                notification_type=Notification.NotificationType.COMMENT,
                title="New task comment",
                message=f"{self.request.user.username} commented on '{task.title}'.",
                project=task.project,
                task=task,
            )


class AttachmentViewSet(viewsets.ModelViewSet):
    serializer_class = AttachmentSerializer
    permission_classes = [IsAuthenticated, TaskAccessPermission]

    def get_queryset(self):
        return Attachment.objects.filter(
            Q(task__user=self.request.user)
            | Q(task__assigned_to=self.request.user)
            | Q(task__project__owner=self.request.user)
            | Q(task__project__members__user=self.request.user)
        ).distinct()

    def perform_create(self, serializer):
        task = serializer.validated_data["task"]
        self.check_object_permissions(self.request, task)
        attachment = serializer.save(uploaded_by=self.request.user)
        create_activity(
            user=self.request.user,
            action=ActivityLog.Action.FILE_UPLOADED,
            description=f"Uploaded file for '{attachment.task.title}'",
            project=attachment.task.project,
            task=attachment.task,
        )


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Notification.objects.filter(user=self.request.user).select_related("project", "task")
        read_status = self.request.query_params.get("read")
        if read_status is not None:
            queryset = queryset.filter(read=read_status.lower() == "true")
        return queryset.order_by("-created_at")

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.read = True
        notification.save(update_fields=["read"])
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        updated = self.get_queryset().filter(read=False).update(read=True)
        return Response({"message": "Notifications marked as read.", "updated": updated})


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ActivityLog.objects.filter(
            Q(user=self.request.user)
            | Q(project__owner=self.request.user)
            | Q(project__members__user=self.request.user)
        ).distinct().select_related("user", "project", "task").order_by("-created_at")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def analytics(request):
    user = request.user
    project_filter = Q(owner=user) | Q(members__user=user)
    projects = Project.objects.filter(project_filter).distinct()
    tasks = Task.objects.filter(
        Q(user=user) | Q(assigned_to=user) | Q(project__owner=user) | Q(project__members__user=user)
    ).distinct()

    total_tasks = tasks.count()
    completed_tasks = tasks.filter(status=Task.Status.COMPLETED).count()
    pending_tasks = total_tasks - completed_tasks
    overdue_tasks = tasks.filter(due_date__lt=timezone.now()).exclude(status=Task.Status.COMPLETED).count()
    completion_rate = round((completed_tasks / total_tasks) * 100, 2) if total_tasks else 0

    return Response(
        {
            "projects": {
                "total": projects.count(),
                "active": projects.filter(status=Project.Status.ACTIVE).count(),
                "completed": projects.filter(status=Project.Status.COMPLETED).count(),
            },
            "tasks": {
                "total": total_tasks,
                "completed": completed_tasks,
                "pending": pending_tasks,
                "overdue": overdue_tasks,
                "completion_rate": completion_rate,
            },
            "task_status_distribution": {
                status_value: tasks.filter(status=status_value).count()
                for status_value, _ in Task.Status.choices
            },
            "task_priority_distribution": {
                priority_value: tasks.filter(priority=priority_value).count()
                for priority_value, _ in Task.Priority.choices
            },
            "project_status_distribution": {
                status_value: projects.filter(status=status_value).count()
                for status_value, _ in Project.Status.choices
            },
        }
    )