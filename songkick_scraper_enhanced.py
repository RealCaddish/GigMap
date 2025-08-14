#!/usr/bin/env python3
"""
Enhanced SongKick Scraper for Lexington GigMap

This script scrapes upcoming music events from SongKick for Lexington, KY and creates
an enhanced dataset with artist images.

Features:
- Scrapes event data from SongKick
- Downloads artist images
- Converts time formats to imperial (12-hour)
- Cleans location data
- Creates enhanced CSV with all data

Author: Enhanced version of original scraper
Date: 2025
"""

import os
import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
from urllib.parse import urljoin, urlparse
import re
import sys
from datetime import datetime

# Configuration variables
SONGKICK_URL = 'https://www.songkick.com/metro-areas/24580-us-lexington?utf8=%E2%9C%93&filters%5BminDate%5D=07%2F03%2F2025&filters%5BmaxDate%5D=07%2F30%2F2025'
ARTIST_IMAGES_DIR = 'artist_images'
OUTPUT_CSV = 'lexington_events_enhanced.csv'

# Request headers to mimic a real browser
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

def sanitize_filename(filename):
    """
    Sanitize a filename by removing/replacing invalid characters.
    
    Args:
        filename (str): Original filename
        
    Returns:
        str: Sanitized filename safe for file system
    """
    # Remove or replace invalid characters
    filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
    # Remove extra spaces and replace with underscores
    filename = re.sub(r'\s+', '_', filename.strip())
    # Remove leading/trailing dots and underscores
    filename = filename.strip('._')
    return filename

def download_image(image_url, artist_name):
    """
    Download an artist image from URL and save it locally.
    
    Args:
        image_url (str): URL of the image to download
        artist_name (str): Name of the artist for filename
        
    Returns:
        str: Local path to the downloaded image, or None if failed
    """
    try:
        # Sanitize artist name for filename
        safe_name = sanitize_filename(artist_name)
        filename = f"{ARTIST_IMAGES_DIR}/{safe_name}.jpg"
        
        # Download the image
        response = requests.get(image_url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        
        # Save the image
        with open(filename, 'wb') as img_file:
            img_file.write(response.content)
        
        print(f"  ✓ Downloaded image for {artist_name}")
        return filename
        
    except Exception as e:
        print(f"  ✗ Failed to download image for {artist_name}: {str(e)}")
        return None

def extract_artist_image_url(event_element):
    """
    Extract the artist image URL from an event element.
    
    Args:
        event_element: BeautifulSoup element containing event data
        
    Returns:
        str: Image URL or None if not found
    """
    try:
        # Look for the image in the event thumbnail
        thumb_link = event_element.find('a', class_='thumb')
        if thumb_link:
            img_tag = thumb_link.find('img', class_='artist-profile-image')
            if img_tag:
                # Check for data-src attribute (lazy loading)
                if 'data-src' in img_tag.attrs:
                    image_url = img_tag['data-src']
                elif 'src' in img_tag.attrs:
                    image_url = img_tag['src']
                else:
                    return None
                
                # Ensure URL has protocol
                if image_url.startswith('//'):
                    image_url = 'https:' + image_url
                elif not image_url.startswith('http'):
                    image_url = 'https://' + image_url
                
                return image_url
    except Exception as e:
        print(f"Error extracting image URL: {str(e)}")
    
    return None

def scrape_songkick_events(url):
    """
    Scrape event data from SongKick for Lexington, KY.
    
    Args:
        url (str): SongKick URL to scrape
        
    Returns:
        pandas.DataFrame: DataFrame containing scraped event data
    """
    print(f"Starting to scrape events from: {url}")
    
    # Initialize lists to store extracted data
    events_data = []
    
    try:
        # Fetch the webpage content
        print("Fetching webpage...")
        response = requests.get(url, headers=HEADERS, timeout=30)
        response.raise_for_status()
        
        # Parse the HTML content
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find all event listings
        event_elements = soup.find_all('li', class_='event-listings-element')
        print(f"Found {len(event_elements)} events to process")
        
        # Process each event
        for i, event in enumerate(event_elements, 1):
            print(f"\nProcessing event {i}/{len(event_elements)}...")
            
            # Extract artist name
            artist_tag = event.find('p', class_='artists')
            artist_name = None
            if artist_tag and artist_tag.strong:
                artist_name = artist_tag.strong.get_text(strip=True)
            
            if not artist_name:
                print(f"  ⚠ Skipping event {i}: No artist name found")
                continue
            
            # Extract artist link
            artist_link = None
            if artist_tag:
                artist_link_tag = artist_tag.find('a')
                if artist_link_tag and 'href' in artist_link_tag.attrs:
                    artist_link = urljoin('https://www.songkick.com', artist_link_tag['href'])
            
            # Extract event location
            location_tag = event.find('p', class_='location')
            location_name = location_tag.get_text(strip=True) if location_tag else None
            
            # Extract date and time
            time_element = event.find('time')
            datetime_value = 'N/A'
            time_text = 'N/A'
            
            if time_element:
                datetime_value = time_element.get('datetime', 'N/A')
                time_text = time_element.get_text(strip=True)
            
            # Extract and download artist image
            image_url = extract_artist_image_url(event)
            local_image_path = None
            
            if image_url:
                local_image_path = download_image(image_url, artist_name)
                # Add a small delay to be respectful to the server
                time.sleep(0.5)
            else:
                print(f"  ⚠ No image found for {artist_name}")
            
            # Store the event data
            event_data = {
                'Artist': artist_name,
                'Location': location_name,
                'Datetime': datetime_value,
                'Artist_Link': artist_link,
                'Artist_Image': local_image_path,
                'Time_Text': time_text
            }
            
            events_data.append(event_data)
            print(f"  ✓ Processed: {artist_name} at {location_name}")
        
        print(f"\n✅ Successfully processed {len(events_data)} events!")
        
    except requests.RequestException as e:
        print(f"❌ Error fetching webpage: {str(e)}")
        return pd.DataFrame()
    except Exception as e:
        print(f"❌ Unexpected error during scraping: {str(e)}")
        return pd.DataFrame()
    
    # Create DataFrame from collected data
    df = pd.DataFrame(events_data)
    return df

def process_datetime_data(df):
    """
    Process datetime data to extract date and convert time to imperial format.
    
    Args:
        df (pandas.DataFrame): DataFrame with datetime data
        
    Returns:
        pandas.DataFrame: DataFrame with processed date and time columns
    """
    print("Processing datetime data...")
    
    def split_datetime(row):
        """Split datetime into date and time components"""
        datetime_str = row['Datetime']
        
        if pd.isna(datetime_str) or datetime_str == 'N/A':
            return pd.Series([None, None])
        
        # Handle different datetime formats
        if 'T' in str(datetime_str):
            # ISO format: 2025-07-24T19:00:00-0500
            try:
                date_part = datetime_str.split('T')[0]
                time_part = datetime_str.split('T')[1][:5]  # HH:MM
                return pd.Series([date_part, time_part])
            except:
                return pd.Series([None, None])
        else:
            # Date only format
            return pd.Series([datetime_str, None])
    
    def convert_to_imperial(time_str):
        """Convert 24-hour time to 12-hour format"""
        if pd.isna(time_str) or time_str is None:
            return None
        
        try:
            time_obj = pd.to_datetime(time_str, format='%H:%M')
            return time_obj.strftime('%I:%M %p')
        except:
            return time_str
    
    # Create a copy to avoid modifying the original
    processed_df = df.copy()
    
    # Split datetime into date and time
    processed_df[['Date', 'Time']] = processed_df.apply(split_datetime, axis=1)
    
    # Convert time to imperial format
    processed_df['Time'] = processed_df['Time'].apply(convert_to_imperial)
    
    print("✅ Datetime processing completed!")
    return processed_df

def clean_location_data(df):
    """
    Clean location data by removing common suffixes and formatting issues.
    
    Args:
        df (pandas.DataFrame): DataFrame with location data
        
    Returns:
        pandas.DataFrame: DataFrame with cleaned location data
    """
    print("Cleaning location data...")
    
    # Common location suffixes to remove
    location_suffixes = [
        ',Lexington, KY, US',
        ',Georgetown, KY, US',
        ',London, KY, US',
        ',North Lexington, KY, US',
        ',Richmond, KY, US',
        ',Nicholasville, KY, US',
        ',Winchester, KY, US'
    ]
    
    cleaned_df = df.copy()
    
    for suffix in location_suffixes:
        cleaned_df['Location'] = cleaned_df['Location'].str.replace(suffix, '', regex=False)
    
    # Clean up any extra commas and whitespace
    cleaned_df['Location'] = cleaned_df['Location'].str.strip().str.rstrip(',')
    
    print("✅ Location cleaning completed!")
    return cleaned_df

def save_enhanced_data(df, filename):
    """
    Save the enhanced event data to CSV file.
    
    Args:
        df (pandas.DataFrame): DataFrame to save
        filename (str): Output filename
    """
    try:
        # Save to CSV
        df.to_csv(filename, index=False)
        print(f"✅ Enhanced data saved to: {filename}")
        
        # Display summary statistics
        print(f"\n📊 Data Summary:")
        print(f"Total events: {len(df)}")
        print(f"Events with images: {df['Artist_Image'].notna().sum()}")
        print(f"Events with times: {df['Time'].notna().sum()}")
        print(f"Unique venues: {df['Location'].nunique()}")
        
        # Show sample of venues
        print(f"\n🏢 Venues found:")
        for venue in df['Location'].unique():
            if pd.notna(venue):
                event_count = len(df[df['Location'] == venue])
                print(f"  - {venue}: {event_count} events")
        
    except Exception as e:
        print(f"❌ Error saving data: {str(e)}")

def validate_data_quality(df):
    """
    Perform data quality checks on the scraped data.
    
    Args:
        df (pandas.DataFrame): DataFrame to validate
    """
    print("🔍 Performing data quality validation...")
    
    # Check for missing data
    missing_data = df.isnull().sum()
    print(f"\n📋 Missing data summary:")
    for column, missing_count in missing_data.items():
        percentage = (missing_count / len(df)) * 100
        print(f"  {column}: {missing_count} ({percentage:.1f}%)")
    
    # Check for duplicate events
    duplicates = df.duplicated(subset=['Artist', 'Location', 'Date']).sum()
    print(f"\n🔄 Duplicate events: {duplicates}")
    
    # Check date range
    if 'Date' in df.columns:
        valid_dates = pd.to_datetime(df['Date'], errors='coerce')
        date_range = valid_dates.dropna()
        if not date_range.empty:
            print(f"\n📅 Date range: {date_range.min().date()} to {date_range.max().date()}")
    
    # Check image download success
    if 'Artist_Image' in df.columns:
        images_downloaded = df['Artist_Image'].notna().sum()
        total_events = len(df)
        success_rate = (images_downloaded / total_events) * 100
        print(f"\n🖼️ Image download success rate: {success_rate:.1f}% ({images_downloaded}/{total_events})")
    
    print("✅ Data validation completed!")

def main():
    """
    Main function to orchestrate the scraping process.
    """
    print("🎵 Enhanced SongKick Scraper for Lexington GigMap")
    print("=" * 50)
    
    # Create directory for artist images if it doesn't exist
    os.makedirs(ARTIST_IMAGES_DIR, exist_ok=True)
    print(f"Artist images directory created/verified: {ARTIST_IMAGES_DIR}")
    
    # Step 1: Scrape events from SongKick
    print("\n" + "=" * 50)
    print("STEP 1: Scraping events from SongKick")
    print("=" * 50)
    events_df = scrape_songkick_events(SONGKICK_URL)
    
    if events_df.empty:
        print("❌ No data was scraped. Exiting.")
        sys.exit(1)
    
    # Display initial results
    print(f"\n📊 Initial scraped data:")
    print(events_df.head())
    print(f"Total events scraped: {len(events_df)}")
    
    # Step 2: Process and enhance the data
    print("\n" + "=" * 50)
    print("STEP 2: Processing and enhancing data")
    print("=" * 50)
    
    # Process datetime data
    processed_df = process_datetime_data(events_df)
    
    # Clean location data
    final_df = clean_location_data(processed_df)
    
    # Reorder columns for better readability
    column_order = [
        'Artist', 'Location', 'Date', 'Time', 'Datetime', 
        'Artist_Link', 'Artist_Image', 'Time_Text'
    ]
    final_df = final_df[column_order]
    
    print(f"\n📋 Final processed data:")
    print(final_df.head())
    print(f"Total events in final dataset: {len(final_df)}")
    
    # Step 3: Save enhanced data
    print("\n" + "=" * 50)
    print("STEP 3: Saving enhanced data")
    print("=" * 50)
    save_enhanced_data(final_df, OUTPUT_CSV)
    
    # Step 4: Validate data quality
    print("\n" + "=" * 50)
    print("STEP 4: Data quality validation")
    print("=" * 50)
    validate_data_quality(final_df)
    
    # Final summary
    print("\n" + "=" * 50)
    print("🎉 SCRAPING COMPLETED SUCCESSFULLY!")
    print("=" * 50)
    print(f"✅ Enhanced data saved to: {OUTPUT_CSV}")
    print(f"✅ Artist images saved to: {ARTIST_IMAGES_DIR}/")
    print(f"✅ Total events processed: {len(final_df)}")
    print("\nNext steps:")
    print("1. Use the enhanced CSV for your web map")
    print("2. Update your GeoJSON merge process to use the new column names")
    print("3. Consider adding more data sources for comprehensive coverage")
    print("4. Implement periodic scraping for automatic updates")

if __name__ == "__main__":
    main()

