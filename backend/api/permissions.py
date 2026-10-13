from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import ProjectMember


class IsProjectMember(BasePermission):
    """
    Allows access when the authenticated user belongs
    to the project.
    """

    def has_object_permission(
        self,
        request,
        view,
        obj,
    ):
        project = obj

        if hasattr(obj, "project"):
            project = obj.project

        if project.owner_id == request.user.id:
            return True

        return ProjectMember.objects.filter(
            project=project,
            user=request.user,
        ).exists()


class IsProjectAdmin(BasePermission):
    """
    Allows project owner/admin users to modify
    project-level resources.
    """

    def has_object_permission(
        self,
        request,
        view,
        obj,
    ):
        project = obj

        if hasattr(obj, "project"):
            project = obj.project

        if project.owner_id == request.user.id:
            return True

        return ProjectMember.objects.filter(
            project=project,
            user=request.user,
            role__in=[
                ProjectMember.Role.OWNER,
                ProjectMember.Role.ADMIN,
            ],
        ).exists()


class ProjectAccessPermission(BasePermission):
    def has_object_permission(self, request, view, project):
        if project.owner_id == request.user.id:
            return True

        membership = ProjectMember.objects.filter(
            project=project,
            user=request.user,
        ).first()

        if not membership:
            return False

        if request.method in SAFE_METHODS:
            return True

        return membership.role in [
            ProjectMember.Role.OWNER,
            ProjectMember.Role.ADMIN,
        ]


class TaskAccessPermission(BasePermission):
    def has_object_permission(self, request, view, task):
        if hasattr(task, "task"):
            task = task.task

        if task.project_id is None:
            return task.user_id == request.user.id or task.assigned_to_id == request.user.id

        if task.project.owner_id == request.user.id:
            return True

        membership = ProjectMember.objects.filter(
            project=task.project,
            user=request.user,
        ).first()

        if not membership:
            return False

        if request.method in SAFE_METHODS:
            return True

        return membership.role in [
            ProjectMember.Role.OWNER,
            ProjectMember.Role.ADMIN,
            ProjectMember.Role.MEMBER,
        ]