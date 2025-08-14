import json
import pandas as pd

def add_missing_venues():
    """Add missing venues to the GeoJSON file."""
    
    # Read the current GeoJSON file
    print("Reading current GeoJSON file...")
    with open('shp/merged_venues_events.geojson', 'r') as f:
        geojson_data = json.load(f)
    
    # Read the CSV file to get event data
    print("Reading CSV file...")
    df = pd.read_csv('lexington_events_time_imperial_modified.csv')
    
    # Define the missing venues with their coordinates
    missing_venues = {
        "Al's Bar of Lexington": {
            "lat": 38.0540236,
            "lon": -84.4863297,
            "address": "Al's Bar, 601, North Limestone, Elsmere Park, Lexington, Fayette County, Kentucky, 40542, United States"
        },
        "Dreaming Creek Brewery": {
            "lat": 37.7482288,
            "lon": -84.2930104,
            "address": "Dreaming Creek Brewery, 109, East Irvine Street, Richmond downtown, Richmond, Madison County, Kentucky, 40475, United States"
        }
    }
    
    print(f"\n📍 Adding {len(missing_venues)} missing venues...")
    
    # Add events for missing venues
    for venue_name, coords in missing_venues.items():
        print(f"\nProcessing: {venue_name}")
        
        # Get events for this venue
        venue_events = df[df['Location'] == venue_name]
        
        for _, event in venue_events.iterrows():
            print(f"  - Adding event: {event['Artist']} on {event['Date']}")
            
            # Create new feature
            new_feature = {
                "type": "Feature",
                "properties": {
                    "id": None,
                    "Venue": venue_name,
                    "Artist": event['Artist'],
                    "Location": venue_name,
                    "Datetime": event['Datetime'],
                    "ArtistLink": event['Artist Link'],
                    "ArtistImage": event['Artist Image'],
                    "Date": event['Date'],
                    "Time": event['Time'] if pd.notna(event['Time']) and event['Time'] != '' else None
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [coords['lon'], coords['lat']]
                }
            }
            
            # Add to GeoJSON
            geojson_data['features'].append(new_feature)
    
    # Save updated GeoJSON
    print(f"\n💾 Saving updated GeoJSON file...")
    with open('shp/merged_venues_events.geojson', 'w') as f:
        json.dump(geojson_data, f, indent=2)
    
    print("✅ Successfully added missing venues!")
    
    # Show summary
    print(f"\n📊 UPDATED SUMMARY:")
    print(f"  - Total features in GeoJSON: {len(geojson_data['features'])}")
    print(f"  - Venues added: {len(missing_venues)}")
    
    # Verify all venues are now included
    geojson_venues = set()
    for feature in geojson_data['features']:
        geojson_venues.add(feature['properties']['Venue'])
    
    csv_venues = set(df['Location'].unique())
    missing_venues_check = csv_venues - geojson_venues
    
    if not missing_venues_check:
        print("  ✅ All venues now have point locations!")
    else:
        print(f"  ❌ Still missing: {missing_venues_check}")

if __name__ == "__main__":
    add_missing_venues()
