import json

def test_geojson():
    """Test if the GeoJSON file is valid JSON."""
    
    try:
        with open('shp/merged_venues_events.geojson', 'r') as f:
            data = json.load(f)
        
        print("✅ GeoJSON file is valid JSON!")
        print(f"📊 File contains {len(data['features'])} features")
        
        # Check for any problematic values
        for i, feature in enumerate(data['features']):
            props = feature['properties']
            for key, value in props.items():
                if value == 'NaN' or (isinstance(value, float) and str(value) == 'nan'):
                    print(f"⚠️  Warning: Feature {i} has NaN value in {key}")
        
        print("✅ No NaN values found!")
        return True
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON Error: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    test_geojson()
