import math
import json
from django.core.files.storage import default_storage

def calculate_haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance in meters between two points 
    on the earth (specified in decimal degrees)
    """
    # Convert decimal degrees to radians 
    lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])

    # Haversine formula 
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a)) 
    r = 6371000 # Radius of earth in meters
    return c * r

def process_checklist_report_data(data, request=None):
    """
    Normalizes different payload formats for report_data (flat dict, nested dicts by form_type, or lists)
    and maps file upload parameters (e.g. photo_<field_id>) to the correct checklist field answers.
    """
    report_data_dict = {}
    report_data_is_str = False
    
    if 'report_data' in data:
        if isinstance(data['report_data'], str):
            try:
                report_data_dict = json.loads(data['report_data'])
                report_data_is_str = True
            except:
                report_data_dict = {}
        elif isinstance(data['report_data'], dict):
            # If QueryDict, it might need to be copied or accessed differently, but dict is fine
            report_data_dict = dict(data['report_data'])

    # Normalize list format {"checklists": [{"form_type": "slug", "data": {...}}]} to {"slug": {...}}
    if "checklists" in report_data_dict and isinstance(report_data_dict["checklists"], list):
        normalized = {}
        for checklist in report_data_dict["checklists"]:
            form_type = checklist.get("form_type")
            c_data = checklist.get("data", {})
            if form_type:
                normalized[form_type] = c_data
        report_data_dict = normalized
            
    has_changes = False
    
    def inject_photo_url(d, key, url):
        if isinstance(d, dict):
            for k, v in d.items():
                if k == key:
                    d[k] = url
                    return True
                if isinstance(v, dict):
                    if inject_photo_url(v, key, url):
                        return True
        return False

    for key in list(data.keys()):
        if key.startswith('photo_'):
            file_obj = data.pop(key)
            while isinstance(file_obj, list):
                if not file_obj:
                    file_obj = None
                    break
                file_obj = file_obj[0]
                
            if not file_obj:
                continue

            path = default_storage.save(f'visit_proofs/{file_obj.name}', file_obj)
            url = default_storage.url(path)
            if request:
                url = request.build_absolute_uri(url)
            
            # Try to inject recursively
            if not inject_photo_url(report_data_dict, key, url):
                # If not found in any nested structure, add it at the root level
                report_data_dict[key] = url
                
            has_changes = True
            
    # Also mark has_changes if we normalized from "checklists" list
    if "checklists" in data.get('report_data', '') or (isinstance(data.get('report_data'), dict) and "checklists" in data.get('report_data', {})):
         has_changes = True
            
    if has_changes or report_data_is_str:
        data['report_data'] = json.dumps(report_data_dict) if report_data_is_str else report_data_dict
        
    return data
