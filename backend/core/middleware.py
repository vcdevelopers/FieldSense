class SecurityHeadersMiddleware:
    """
    Sets security headers on FieldSense responses.
    Restricts iframe embedding to Logicon's exact origin via CSP frame-ancestors.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response['X-Frame-Options'] = 'ALLOW-FROM http://localhost:5173'
        response['Content-Security-Policy'] = "frame-ancestors 'self' http://localhost:5173 http://127.0.0.1:5173 http://localhost:8001 http://127.0.0.1:8001"
        return response
