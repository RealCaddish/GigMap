import json
import re

def fix_geojson():
    """Fix JSON syntax errors in the GeoJSON file."""
    
    print("🔧 Fixing GeoJSON syntax errors...")
    
    # Read the GeoJSON file as text first
    with open('shp/merged_venues_events.geojson', 'r') as f:
        content = f.read()
    
    # Replace NaN with null
    content = re.sub(r':\s*NaN', ': null', content)
    
    # Write the fixed content back
    with open('shp/merged_venues_events.geojson', 'w') as f:
        f.write(content)
    
    # Verify the JSON is valid
    try:
        with open('shp/merged_venues_events.geojson', 'r') as f:
            json.load(f)
        print("✅ GeoJSON file fixed and validated!")
    except json.JSONDecodeError as e:
        print(f"❌ JSON still has errors: {e}")
        return False
    
    return True

if __name__ == "__main__":
    fix_geojson()
