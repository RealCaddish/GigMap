import pandas as pd
import json
from collections import Counter

def analyze_venues():
    """Analyze venue data to identify missing point locations."""
    
    # Read the CSV file
    print("Reading CSV data...")
    df = pd.read_csv('lexington_events_time_imperial_modified.csv')
    
    # Read the GeoJSON file
    print("Reading GeoJSON data...")
    with open('shp/merged_venues_events.geojson', 'r') as f:
        geojson_data = json.load(f)
    
    # Extract venues from CSV
    csv_venues = set(df['Location'].unique())
    print(f"\nVenues found in CSV ({len(csv_venues)}):")
    for venue in sorted(csv_venues):
        print(f"  - {venue}")
    
    # Extract venues from GeoJSON
    geojson_venues = set()
    for feature in geojson_data['features']:
        venue = feature['properties']['Venue']
        geojson_venues.add(venue)
    
    print(f"\nVenues found in GeoJSON ({len(geojson_venues)}):")
    for venue in sorted(geojson_venues):
        print(f"  - {venue}")
    
    # Find missing venues (in CSV but not in GeoJSON)
    missing_venues = csv_venues - geojson_venues
    print(f"\n❌ MISSING VENUES ({len(missing_venues)}):")
    if missing_venues:
        for venue in sorted(missing_venues):
            print(f"  - {venue}")
            
        # Show events for missing venues
        print(f"\n📅 Events at missing venues:")
        for venue in sorted(missing_venues):
            venue_events = df[df['Location'] == venue]
            print(f"\n  {venue} ({len(venue_events)} events):")
            for _, event in venue_events.iterrows():
                print(f"    - {event['Artist']} on {event['Date']}")
    else:
        print("  ✅ All venues have point locations!")
    
    # Find extra venues (in GeoJSON but not in CSV)
    extra_venues = geojson_venues - csv_venues
    print(f"\n📊 EXTRA VENUES in GeoJSON ({len(extra_venues)}):")
    if extra_venues:
        for venue in sorted(extra_venues):
            print(f"  - {venue}")
    else:
        print("  ✅ No extra venues found.")
    
    # Venue statistics
    print(f"\n📈 VENUE STATISTICS:")
    venue_counts = Counter(df['Location'])
    print("Events per venue:")
    for venue, count in venue_counts.most_common():
        status = "❌ MISSING" if venue in missing_venues else "✅ MAPPED"
        print(f"  - {venue}: {count} events {status}")
    
    # Summary
    print(f"\n🎯 SUMMARY:")
    print(f"  - Total venues in CSV: {len(csv_venues)}")
    print(f"  - Total venues in GeoJSON: {len(geojson_venues)}")
    print(f"  - Missing point locations: {len(missing_venues)}")
    print(f"  - Total events: {len(df)}")
    print(f"  - Events without locations: {len(df[df['Location'].isin(missing_venues)])}")
    
    return missing_venues, df

if __name__ == "__main__":
    missing_venues, df = analyze_venues()
