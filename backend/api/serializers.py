from django.contrib.auth.models import User
from PIL import Image, UnidentifiedImageError
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.serializers import TokenRefreshSerializer

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


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
        ]
        read_only_fields = ["id"]


class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Profile
        fields = [
            "id",
            "user",
            "display_name",
            "bio",
            "avatar",
            "timezone",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "created_at",
            "updated_at",
        ]

    def validate_avatar(self, avatar):
        max_size = 5 * 1024 * 1024
        if avatar.size > max_size:
            raise serializers.ValidationError("Avatar images must be 5 MB or smaller.")

        try:
            with Image.open(avatar) as image:
                if image.format not in {"JPEG", "PNG", "WEBP"}:
                    raise serializers.ValidationError("Use a JPEG, PNG, or WebP image.")
                if image.width > 4096 or image.height > 4096:
                    raise serializers.ValidationError("Avatar dimensions must not exceed 4096 by 4096 pixels.")
                image.verify()
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as error:
            raise serializers.ValidationError("The uploaded file is not a valid image.") from error
        finally:
            avatar.seek(0)

        return avatar


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["username", "email", "password"]

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )
        Profile.objects.create(user=user, display_name=user.username)
        return user


class SafeTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        try:
            return super().validate(attrs)
        except User.DoesNotExist as error:
            raise InvalidToken("The refresh token user no longer exists.") from error


class ProjectMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        source="user",
        queryset=User.objects.all(),
        write_only=True,
        required=False,
    )
    username = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = ProjectMember
        fields = ["id", "user", "user_id", "username", "role", "joined_at"]
        read_only_fields = ["id", "user", "joined_at"]

    def validate(self, attrs):
        username = attrs.pop("username", None)
        user = attrs.get("user")

        if username:
            try:
                username_user = User.objects.get(username__iexact=username.strip())
            except User.DoesNotExist as error:
                raise serializers.ValidationError({"username": "No user with this username was found."}) from error

            if user and user != username_user:
                raise serializers.ValidationError("Provide either a username or user ID, not both.")
            user = username_user

        if not user:
            raise serializers.ValidationError({"username": "Enter the username of the person to invite."})

        attrs["user"] = user
        return attrs


class ProjectSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    members_count = serializers.IntegerField(source="members.count", read_only=True)
    tasks_count = serializers.IntegerField(source="tasks.count", read_only=True)
    completed_tasks_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "owner",
            "name",
            "description",
            "status",
            "deadline",
            "members_count",
            "tasks_count",
            "completed_tasks_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "owner",
            "members_count",
            "tasks_count",
            "completed_tasks_count",
            "created_at",
            "updated_at",
        ]

    def get_completed_tasks_count(self, obj):
        return obj.tasks.filter(status=Task.Status.COMPLETED).count()


class TaskSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)
    project = ProjectSerializer(read_only=True)
    project_id = serializers.PrimaryKeyRelatedField(
        source="project",
        queryset=Project.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        source="assigned_to",
        queryset=User.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    completed = serializers.SerializerMethodField(read_only=True)
    completed_input = serializers.BooleanField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "project",
            "project_id",
            "user",
            "title",
            "description",
            "assigned_to",
            "assigned_to_id",
            "priority",
            "status",
            "completed",
            "completed_input",
            "due_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "project",
            "assigned_to",
            "created_at",
            "updated_at",
        ]

    def get_completed(self, obj):
        return obj.completed

    def validate(self, attrs):
        completed = attrs.pop("completed_input", None)
        if completed is True:
            attrs["status"] = Task.Status.COMPLETED
        elif completed is False and attrs.get("status") == Task.Status.COMPLETED:
            attrs["status"] = Task.Status.TODO

        project = attrs.get("project", getattr(self.instance, "project", None))
        assigned_to = attrs.get("assigned_to", getattr(self.instance, "assigned_to", None))
        request = self.context.get("request")

        if project and request:
            membership = ProjectMember.objects.filter(
                project=project,
                user=request.user,
            ).first()
            if project.owner_id != request.user.id and not membership:
                raise ValidationError({"project_id": "You must belong to this project to add tasks."})

            if (
                request.method not in ("GET", "HEAD", "OPTIONS")
                and membership
                and membership.role == ProjectMember.Role.VIEWER
            ):
                raise ValidationError({"project_id": "Viewers cannot create or edit project tasks."})

            if assigned_to:
                assignee_is_member = ProjectMember.objects.filter(
                    project=project,
                    user=assigned_to,
                ).exists()
                if project.owner_id != assigned_to.id and not assignee_is_member:
                    raise ValidationError({"assigned_to_id": "The assignee must belong to this project."})

        return attrs


class TaskCommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = TaskComment
        fields = ["id", "task", "user", "content", "created_at", "updated_at"]
        read_only_fields = ["id", "user", "created_at", "updated_at"]


class AttachmentSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)

    class Meta:
        model = Attachment
        fields = ["id", "task", "uploaded_by", "file", "uploaded_at"]
        read_only_fields = ["id", "uploaded_by", "uploaded_at"]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "title",
            "message",
            "read",
            "project",
            "task",
            "created_at",
        ]
        read_only_fields = ["id", "notification_type", "title", "message", "project", "task", "created_at"]


class ActivityLogSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = ActivityLog
        fields = [
            "id",
            "user",
            "action",
            "description",
            "project",
            "task",
            "created_at",
        ]
        read_only_fields = ["id", "user", "action", "description", "project", "task", "created_at"]