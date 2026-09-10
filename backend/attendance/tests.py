from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone

class AttendanceAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='test_emp', password='password123')
        self.client.force_authenticate(user=self.user)

    def test_check_in_and_check_out_flow(self):
        # 1. Check in
        payload = {
            "lat": 19.178520,
            "lng": 72.834590,
            "address": "Malad West, Mumbai"
        }
        res = self.client.post('/api/attendance/check-in/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('check_in_time', res.data)

        # 2. Get today's attendance
        res_today = self.client.get('/api/attendance/today/')
        self.assertEqual(res_today.status_code, status.HTTP_200_OK)
        self.assertEqual(res_today.data['check_in_address'], "Malad West, Mumbai")

        # 3. Check out
        out_payload = {
            "lat": 19.178530,
            "lng": 72.834600,
            "address": "Malad West, Mumbai"
        }
        res_out = self.client.post('/api/attendance/check-out/', out_payload, format='json')
        self.assertEqual(res_out.status_code, status.HTTP_200_OK)
        self.assertIn('check_out_time', res_out.data)

