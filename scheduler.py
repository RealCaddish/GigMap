#!/usr/bin/env python3
"""
Scheduler for Lexington Event Scraper
This script can be used to run the scraper automatically on a schedule.
"""

import schedule
import time
import subprocess
import sys
import os
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scheduler.log'),
        logging.StreamHandler()
    ]
)

def run_scraper():
    """
    Run the automated scraper
    """
    try:
        logging.info("Starting scheduled scraper run...")
        
        # Run the scraper script
        result = subprocess.run([sys.executable, 'automated_scraper.py'], 
                              capture_output=True, text=True, timeout=300)
        
        if result.returncode == 0:
            logging.info("Scheduled scraper run completed successfully")
            print("✅ Scheduled scraping completed successfully!")
        else:
            logging.error(f"Scheduled scraper run failed: {result.stderr}")
            print("❌ Scheduled scraping failed. Check scheduler.log for details.")
            
    except subprocess.TimeoutExpired:
        logging.error("Scraper timed out after 5 minutes")
        print("⏰ Scraper timed out")
    except Exception as e:
        logging.error(f"Error running scraper: {str(e)}")
        print(f"❌ Error: {str(e)}")

def run_once():
    """
    Run the scraper once immediately
    """
    print("🚀 Running scraper once...")
    run_scraper()

def schedule_weekly():
    """
    Schedule the scraper to run weekly
    """
    # Schedule to run every Monday at 9:00 AM
    schedule.every().monday.at("09:00").do(run_scraper)
    
    print("📅 Scheduled scraper to run every Monday at 9:00 AM")
    print("Press Ctrl+C to stop the scheduler")
    
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    except KeyboardInterrupt:
        print("\n⏹️  Scheduler stopped")

def schedule_daily():
    """
    Schedule the scraper to run daily
    """
    # Schedule to run every day at 9:00 AM
    schedule.every().day.at("09:00").do(run_scraper)
    
    print("📅 Scheduled scraper to run daily at 9:00 AM")
    print("Press Ctrl+C to stop the scheduler")
    
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    except KeyboardInterrupt:
        print("\n⏹️  Scheduler stopped")

def main():
    """
    Main function to handle command line arguments
    """
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python scheduler.py once     - Run scraper once")
        print("  python scheduler.py weekly   - Schedule weekly runs")
        print("  python scheduler.py daily    - Schedule daily runs")
        return
    
    command = sys.argv[1].lower()
    
    if command == "once":
        run_once()
    elif command == "weekly":
        schedule_weekly()
    elif command == "daily":
        schedule_daily()
    else:
        print("Invalid command. Use 'once', 'weekly', or 'daily'")

if __name__ == "__main__":
    main()
