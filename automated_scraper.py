#!/usr/bin/env python3
"""
Automated Songkick Scraper for Lexington Events
This script automatically scrapes upcoming events from Songkick and updates the map data.
Designed to run weekly to keep the Lexington Gig Map updated.
"""

import os
import requests
from bs4 import BeautifulSoup
import pandas as pd
import geopandas as gpd
from datetime import datetime, timedelta
import logging
import time
import json

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scraper.log'),
        logging.StreamHandler()
    ]
)

class LexingtonEventScraper:
    def __init__(self):
        self.base_url = "https://www.songkick.com/metro-areas/24580-us-lexington"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        
    def calculate_date_range(self, months_ahead=1):
        """
        Calculate date range for the next N months from today
        """
        today = datetime.now()
        start_date = today.strftime('%m/%d/%Y')
        
        # Calculate end date (N months from today)
        if today.month + months_ahead > 12:
            end_year = today.year + ((today.month + months_ahead - 1) // 12)
            end_month = ((today.month + months_ahead - 1) % 12) + 1
        else:
            end_year = today.year
            end_month = today.month + months_ahead
            
        end_date = datetime(end_year, end_month, today.day).strftime('%m/%d/%Y')
        
        logging.info(f"Date range: {start_date} to {end_date}")
        return start_date, end_date
    
    def build_url(self, start_date, end_date):
        """
        Build the Songkick URL with date parameters
        """
        # URL encode the dates
        start_encoded = start_date.replace('/', '%2F')
        end_encoded = end_date.replace('/', '%2F')
        
        url = f"{self.base_url}?utf8=%E2%9C%93&filters%5BminDate%5D={start_encoded}&filters%5BmaxDate%5D={end_encoded}"
        logging.info(f"Built URL: {url}")
        return url
    
    def scrape_events(self, url):
        """
        Scrape events from the Songkick page
        """
        try:
            logging.info("Fetching webpage content...")
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Initialize lists to store the extracted data
            artists = []
            locations = []
            dateTimes = []
            artist_links = []
            artist_images = []
            
            # Create a directory for artist images if it doesn't exist
            os.makedirs('artist_images', exist_ok=True)
            
            # Extract event details
            events = soup.find_all('li', class_='event-listings-element')
            logging.info(f"Found {len(events)} events")
            
            for i, event in enumerate(events):
                try:
                    # Extract artist name
                    artist_tag = event.find('p', class_='artists')
                    artist_name = artist_tag.strong.get_text(strip=True) if artist_tag else None
                    
                    if not artist_name:
                        logging.warning(f"Event {i}: No artist name found")
                        continue
                    
                    # Extract artist link
                    artist_link_tag = artist_tag.find('a') if artist_tag else None
                    artist_link = f"https://www.songkick.com{artist_link_tag['href']}" if artist_link_tag else None
                    
                    # Extract event location
                    locate_tag = event.find('p', class_='location')
                    locate_name = locate_tag.get_text(strip=True) if locate_tag else None
                    
                    # Extract date and time
                    time_element = event.find('time')
                    if time_element:
                        datetime_value = time_element['datetime']
                        time_text = time_element.get_text(strip=True)
                    else:
                        datetime_value = 'N/A'
                        time_text = 'N/A'
                    
                    # Extract and download artist image
                    image_filename = self.download_artist_image(event, artist_name)
                    
                    # Append extracted data to lists
                    artists.append(artist_name)
                    locations.append(locate_name)
                    dateTimes.append(datetime_value)
                    artist_links.append(artist_link)
                    artist_images.append(image_filename)
                    
                    logging.info(f"Processed event {i+1}: {artist_name} at {locate_name}")
                    
                except Exception as e:
                    logging.error(f"Error processing event {i}: {str(e)}")
                    continue
            
            # Create a DataFrame from the extracted data
            data = {
                'Artist': artists,
                'Location': locations,
                'Datetime': dateTimes,
                'Artist Link': artist_links,
                'Artist Image': artist_images
            }
            
            df = pd.DataFrame(data)
            logging.info(f"Created DataFrame with {len(df)} events")
            return df
            
        except requests.RequestException as e:
            logging.error(f"Request failed: {str(e)}")
            return None
        except Exception as e:
            logging.error(f"Scraping failed: {str(e)}")
            return None
    
    def download_artist_image(self, event, artist_name):
        """
        Download artist image if available
        """
        try:
            image_tag = event.find('a', class_='thumb')
            if image_tag:
                img = image_tag.find('img', class_='artist-profile-image')
                if img and 'data-src' in img.attrs:
                    image_url = "https:" + img['data-src']
                    image_filename = f"artist_images/{artist_name.replace(' ', '_').replace('/', '_')}.jpg"
                    
                    # Download image
                    img_response = self.session.get(image_url, timeout=10)
                    img_response.raise_for_status()
                    
                    with open(image_filename, 'wb') as img_file:
                        img_file.write(img_response.content)
                    
                    return image_filename
        except Exception as e:
            logging.warning(f"Failed to download image for {artist_name}: {str(e)}")
        
        return None
    
    def process_datetime(self, df):
        """
        Process datetime data and convert to imperial time format
        """
        logging.info("Processing datetime data...")
        
        def split_datetime(row):
            if pd.isna(row['Datetime']) or row['Datetime'] == 'N/A':
                return pd.Series([None, None])
            
            if 'T' in str(row['Datetime']):
                date_time = str(row['Datetime']).split('T')[0]
                time_part = str(row['Datetime']).split('T')[1][:5]
            else:
                date_time = str(row['Datetime'])
                time_part = None
            return pd.Series([date_time, time_part])
        
        def convert_to_imperial(time_str):
            if pd.isna(time_str) or time_str is None:
                return None
            try:
                time_obj = pd.to_datetime(time_str, format='%H:%M')
                return time_obj.strftime('%I:%M %p')
            except:
                return time_str
        
        # Apply the function to split Datetime into Date and Time columns
        df[['Date', 'Time']] = df.apply(split_datetime, axis=1)
        
        # Convert Time to imperial format
        df['Time'] = df['Time'].apply(convert_to_imperial)
        
        return df
    
    def clean_locations(self, df):
        """
        Clean location data by removing city/state suffixes
        """
        logging.info("Cleaning location data...")
        
        suffixes_to_remove = [
            ',Lexington, KY, US',
            ',Georgetown, KY, US',
            ',London, KY, US',
            ',North Lexington, KY, US',
            ',Richmond, KY, US'
        ]
        
        for suffix in suffixes_to_remove:
            df['Location'] = df['Location'].str.replace(suffix, '', regex=False)
        
        return df
    
    def merge_with_venues(self, df):
        """
        Merge events data with venues shapefile
        """
        try:
            logging.info("Loading venues shapefile...")
            shapefile_path = 'shp/venues.shp'
            
            if not os.path.exists(shapefile_path):
                logging.error(f"Venues shapefile not found: {shapefile_path}")
                return None
            
            venues_gdf = gpd.read_file(shapefile_path)
            
            logging.info("Merging events with venues...")
            merged_gdf = venues_gdf.merge(df, left_on='Venue', right_on='Location', how='inner')
            
            # Rename columns for consistency
            merged_gdf = merged_gdf.rename(columns={
                'Artist Link': 'ArtistLink',
                'Artist Image': 'ArtistImage'
            })
            
            logging.info(f"Merged data contains {len(merged_gdf)} events")
            return merged_gdf
            
        except Exception as e:
            logging.error(f"Error merging with venues: {str(e)}")
            return None
    
    def save_data(self, df, filename):
        """
        Save DataFrame to CSV file
        """
        try:
            df.to_csv(filename, index=False)
            logging.info(f"Data saved to {filename}")
            return True
        except Exception as e:
            logging.error(f"Error saving {filename}: {str(e)}")
            return False
    
    def save_geojson(self, gdf, filename):
        """
        Save GeoDataFrame to GeoJSON file
        """
        try:
            gdf.to_file(filename, driver='GeoJSON')
            logging.info(f"GeoJSON saved to {filename}")
            return True
        except Exception as e:
            logging.error(f"Error saving GeoJSON {filename}: {str(e)}")
            return False
    
    def run_complete_pipeline(self, months_ahead=1):
        """
        Run the complete scraping and processing pipeline
        """
        logging.info("Starting Lexington events scraping pipeline...")
        
        # Calculate date range
        start_date, end_date = self.calculate_date_range(months_ahead)
        
        # Build URL
        url = self.build_url(start_date, end_date)
        
        # Scrape events
        df = self.scrape_events(url)
        if df is None or df.empty:
            logging.error("No events found or scraping failed")
            return False
        
        # Process datetime
        df = self.process_datetime(df)
        
        # Clean locations
        df = self.clean_locations(df)
        
        # Save raw data
        self.save_data(df, 'lexington_events_time_imperial_modified.csv')
        
        # Merge with venues
        merged_gdf = self.merge_with_venues(df)
        if merged_gdf is None:
            logging.error("Failed to merge with venues")
            return False
        
        # Save GeoJSON
        success = self.save_geojson(merged_gdf, 'shp/merged_venues_events.geojson')
        
        if success:
            logging.info("Pipeline completed successfully!")
            return True
        else:
            logging.error("Pipeline failed at GeoJSON save step")
            return False

def main():
    """
    Main function to run the scraper
    """
    scraper = LexingtonEventScraper()
    
    # Run the complete pipeline - fetch data through December
    success = scraper.run_complete_pipeline(months_ahead=2)
    
    if success:
        print("✅ Scraping completed successfully!")
        print("📊 Check lexington_events_time_imperial_modified.csv for the raw data")
        print("🗺️  Check shp/merged_venues_events.geojson for the map data")
    else:
        print("❌ Scraping failed. Check scraper.log for details.")
        exit(1)

if __name__ == "__main__":
    main()
