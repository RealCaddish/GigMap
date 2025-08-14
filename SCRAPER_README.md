# Enhanced SongKick Scraper for Lexington GigMap

## Overview

This enhanced version of the SongKick scraper provides a cleaner, more robust, and feature-rich solution for scraping music event data from SongKick for the Lexington GigMap project.

## 🚀 Key Improvements

### Code Quality
- **Modular Design**: Separated into logical functions with clear responsibilities
- **Comprehensive Documentation**: Detailed docstrings and comments throughout
- **Error Handling**: Robust error handling for network issues, parsing errors, and file operations
- **Type Hints**: Clear function signatures and parameter descriptions

### Enhanced Features
- **Image Download**: Automatically downloads artist images and saves them locally
- **Data Validation**: Quality checks and statistics reporting
- **Respectful Scraping**: Proper delays and headers to be respectful to SongKick's servers
- **Flexible Output**: Enhanced CSV with better column organization
- **Progress Tracking**: Real-time progress updates during scraping

### Data Processing
- **Time Conversion**: Converts 24-hour time to 12-hour format
- **Location Cleaning**: Removes common location suffixes and formatting issues
- **Date Parsing**: Handles multiple datetime formats
- **Duplicate Detection**: Identifies and reports duplicate events

## 📁 File Structure

```
GigMap/
├── songkick_scraper_enhanced.py    # Main enhanced scraper script
├── requirements.txt                # Python dependencies
├── SCRAPER_README.md              # This documentation
├── artist_images/                 # Directory for downloaded artist images
├── lexington_events_enhanced.csv  # Enhanced output CSV
└── [other project files...]
```

## 🛠️ Installation

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Verify Installation**:
   ```bash
   python songkick_scraper_enhanced.py --help
   ```

## 🎯 Usage

### Basic Usage
```bash
python songkick_scraper_enhanced.py
```

### What It Does
1. **Scrapes SongKick**: Fetches event data from the Lexington area
2. **Downloads Images**: Saves artist images to `artist_images/` directory
3. **Processes Data**: Converts times, cleans locations, and validates data
4. **Saves Results**: Creates `lexington_events_enhanced.csv`

### Output Files
- **`lexington_events_enhanced.csv`**: Main dataset with all event information
- **`artist_images/`**: Directory containing downloaded artist images

## 📊 Data Schema

The enhanced CSV contains the following columns:

| Column | Description | Example |
|--------|-------------|---------|
| `Artist` | Artist/band name | "Silversun Pickups" |
| `Location` | Venue name (cleaned) | "The Burl" |
| `Date` | Event date | "2025-07-24" |
| `Time` | Event time (12-hour format) | "07:00 PM" |
| `Datetime` | Original datetime string | "2025-07-24T19:00:00-0500" |
| `Artist_Link` | SongKick artist page URL | "https://www.songkick.com/..." |
| `Artist_Image` | Local path to artist image | "artist_images/Silversun_Pickups.jpg" |
| `Time_Text` | Original time text | "7:00 PM" |

## 🔧 Configuration

### URL Configuration
Edit the `SONGKICK_URL` variable in the script to change the date range or location:

```python
SONGKICK_URL = 'https://www.songkick.com/metro-areas/24580-us-lexington?utf8=%E2%9C%93&filters%5BminDate%5D=07%2F03%2F2025&filters%5BmaxDate%5D=07%2F30%2F2025'
```

### Output Configuration
Modify these variables to change output locations:

```python
ARTIST_IMAGES_DIR = 'artist_images'
OUTPUT_CSV = 'lexington_events_enhanced.csv'
```

## 📈 Data Quality Features

### Validation Checks
- **Missing Data Analysis**: Reports percentage of missing data for each column
- **Duplicate Detection**: Identifies duplicate events
- **Date Range Analysis**: Shows the span of event dates
- **Image Download Success Rate**: Reports how many images were successfully downloaded

### Error Handling
- **Network Timeouts**: Handles slow connections gracefully
- **Image Download Failures**: Continues processing even if some images fail
- **Parsing Errors**: Robust HTML parsing with fallback options
- **File System Errors**: Handles permission and disk space issues

## 🔄 Integration with Web Map

### Updating Your Workflow
1. **Run the Enhanced Scraper**:
   ```bash
   python songkick_scraper_enhanced.py
   ```

2. **Update Your GeoJSON Merge Process**:
   The enhanced CSV uses different column names. Update your merge script:
   ```python
   # Old column names
   # 'Artist Link' -> 'ArtistLink'
   # 'Artist Image' -> 'ArtistImage'
   
   # New column names
   # 'Artist_Link' -> 'ArtistLink'
   # 'Artist_Image' -> 'ArtistImage'
   ```

3. **Update Your Web Map**:
   The `script.js` file should work with the new column names automatically.

## 🚨 Troubleshooting

### Common Issues

**"No data was scraped"**
- Check your internet connection
- Verify the SongKick URL is accessible
- SongKick may have changed their HTML structure

**"Failed to download image"**
- Network connectivity issues
- Image URLs may be broken
- Check disk space in `artist_images/` directory

**"Permission denied"**
- Ensure write permissions in the project directory
- Check if files are open in other applications

### Debug Mode
Add debug prints by modifying the script:
```python
# Add this at the top of main()
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 🔮 Future Enhancements

### Potential Improvements
1. **Multi-Source Scraping**: Add support for other event sources
2. **Scheduled Scraping**: Automate daily/weekly updates
3. **Database Storage**: Store data in SQLite or PostgreSQL
4. **API Integration**: Use official APIs where available
5. **Image Processing**: Resize and optimize downloaded images
6. **Email Notifications**: Alert on new events or scraping failures

### Contributing
To contribute improvements:
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request with detailed description

## 📝 Changelog

### Version 2.0 (Enhanced)
- ✅ Modular function-based architecture
- ✅ Comprehensive error handling
- ✅ Image download functionality
- ✅ Data validation and quality checks
- ✅ Enhanced CSV output format
- ✅ Progress tracking and statistics
- ✅ Respectful scraping practices

### Version 1.0 (Original)
- Basic scraping functionality
- Simple CSV output
- Limited error handling

## 📄 License

This enhanced scraper is based on the original SongKick scraper and maintains the same license terms as the main project.

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the error messages in the console output
3. Verify your Python environment and dependencies
4. Test with a smaller date range first

---

**Note**: This scraper is for educational and personal use. Please respect SongKick's terms of service and implement appropriate rate limiting for production use.

