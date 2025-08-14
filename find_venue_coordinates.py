import requests
import time
import json

def geocode_venue(venue_name, city="Lexington, KY"):
    """Geocode a venue name to get coordinates."""
    
    # Try different search variations
    search_queries = [
        f"{venue_name}, {city}",
        f"{venue_name} Lexington KY",
        f"{venue_name} Kentucky"
    ]
    
    for query in search_queries:
        try:
            # Use Nominatim (OpenStreetMap) geocoding service
            url = "https://nominatim.openstreetmap.org/search"
            params = {
                'q': query,
                'format': 'json',
                'limit': 1,
                'addressdetails': 1
            }
            
            response = requests.get(url, params=params, headers={
                'User-Agent': 'GigMap Venue Geocoder'
            })
            
            if response.status_code == 200:
                results = response.json()
                if results:
                    result = results[0]
                    lat = float(result['lat'])
                    lon = float(result['lon'])
                    display_name = result['display_name']
                    
                    print(f"✅ Found coordinates for '{venue_name}':")
                    print(f"   Latitude: {lat}")
                    print(f"   Longitude: {lon}")
                    print(f"   Address: {display_name}")
                    print()
                    
                    return {
                        'venue': venue_name,
                        'lat': lat,
                        'lon': lon,
                        'address': display_name
                    }
            
            # Be respectful to the geocoding service
            time.sleep(1)
            
        except Exception as e:
            print(f"❌ Error geocoding '{venue_name}': {e}")
            continue
    
    print(f"❌ Could not find coordinates for '{venue_name}'")
    return None

def main():
    """Find coordinates for missing venues."""
    
    missing_venues = [
        "Al's Bar of Lexington",
        "Dreaming Creek Brewery"
    ]
    
    print("🔍 Finding coordinates for missing venues...")
    print("=" * 50)
    
    results = []
    
    for venue in missing_venues:
        print(f"\n📍 Searching for: {venue}")
        result = geocode_venue(venue)
        if result:
            results.append(result)
    
    # Save results to a file
    if results:
        with open('missing_venue_coordinates.json', 'w') as f:
            json.dump(results, f, indent=2)
        
        print("\n📁 Results saved to 'missing_venue_coordinates.json'")
        print("\n📋 COORDINATES SUMMARY:")
        for result in results:
            print(f"  {result['venue']}:")
            print(f"    Lat: {result['lat']}")
            print(f"    Lon: {result['lon']}")
            print(f"    Address: {result['address']}")
            print()
    else:
        print("\n❌ No coordinates found. You may need to manually look up these venues.")

if __name__ == "__main__":
    main()
