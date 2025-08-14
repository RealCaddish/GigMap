import json
import math

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points in miles."""
    R = 3959  # Earth's radius in miles
    
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c

def check_map_bounds():
    """Check if all venues are within reasonable map bounds."""
    
    # Read the GeoJSON file
    with open('shp/merged_venues_events.geojson', 'r') as f:
        geojson_data = json.load(f)
    
    # Current map center (Lexington)
    lexington_center = [38.0406, -84.5037]
    
    print("🗺️  Map Bounds Analysis")
    print("=" * 50)
    print(f"Current map center: {lexington_center[0]}, {lexington_center[1]} (Lexington, KY)")
    print(f"Current zoom level: 13")
    print()
    
    # Collect all unique venues with their coordinates
    venues = {}
    for feature in geojson_data['features']:
        venue = feature['properties']['Venue']
        coords = feature['geometry']['coordinates']
        if venue not in venues:
            venues[venue] = {
                'lat': coords[1],
                'lon': coords[0],
                'events': []
            }
        venues[venue]['events'].append(feature['properties']['Artist'])
    
    print("📍 Venue Locations and Distances from Lexington:")
    print("-" * 50)
    
    max_distance = 0
    for venue, data in venues.items():
        distance = calculate_distance(
            lexington_center[0], lexington_center[1],
            data['lat'], data['lon']
        )
        max_distance = max(max_distance, distance)
        
        print(f"{venue}:")
        print(f"  Coordinates: {data['lat']:.6f}, {data['lon']:.6f}")
        print(f"  Distance from Lexington: {distance:.1f} miles")
        print(f"  Events: {len(data['events'])}")
        print()
    
    print("📊 Summary:")
    print(f"  - Total venues: {len(venues)}")
    print(f"  - Farthest venue: {max_distance:.1f} miles from Lexington")
    
    # Check if we need to adjust the map view
    if max_distance > 25:  # If any venue is more than 25 miles away
        print(f"\n⚠️  WARNING: Some venues are far from Lexington!")
        print(f"   Consider adjusting the map view to include all venues.")
        
        # Calculate a new center that includes all venues
        all_lats = [data['lat'] for data in venues.values()]
        all_lons = [data['lon'] for data in venues.values()]
        
        new_center_lat = (min(all_lats) + max(all_lats)) / 2
        new_center_lon = (min(all_lons) + max(all_lons)) / 2
        
        print(f"\n💡 Suggested new map center: {new_center_lat:.6f}, {new_center_lon:.6f}")
        print(f"   This would center the map to include all venues.")
        
        # Calculate suggested zoom level
        lat_range = max(all_lats) - min(all_lats)
        lon_range = max(all_lons) - min(all_lons)
        max_range = max(lat_range, lon_range)
        
        if max_range > 0.5:
            suggested_zoom = 9
        elif max_range > 0.2:
            suggested_zoom = 10
        elif max_range > 0.1:
            suggested_zoom = 11
        elif max_range > 0.05:
            suggested_zoom = 12
        else:
            suggested_zoom = 13
            
        print(f"   Suggested zoom level: {suggested_zoom}")
    else:
        print(f"\n✅ All venues are within reasonable distance of Lexington.")
        print(f"   Current map view should show all venues.")

if __name__ == "__main__":
    check_map_bounds()
