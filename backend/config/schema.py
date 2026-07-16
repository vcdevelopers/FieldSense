def filter_api_endpoints(endpoints, **kwargs):
    """
    Filters the OpenAPI schema to only include field-tracking and auth endpoints.
    """
    filtered = []
    for path, path_regex, method, callback in endpoints:
        if path.startswith('/api/field-tracking/') or path.startswith('/api/auth/') or path.startswith('/api/attendance/') or path.startswith('/api/app-register/'):
            filtered.append((path, path_regex, method, callback))
    return filtered
