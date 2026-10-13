from io import BytesIO
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import ActivityLog, Notification, Profile, Project, ProjectMember, Task

User = get_user_model()


class NexusFlowAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alpha", email="alpha@example.com", password="StrongPass123")
        self.client.force_authenticate(user=self.user)

    def test_health_endpoint(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ok")

    def test_register_and_login_flow(self):
        self.client.logout()
        register_response = self.client.post(
            "/api/auth/register/",
            {"username": "beta", "email": "beta@example.com", "password": "StrongPass123"},
            format="json",
        )
        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", register_response.data)
        self.assertIn("refresh", register_response.data)

        login_response = self.client.post(
            "/api/auth/login/",
            {"username": "beta", "password": "StrongPass123"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", login_response.data)

    def test_refresh_for_deleted_user_returns_unauthorized(self):
        refresh_token = str(RefreshToken.for_user(self.user))
        self.user.delete()

        response = self.client.post(
            "/api/auth/refresh/",
            {"refresh": refresh_token},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_access_and_update(self):
        response = self.client.get("/api/profile/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        patch_response = self.client.patch(
            "/api/profile/",
            {"display_name": "Alpha User", "bio": "Team lead"},
            format="json",
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_response.data["display_name"], "Alpha User")

    def test_profile_avatar_upload_validates_and_persists_image(self):
        image_data = BytesIO()
        Image.new("RGB", (24, 24), color="navy").save(image_data, format="PNG")
        valid_avatar = SimpleUploadedFile(
            "avatar.png",
            image_data.getvalue(),
            content_type="image/png",
        )

        with tempfile.TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                response = self.client.patch(
                    "/api/profile/",
                    {"avatar": valid_avatar},
                    format="multipart",
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertIn("avatar.png", response.data["avatar"])
                self.assertTrue(Profile.objects.get(user=self.user).avatar.storage.exists("avatars/avatar.png"))

        invalid_avatar = SimpleUploadedFile(
            "fake.png",
            b"not an image",
            content_type="image/png",
        )
        invalid_response = self.client.patch(
            "/api/profile/",
            {"avatar": invalid_avatar},
            format="multipart",
        )
        self.assertEqual(invalid_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("avatar", invalid_response.data)

        oversized_avatar = SimpleUploadedFile(
            "oversized.png",
            b"0" * (5 * 1024 * 1024 + 1),
            content_type="image/png",
        )
        oversized_response = self.client.patch(
            "/api/profile/",
            {"avatar": oversized_avatar},
            format="multipart",
        )
        self.assertEqual(oversized_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_project_and_task_creation(self):
        project_response = self.client.post(
            "/api/projects/",
            {"name": "Launch", "description": "Q4 launch", "status": "ACTIVE"},
            format="json",
        )
        self.assertEqual(project_response.status_code, status.HTTP_201_CREATED)
        project_id = project_response.data["id"]

        task_response = self.client.post(
            "/api/tasks/",
            {"project_id": project_id, "title": "Ship homepage", "priority": "HIGH", "status": "TODO"},
            format="json",
        )
        self.assertEqual(task_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(task_response.data["id"])

    def test_task_filtering_and_project_member_access(self):
        project = Project.objects.create(owner=self.user, name="Research", status=Project.Status.ACTIVE)
        ProjectMember.objects.create(project=project, user=self.user, role=ProjectMember.Role.OWNER)
        Task.objects.create(project=project, user=self.user, title="Prototype", status=Task.Status.IN_PROGRESS, priority=Task.Priority.HIGH)

        list_response = self.client.get("/api/tasks/?project=%s&status=IN_PROGRESS" % project.id)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data[0]["title"], "Prototype")

    def test_task_assignee_and_due_date_filters(self):
        assigned_task = Task.objects.create(
            user=self.user,
            assigned_to=self.user,
            title="Due today",
            due_date="2030-01-02T12:00:00Z",
        )
        Task.objects.create(
            user=self.user,
            title="Different date",
            due_date="2030-01-03T12:00:00Z",
        )

        response = self.client.get(
            f"/api/tasks/?assigned_to={self.user.id}&due_date=2030-01-02"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in response.data], [assigned_task.id])

    def test_notifications_and_analytics(self):
        project = Project.objects.create(owner=self.user, name="Ops", status=Project.Status.ACTIVE)
        ProjectMember.objects.create(project=project, user=self.user, role=ProjectMember.Role.OWNER)
        Task.objects.create(project=project, user=self.user, title="QA pass", status=Task.Status.COMPLETED, priority=Task.Priority.MEDIUM)
        Notification.objects.create(user=self.user, notification_type=Notification.NotificationType.TASK_COMPLETED, title="Task completed", message="Done")
        ActivityLog.objects.create(user=self.user, action=ActivityLog.Action.TASK_COMPLETED, description="Logged task completion", project=project)

        notifications_response = self.client.get("/api/notifications/")
        self.assertEqual(notifications_response.status_code, status.HTTP_200_OK)
        analytics_response = self.client.get("/api/analytics/")
        self.assertEqual(analytics_response.status_code, status.HTTP_200_OK)
        self.assertIn("projects", analytics_response.data)
        self.assertIn("tasks", analytics_response.data)

    def test_jwt_refresh_protected_access_and_data_persistence(self):
        self.client.logout()
        login_response = self.client.post(
            "/api/auth/login/",
            {"username": "alpha", "password": "StrongPass123"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)

        refresh_response = self.client.post(
            "/api/auth/refresh/",
            {"refresh": login_response.data["refresh"]},
            format="json",
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        access_token = refresh_response.data["access"]

        protected_client = self.client_class()
        protected_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        project_response = protected_client.post(
            "/api/projects/",
            {"name": "Persisted project", "status": "ACTIVE"},
            format="json",
        )
        self.assertEqual(project_response.status_code, status.HTTP_201_CREATED)
        project_id = project_response.data["id"]

        task_response = protected_client.post(
            "/api/tasks/",
            {
                "project_id": project_id,
                "title": "Persisted task",
                "priority": "CRITICAL",
                "status": "IN_PROGRESS",
            },
            format="json",
        )
        self.assertEqual(task_response.status_code, status.HTTP_201_CREATED)

        persisted_projects = protected_client.get("/api/projects/")
        persisted_tasks = protected_client.get("/api/tasks/?priority=CRITICAL")
        self.assertEqual(persisted_projects.status_code, status.HTTP_200_OK)
        self.assertEqual(persisted_tasks.status_code, status.HTTP_200_OK)
        self.assertEqual(persisted_projects.data[0]["id"], project_id)
        self.assertEqual(persisted_tasks.data[0]["title"], "Persisted task")

        protected_client.credentials()
        self.assertEqual(protected_client.get("/api/profile/").status_code, status.HTTP_401_UNAUTHORIZED)

    def test_project_and_task_data_are_isolated_between_users(self):
        project = Project.objects.create(owner=self.user, name="Private project")
        task = Task.objects.create(
            project=project,
            user=self.user,
            title="Private task",
        )
        notification = Notification.objects.create(
            user=self.user,
            notification_type=Notification.NotificationType.TASK_COMPLETED,
            title="Private notification",
            message="Private message",
        )
        ActivityLog.objects.create(
            user=self.user,
            action=ActivityLog.Action.TASK_CREATED,
            description="Private activity",
            project=project,
            task=task,
        )

        other_user = User.objects.create_user(username="beta", password="StrongPass123")
        self.client.force_authenticate(user=other_user)

        self.assertEqual(self.client.get("/api/projects/").data, [])
        self.assertEqual(self.client.get("/api/tasks/").data, [])
        self.assertEqual(self.client.get("/api/notifications/").data, [])
        self.assertEqual(self.client.get("/api/activity/").data, [])
        self.assertEqual(self.client.get(f"/api/projects/{project.id}/").status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(f"/api/tasks/{task.id}/").status_code, status.HTTP_404_NOT_FOUND)
        self.assertNotEqual(notification.user_id, other_user.id)

        comment_response = self.client.post(
            "/api/comments/",
            {"task": task.id, "content": "Unauthorized comment"},
            format="json",
        )
        self.assertEqual(comment_response.status_code, status.HTTP_403_FORBIDDEN)

        attachment_response = self.client.post(
            "/api/attachments/",
            {
                "task": task.id,
                "file": SimpleUploadedFile("private.pdf", b"private", content_type="application/pdf"),
            },
            format="multipart",
        )
        self.assertEqual(attachment_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_project_member_roles_control_project_writes(self):
        project = Project.objects.create(owner=self.user, name="Role-restricted project")
        ProjectMember.objects.create(
            project=project,
            user=self.user,
            role=ProjectMember.Role.OWNER,
        )
        viewer = User.objects.create_user(username="viewer", password="StrongPass123")
        ProjectMember.objects.create(
            project=project,
            user=viewer,
            role=ProjectMember.Role.VIEWER,
        )
        self.client.force_authenticate(user=viewer)

        self.assertEqual(self.client.get(f"/api/projects/{project.id}/").status_code, status.HTTP_200_OK)
        self.assertEqual(
            self.client.patch(
                f"/api/projects/{project.id}/",
                {"name": "Unauthorized edit"},
                format="json",
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(self.client.delete(f"/api/projects/{project.id}/").status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            self.client.post(
                f"/api/projects/{project.id}/members/",
                {"username": self.user.username, "role": "MEMBER"},
                format="json",
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.client.force_authenticate(user=self.user)
        owner_role_response = self.client.post(
            f"/api/projects/{project.id}/members/",
            {"username": viewer.username, "role": "OWNER"},
            format="json",
        )
        self.assertEqual(owner_role_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_project_admin_can_invite_unlisted_username(self):
        project = Project.objects.create(owner=self.user, name="Invite project")
        ProjectMember.objects.create(project=project, user=self.user, role=ProjectMember.Role.OWNER)
        invited_user = User.objects.create_user(username="invited", password="StrongPass123")

        response = self.client.post(
            f"/api/projects/{project.id}/members/",
            {"username": invited_user.username, "role": "MEMBER"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"]["username"], invited_user.username)
        self.assertTrue(ProjectMember.objects.filter(project=project, user=invited_user).exists())

        missing_user_response = self.client.post(
            f"/api/projects/{project.id}/members/",
            {"username": "unknown-user", "role": "MEMBER"},
            format="json",
        )
        self.assertEqual(missing_user_response.status_code, status.HTTP_400_BAD_REQUEST)

        remove_response = self.client.delete(
            f"/api/projects/{project.id}/members/",
            {"username": invited_user.username},
            format="json",
        )
        self.assertEqual(remove_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ProjectMember.objects.filter(project=project, user=invited_user).exists())

        remove_owner_response = self.client.delete(
            f"/api/projects/{project.id}/members/",
            {"username": self.user.username},
            format="json",
        )
        self.assertEqual(remove_owner_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_task_membership_assignment_and_update_permissions(self):
        project = Project.objects.create(owner=self.user, name="Team project")
        ProjectMember.objects.create(project=project, user=self.user, role=ProjectMember.Role.OWNER)
        member = User.objects.create_user(username="member", password="StrongPass123")
        ProjectMember.objects.create(project=project, user=member, role=ProjectMember.Role.MEMBER)
        outsider = User.objects.create_user(username="outsider", password="StrongPass123")

        invalid_assignment = self.client.post(
            "/api/tasks/",
            {
                "project_id": project.id,
                "assigned_to_id": outsider.id,
                "title": "Invalid assignment",
            },
            format="json",
        )
        self.assertEqual(invalid_assignment.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("assigned_to_id", invalid_assignment.data)

        create_response = self.client.post(
            "/api/tasks/",
            {
                "project_id": project.id,
                "assigned_to_id": member.id,
                "title": "Member task",
                "priority": "HIGH",
                "status": "TODO",
                "due_date": "2030-01-02T12:00:00Z",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        task_id = create_response.data["id"]

        self.client.force_authenticate(user=member)
        update_response = self.client.patch(
            f"/api/tasks/{task_id}/",
            {"status": "COMPLETED", "priority": "CRITICAL"},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertTrue(update_response.data["completed"])

        viewer = User.objects.create_user(username="viewer", password="StrongPass123")
        ProjectMember.objects.create(project=project, user=viewer, role=ProjectMember.Role.VIEWER)
        self.client.force_authenticate(user=viewer)
        viewer_create_response = self.client.post(
            "/api/tasks/",
            {"project_id": project.id, "title": "Viewer cannot create"},
            format="json",
        )
        self.assertEqual(viewer_create_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("project_id", viewer_create_response.data)

        self.client.force_authenticate(user=outsider)
        self.assertEqual(self.client.get(f"/api/tasks/{task_id}/").status_code, status.HTTP_404_NOT_FOUND)

    def test_notification_mark_read_actions_are_scoped_to_user(self):
        notification = Notification.objects.create(
            user=self.user,
            notification_type=Notification.NotificationType.TASK_COMPLETED,
            title="Task complete",
            message="Done",
        )
        other_user = User.objects.create_user(username="beta", password="StrongPass123")
        other_notification = Notification.objects.create(
            user=other_user,
            notification_type=Notification.NotificationType.TASK_COMPLETED,
            title="Other task",
            message="Not yours",
        )

        unread_response = self.client.get("/api/notifications/?read=false")
        self.assertEqual(unread_response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in unread_response.data], [notification.id])

        response = self.client.post(f"/api/notifications/{notification.id}/mark_read/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["read"])
        self.assertEqual(self.client.get("/api/notifications/?read=false").data, [])

        second_notification = Notification.objects.create(
            user=self.user,
            notification_type=Notification.NotificationType.DEADLINE,
            title="Deadline",
            message="Due soon",
        )

        mark_all_response = self.client.post("/api/notifications/mark_all_read/")
        self.assertEqual(mark_all_response.status_code, status.HTTP_200_OK)
        self.assertEqual(mark_all_response.data["updated"], 1)
        self.assertEqual(len(self.client.get("/api/notifications/?read=true").data), 2)
        second_notification.refresh_from_db()
        self.assertTrue(second_notification.read)
        other_notification.refresh_from_db()
        self.assertFalse(other_notification.read)
        self.assertEqual(
            self.client.post(f"/api/notifications/{other_notification.id}/mark_read/").status_code,
            status.HTTP_404_NOT_FOUND,
        )
