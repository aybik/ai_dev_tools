from django.test import TestCase
from django.urls import reverse
from .models import Todo
from datetime import date

class TodoTests(TestCase):

    def setUp(self):
        self.todo = Todo.objects.create(
            title="Test Todo",
            description="Test description",
            due_date=date.today(),
            resolved=False
        )

    # List view
    def test_todo_list_view(self):
        response = self.client.get(reverse('todo_list'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Test Todo")

    # Create view GET
    def test_todo_create_get(self):
        response = self.client.get(reverse('todo_create'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "<form")

    # Create view POST
    def test_todo_create_post(self):
        response = self.client.post(reverse('todo_create'), {
            "title": "New Todo",
            "description": "Something new",
            "due_date": "2025-01-01",
            "resolved": False
        })
        self.assertEqual(response.status_code, 302)  # redirect
        self.assertTrue(Todo.objects.filter(title="New Todo").exists())

    # Edit view GET
    def test_todo_edit_get(self):
        response = self.client.get(reverse('todo_edit', args=[self.todo.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Test Todo")

    # Edit view POST
    def test_todo_edit_post(self):
        response = self.client.post(reverse('todo_edit', args=[self.todo.pk]), {
            "title": "Updated Title",
            "description": self.todo.description,
            "due_date": self.todo.due_date,
            "resolved": False
        })
        self.assertEqual(response.status_code, 302)
        self.todo.refresh_from_db()
        self.assertEqual(self.todo.title, "Updated Title")

    # Resolve
    def test_todo_resolve(self):
        response = self.client.get(reverse('todo_resolve', args=[self.todo.pk]))
        self.assertEqual(response.status_code, 302)
        self.todo.refresh_from_db()
        self.assertTrue(self.todo.resolved)

    # Delete GET
    def test_todo_delete_get(self):
        response = self.client.get(reverse('todo_delete', args=[self.todo.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Delete TODO")

    # Delete POST
    def test_todo_delete_post(self):
        response = self.client.post(reverse('todo_delete', args=[self.todo.pk]))
        self.assertEqual(response.status_code, 302)
        self.assertFalse(Todo.objects.filter(pk=self.todo.pk).exists())

    # String representation
    def test_todo_str(self):
        self.assertEqual(str(self.todo), "Test Todo")
