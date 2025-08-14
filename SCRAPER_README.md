# Automated Lexington Events Scraper

This automated system scrapes upcoming music events from [Songkick](https://www.songkick.com/metro-areas/24580-us-lexington) and updates your Lexington Gig Map automatically.

## 🚀 Features

- **Automatic Date Calculation**: Dynamically calculates the current month's date range
- **Complete Pipeline**: Scrapes data, processes it, and generates the final GeoJSON for your map
- **Scheduled Updates**: Can run automatically on a weekly or daily schedule
- **Error Handling**: Comprehensive logging and error recovery
- **Image Downloads**: Automatically downloads artist images
- **Data Processing**: Handles datetime conversion and location cleaning

## 📋 Requirements

Install the required dependencies:

```bash
pip install -r requirements.txt
```

## 🛠️ Usage

### Quick Start - Run Once

To run the scraper once and update your map data:

```bash
python automated_scraper.py
```

### Scheduled Updates

#### Weekly Updates (Recommended)
```bash
python scheduler.py weekly
```
This will run the scraper every Monday at 9:00 AM.

#### Daily Updates
```bash
python scheduler.py daily
```
This will run the scraper every day at 9:00 AM.

#### Run Once via Scheduler
```bash
python scheduler.py once
```

## 📁 Output Files

The scraper generates the following files:

- `lexington_events_time_imperial_modified.csv` - Processed event data
- `shp/merged_venues_events.geojson` - Final GeoJSON for your map
- `artist_images/` - Downloaded artist images
- `scraper.log` - Detailed logging information

## 🔧 Configuration

### Date Range
By default, the scraper looks ahead 1 month. You can modify this in `automated_scraper.py`:

```python
# In the main() function, change months_ahead parameter
success = scraper.run_complete_pipeline(months_ahead=2)  # Look ahead 2 months
```

### Schedule Time
To change when the scheduled scraper runs, edit `scheduler.py`:

```python
# Change the time (24-hour format)
schedule.every().monday.at("14:00").do(run_scraper)  # Run at 2:00 PM
```

## 🐛 Troubleshooting

### Common Issues

1. **No events found**: Check if Songkick has updated their HTML structure
2. **Image download failures**: Network issues or missing images (non-critical)
3. **Venues shapefile missing**: Ensure `shp/venues.shp` exists
4. **Permission errors**: Make sure you have write permissions in the directory

### Logs

Check the log files for detailed information:
- `scraper.log` - Scraper execution details
- `scheduler.log` - Scheduler execution details

### Manual Testing

To test the scraper manually:

```bash
python automated_scraper.py
```

Check the console output and log files for any errors.

## 🔄 Automation Options

### Option 1: Python Scheduler (Recommended for Development)

Use the included scheduler:

```bash
python scheduler.py weekly
```

### Option 2: System Cron (Recommended for Production)

Add to your crontab for weekly updates:

```bash
# Edit crontab
crontab -e

# Add this line to run every Monday at 9:00 AM
0 9 * * 1 cd /path/to/your/project && python automated_scraper.py
```

### Option 3: Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger to weekly on Monday
4. Set action to start program: `python`
5. Add arguments: `automated_scraper.py`
6. Set start in: `/path/to/your/project`

## 📊 Data Flow

1. **Scraping**: Fetches events from Songkick for the current month
2. **Processing**: Converts datetime formats and cleans location data
3. **Image Download**: Downloads artist images to `artist_images/` folder
4. **Merging**: Combines event data with venue coordinates
5. **Output**: Generates CSV and GeoJSON files for your map

## �� Rate Limiting

The scraper includes:
- 30-second timeout for web requests
- 10-second timeout for image downloads
- User-Agent headers to avoid blocking
- Error handling for failed requests

## 📈 Monitoring

Monitor the scraper's performance:

```bash
# Check recent logs
tail -f scraper.log

# Check file sizes to ensure data is being generated
ls -la *.csv shp/*.geojson
```

## 🆘 Support

If you encounter issues:

1. Check the log files for error messages
2. Verify your internet connection
3. Ensure all dependencies are installed
4. Check that the venues shapefile exists
5. Verify file permissions

## 🔄 Updating the Map

After the scraper runs successfully:

1. The `shp/merged_venues_events.geojson` file is automatically updated
2. Your web map will use the new data on the next page refresh
3. No manual intervention required!

## 📝 Notes

- The scraper respects Songkick's terms of service
- Images are downloaded locally to avoid external dependencies
- The system is designed to be robust and handle network issues gracefully
- All data processing maintains the same format as your original manual process

