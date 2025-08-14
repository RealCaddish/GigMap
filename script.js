document.addEventListener('DOMContentLoaded', function () {
    // Configuration
    const config = {
        originalCenter: [38.0406, -84.5037], // Lexington KY coordinates
        originalZoom: 13,
        mobileBreakpoint: 768,
        tabletBreakpoint: 1024,
        popupMaxWidth: 300,
        mobilePopupMaxWidth: 250,
        tabletPopupMaxWidth: 280
    };

    // State management
    let map, legend, isMobile, isTablet, currentPopup = null;
    let venuesData = {};
    let colorPalette = [];

    // Initialize the application
    init();

    function init() {
        detectDeviceType();
        initializeMap();
        setupEventListeners();
        loadVenuesData();
        hideLoading();
    }

    function detectDeviceType() {
        const width = window.innerWidth;
        isMobile = width <= config.mobileBreakpoint;
        isTablet = width > config.mobileBreakpoint && width <= config.tabletBreakpoint;
    }

    function initializeMap() {
        // Map initialization with device-specific settings
        map = L.map('map', {
            center: config.originalCenter,
            zoom: config.originalZoom,
            scrollWheelZoom: !isMobile,
            tap: !isMobile, // Disable tap handler on mobile for better performance
            doubleClickZoom: !isMobile,
            boxZoom: !isMobile,
            keyboard: true,
            dragging: true,
            touchZoom: true,
            bounceAtZoomLimits: false,
            worldCopyJump: false,
            maxBoundsViscosity: 1.0
        });

        // Add tile layer with optimized settings
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            updateWhenIdle: true,
            updateWhenZooming: false
        }).addTo(map);

        // Add map event listeners
        map.on('click', handleMapClick);
        map.on('popupopen', handlePopupOpen);
        map.on('popupclose', handlePopupClose);
        
        // Handle viewport changes
        window.addEventListener('resize', debounce(handleResize, 250));
    }

    function setupEventListeners() {
        // Menu toggle for mobile
        const menuToggle = document.getElementById('menu-toggle');
        const description = document.getElementById('description');
        const closeDescription = document.getElementById('close-description');

        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                description.classList.toggle('open');
                menuToggle.classList.toggle('active');
            });
        }

        if (closeDescription) {
            closeDescription.addEventListener('click', () => {
                description.classList.remove('open');
                if (menuToggle) menuToggle.classList.remove('active');
            });
        }

        // Map controls
        const resetViewBtn = document.getElementById('reset-view');
        const toggleLegendBtn = document.getElementById('toggle-legend');

        if (resetViewBtn) {
            resetViewBtn.addEventListener('click', resetMapView);
        }

        if (toggleLegendBtn) {
            toggleLegendBtn.addEventListener('click', toggleLegend);
        }

        // Close description when clicking outside on mobile
        if (isMobile) {
            document.addEventListener('click', (e) => {
                if (!description.contains(e.target) && !menuToggle.contains(e.target)) {
                    description.classList.remove('open');
                    menuToggle.classList.remove('active');
                }
            });
        }

        // Keyboard navigation
        document.addEventListener('keydown', handleKeyboardNavigation);
    }

    function loadVenuesData() {
        fetch('shp/merged_venues_events.geojson')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(json => {
                processVenuesData(json);
            })
            .catch(error => {
                console.error('Error loading venues data:', error);
                showError('Failed to load venues data. Please refresh the page.');
            });
    }

    function processVenuesData(json) {
        // Group events by date
        const byDate = {};
        json.features.forEach(function (feature) {
            const date = feature.properties.Date;
            if (!byDate[date]) {
                byDate[date] = [];
            }
            byDate[date].push(feature);
        });

        venuesData = byDate;
        const dates = Object.keys(byDate).sort();
        colorPalette = generateColorPalette(dates.length);

        addLegend(byDate, dates, colorPalette);
        addGeoJSONLayers(byDate, dates, colorPalette);
    }

    function addLegend(data, dates, colorPalette) {
        legend = L.control({ position: 'bottomleft' });

        legend.onAdd = function (map) {
            const div = L.DomUtil.create('div', 'legend');
            
            // Create header with date range
            const dateRange = getDateRange(dates);
            div.innerHTML = `<h4>Event Calendar: ${dateRange}</h4>`;
            
            // Create calendar container
            const calendarContainer = L.DomUtil.create('div', 'calendar-container', div);
            
            // Get today's date for comparison
            const today = new Date();
            const todayString = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
            console.log('Today:', todayString);
            console.log('Available dates:', dates);
            
            // Check if today has events
            const hasTodayEvents = dates.includes(todayString);
            
            // Create calendar days
            dates.forEach(function (date, index) {
                const dayDiv = L.DomUtil.create('div', 'calendar-day', calendarContainer);
                const dayNumber = new Date(date).getDate();
                dayDiv.innerHTML = `<div style="position: absolute; top: 0; width: 100%;">${dayNumber}</div>`;

                // Check if this date is today and add highlighting class
                if (date === todayString) {
                    dayDiv.classList.add('today');
                    console.log('Today found:', date, 'Highlighting applied');
                }

                data[date].forEach(function (event) {
                    const dot = L.DomUtil.create('div', 'event-dot', dayDiv);
                    dot.style.backgroundColor = colorPalette[index];
                    dot.title = `${event.properties.Artist} at ${event.properties.Venue}`;
                    dot.setAttribute('data-artist', event.properties.Artist);
                    dot.setAttribute('data-venue', event.properties.Venue);
                    
                    // Add click handler for legend dots
                    dot.addEventListener('click', () => {
                        console.log('Legend dot clicked:', event.properties);
                        showLegendTooltip(event);
                    });

                    // Add enhanced hover tooltip for desktop
                    if (!isMobile) {
                        dot.addEventListener('mouseenter', (e) => {
                            showDesktopTooltip(event, e);
                        });
                        
                        dot.addEventListener('mouseleave', () => {
                            hideDesktopTooltip();
                        });
                    }

                    // Add mobile-friendly tooltip handling
                    if (isMobile) {
                        dot.addEventListener('touchstart', (e) => {
                            e.preventDefault();
                            showMobileTooltip(event.properties.Artist, event.properties.Venue, event);
                        });
                    }
                });
            });
            
            // Add "no events today" indicator if today has no events
            if (!hasTodayEvents) {
                const noEventsDiv = L.DomUtil.create('div', 'no-events-today', div);
                noEventsDiv.innerHTML = `<div style="text-align: center; margin-top: 10px; padding: 8px; background: rgba(76, 175, 80, 0.1); border: 1px solid #4CAF50; border-radius: 4px; color: #4CAF50; font-size: 0.8rem;">
                    <strong>Today (${todayString})</strong> - No events scheduled
                </div>`;
            }
            
            return div;
        };

        legend.addTo(map);
    }

    // Desktop tooltip functions
    let desktopTooltip = null;

    function showDesktopTooltip(event, mouseEvent) {
        // Remove existing tooltip
        hideDesktopTooltip();

        const artist = event.properties.Artist || 'Unknown Artist';
        const venue = event.properties.Venue || 'Unknown Venue';
        const eventDate = event.properties.Date;
        const eventTime = event.properties.Time || 'Time TBA';
        const artistImage = event.properties.ArtistImage;
        const artistLink = event.properties.ArtistLink;
        const formattedDate = formatDate(eventDate);

        // Create tooltip element
        desktopTooltip = document.createElement('div');
        desktopTooltip.className = 'desktop-tooltip';
        desktopTooltip.innerHTML = `
            <div class="desktop-tooltip-content">
                <div class="desktop-tooltip-header">
                    <div class="desktop-tooltip-artist-image">
                        <img src="${artistImage}" alt="${artist}" onerror="this.style.display='none'">
                    </div>
                    <div class="desktop-tooltip-artist-info">
                        <div class="desktop-tooltip-artist-name">${artist}</div>
                        <div class="desktop-tooltip-venue">${venue}</div>
                        <div class="desktop-tooltip-date">${formattedDate} at ${eventTime}</div>
                    </div>
                </div>
                <div class="desktop-tooltip-actions">
                    <button class="desktop-tooltip-zoom-btn">📍 Zoom to Show</button>
                </div>
            </div>
        `;

        // Position tooltip
        const rect = mouseEvent.target.getBoundingClientRect();
        desktopTooltip.style.cssText = `
            position: fixed;
            top: ${rect.top - 10}px;
            left: ${rect.left + rect.width + 10}px;
            background: var(--secondary-color);
            color: white;
            padding: 15px;
            border-radius: var(--border-radius);
            box-shadow: 0 8px 25px var(--shadow-color);
            z-index: 10000;
            width: 280px;
            animation: tooltipFadeIn 0.2s ease;
        `;

        // Add zoom functionality
        const zoomBtn = desktopTooltip.querySelector('.desktop-tooltip-zoom-btn');
        zoomBtn.addEventListener('click', () => {
            flyToEvent(event);
            hideDesktopTooltip();
        });

        document.body.appendChild(desktopTooltip);
    }

    function hideDesktopTooltip() {
        if (desktopTooltip) {
            desktopTooltip.remove();
            desktopTooltip = null;
        }
    }
            
            // Add "no events today" indicator if today has no events
            if (!hasTodayEvents) {
                const noEventsDiv = L.DomUtil.create('div', 'no-events-today', div);
                noEventsDiv.innerHTML = `<div style="text-align: center; margin-top: 10px; padding: 8px; background: rgba(76, 175, 80, 0.1); border: 1px solid #4CAF50; border-radius: 4px; color: #4CAF50; font-size: 0.8rem;">
                    <strong>Today (${todayString})</strong> - No events scheduled
                </div>`;
            }
            
            return div;
        };

        legend.addTo(map);
    }

    function addGeoJSONLayers(data, dates, colorPalette) {
        dates.forEach(function (date, index) {
            L.geoJSON(data[date], {
                pointToLayer: function (feature, latlng) {
                    const marker = L.circleMarker(latlng, {
                        radius: getMarkerRadius(),
                        fillColor: colorPalette[index],
                        color: '#000',
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.8
                    });

                    // Add click handler with optimized behavior
                    marker.on('click', function (e) {
                        e.originalEvent.stopPropagation();
                        handleMarkerClick(e, feature);
                    });

                    // Add hover effects
                    marker.on('mouseover', function () {
                        this.setRadius(getMarkerRadius() + 2);
                    });

                    marker.on('mouseout', function () {
                        this.setRadius(getMarkerRadius());
                    });

                    // Bind optimized popup
                    const popupContent = createPopupContent(feature);
                    marker.bindPopup(popupContent, {
                        maxWidth: getPopupMaxWidth(),
                        className: 'custom-popup',
                        closeButton: true,
                        autoPan: true,
                        autoPanPadding: [50, 50]
                    });

                    return marker;
                }
            }).addTo(map);
        });
    }

    function createPopupContent(feature) {
        const { Artist, Venue, Date, Time, ArtistImage } = feature.properties;
        
        return `
            <div class="popup-content">
                <img src="${ArtistImage}" alt="Image of ${Artist}" 
                     class="popup-image" 
                     onerror="this.style.display='none'">
                <div class="popup-info">
                    <div class="popup-date">${formatDate(Date)}</div>
                    <div class="popup-artist">${Artist}</div>
                    <div class="popup-venue">${Venue}</div>
                    <div class="popup-time">${Time || 'Time TBA'}</div>
                </div>
            </div>
        `;
    }

    function handleMarkerClick(e, feature) {
        // Close any existing popup
        if (currentPopup) {
            map.closePopup(currentPopup);
        }

        // Calculate optimal zoom and position
        const offsetLat = e.latlng.lat + 0.001;
        const offsetLng = e.latlng.lng - 0.0001 * map.getSize().x / map.getSize().y;
        
        // Fly to location with device-specific zoom
        const targetZoom = isMobile ? 16 : 17;
        map.flyTo([offsetLat, offsetLng], targetZoom, {
            duration: 0.8,
            easeLinearity: 0.25
        });
    }

    function handleMapClick() {
        // Reset to original view on map click
        resetMapView();
    }

    function handlePopupOpen(e) {
        currentPopup = e.popup;
        
        // Add custom styling for mobile
        if (isMobile) {
            const popupElement = e.popup.getElement();
            if (popupElement) {
                popupElement.style.maxWidth = '90vw';
            }
        }
    }

    function handlePopupClose() {
        currentPopup = null;
    }

    function flyToEvent(event) {
        const latlng = [event.geometry.coordinates[1], event.geometry.coordinates[0]];
        const targetZoom = isMobile ? 16 : 17;
        
        map.flyTo(latlng, targetZoom, {
            duration: 0.8,
            easeLinearity: 0.25
        });
    }

    function resetMapView() {
        map.flyTo(config.originalCenter, config.originalZoom, {
            duration: 1,
            easeLinearity: 0.25
        });
    }

    function toggleLegend() {
        const legendElement = document.querySelector('.legend');
        if (legendElement) {
            legendElement.classList.toggle('collapsed');
        }
    }

    function handleResize() {
        detectDeviceType();
        
        // Refresh map size
        map.invalidateSize();
        
        // Update popup max width if needed
        const popups = document.querySelectorAll('.leaflet-popup');
        popups.forEach(popup => {
            popup.style.maxWidth = getPopupMaxWidth() + 'px';
        });
    }

    function handleKeyboardNavigation(e) {
        switch(e.key) {
            case 'Escape':
                if (currentPopup) {
                    map.closePopup(currentPopup);
                }
                document.getElementById('description').classList.remove('open');
                break;
            case 'r':
            case 'R':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    resetMapView();
                }
                break;
        }
    }

    // Utility functions
    function generateColorPalette(count) {
        const colors = [];
        const baseHue = 0;
        for (let i = 0; i < count; i++) {
            colors.push(`hsl(${(baseHue + i * 137) % 360}, 70%, 50%)`);
        }
        return colors;
    }

    function getDateRange(dates) {
        if (dates.length === 0) return '';
        const start = new Date(dates[0]);
        const end = new Date(dates[dates.length - 1]);
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    function getMarkerRadius() {
        return isMobile ? 6 : 8;
    }

    function getPopupMaxWidth() {
        if (isMobile) return config.mobilePopupMaxWidth;
        if (isTablet) return config.tabletPopupMaxWidth;
        return config.popupMaxWidth;
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('hidden');
            setTimeout(() => {
                loading.style.display = 'none';
            }, 300);
        }
    }

    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #e74c3c;
            color: white;
            padding: 20px;
            border-radius: 8px;
            z-index: 3000;
            text-align: center;
            max-width: 300px;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    // Performance optimizations
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registered: ', registration);
                })
                .catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
        });
    }

    // Preload critical images
    function preloadImages() {
        const imageUrls = [
            // Add any critical image URLs here
        ];
        
        imageUrls.forEach(url => {
            const img = new Image();
            img.src = url;
        });
    }

    // Initialize preloading
    preloadImages();

    // Enhanced mobile tooltip function with detailed artist information
    function showMobileTooltip(artist, venue, event) {
        // Remove any existing mobile tooltip
        const existingTooltip = document.querySelector('.mobile-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }

        // Remove any existing selected state from dots
        document.querySelectorAll('.event-dot.selected').forEach(dot => {
            dot.classList.remove('selected');
        });

        // Find and highlight the clicked dot
        const clickedDot = event.target || document.querySelector(`[data-artist="${artist}"][data-venue="${venue}"]`);
        if (clickedDot && clickedDot.classList.contains('event-dot')) {
            clickedDot.classList.add('selected');
        }

        // Get event details
        const eventDate = event.properties.Date;
        const eventTime = event.properties.Time || 'Time TBA';
        const artistImage = event.properties.ArtistImage;
        const artistLink = event.properties.ArtistLink;
        const formattedDate = formatDate(eventDate);

        // Create tooltip element with detailed information
        const tooltip = document.createElement('div');
        tooltip.className = 'mobile-tooltip';
        
        // Get additional venue information
        const venueInfo = getVenueInfo(venue);
        
        // Better datetime formatting
        let displayDateTime = formattedDate;
        if (eventTime && eventTime !== 'Time TBA') {
            displayDateTime += ` at ${eventTime}`;
        }
        
        // Create image element with better error handling
        // Fix image path by replacing backslashes and encoding spaces
        const fixedImagePath = artistImage ? artistImage.replace(/\\/g, '/').replace(/ /g, '%20') : null;
        const imageHtml = fixedImagePath ? 
            `<img src="${fixedImagePath}" alt="${artist}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\"artist-placeholder\\">🎵</div>'">` :
            '<div class="artist-placeholder">🎵</div>';
        
        tooltip.innerHTML = `
            <div class="tooltip-content">
                <div class="tooltip-header">
                    <div class="tooltip-artist-image">
                        ${imageHtml}
                    </div>
                    <div class="tooltip-artist-info">
                        <div class="tooltip-artist-name">${artist}</div>
                        <div class="tooltip-venue">📍 ${venue}</div>
                        ${venueInfo ? `<div class="tooltip-venue-details">${venueInfo}</div>` : ''}
                        <div class="tooltip-datetime">📅 ${displayDateTime}</div>
                        ${artistLink ? `<div class="tooltip-link"><a href="${artistLink}" target="_blank" rel="noopener">🔗 View on Songkick</a></div>` : ''}
                    </div>
                </div>
                <div class="tooltip-actions">
                    <button class="tooltip-zoom-btn">📍 Zoom to Show</button>
                    <button class="tooltip-close">×</button>
                </div>
            </div>
        `;

        // Add styles
        tooltip.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--secondary-color);
            color: white;
            padding: 20px;
            border-radius: var(--border-radius);
            box-shadow: 0 8px 25px var(--shadow-color);
            z-index: 10001;
            max-width: 90vw;
            width: 320px;
            animation: tooltipFadeIn 0.3s ease;
        `;

        // Add to page
        document.body.appendChild(tooltip);

        // Add zoom functionality
        const zoomBtn = tooltip.querySelector('.tooltip-zoom-btn');
        zoomBtn.addEventListener('click', () => {
            flyToEvent(event);
            tooltip.remove();
        });

        // Add close functionality
        const closeBtn = tooltip.querySelector('.tooltip-close');
        closeBtn.addEventListener('click', () => {
            tooltip.remove();
            // Remove selected state when closing
            document.querySelectorAll('.event-dot.selected').forEach(dot => {
                dot.classList.remove('selected');
            });
        });

        // Auto-close after 5 seconds
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.remove();
                // Remove selected state when auto-closing
                document.querySelectorAll('.event-dot.selected').forEach(dot => {
                    dot.classList.remove('selected');
                });
            }
        }, 5000);

        // Close on background tap
        tooltip.addEventListener('click', (e) => {
            if (e.target === tooltip) {
                tooltip.remove();
                // Remove selected state when closing
                document.querySelectorAll('.event-dot.selected').forEach(dot => {
                    dot.classList.remove('selected');
                });
            }
        });
    }

    // Legend tooltip functions
    let legendTooltip = null;

    function showLegendTooltip(event) {
        // Remove existing tooltip
        hideLegendTooltip();

        // Remove any existing selected state from dots
        document.querySelectorAll('.event-dot.selected').forEach(dot => {
            dot.classList.remove('selected');
        });

        // Find and highlight the clicked dot
        // First try to find by the event target if it's a dot
        let clickedDot = event.target;
        if (!clickedDot || !clickedDot.classList.contains('event-dot')) {
            // If not a direct dot click, find by artist and venue data attributes
            clickedDot = document.querySelector(`[data-artist="${event.properties.Artist}"][data-venue="${event.properties.Venue}"]`);
        }
        
        if (clickedDot && clickedDot.classList.contains('event-dot')) {
            clickedDot.classList.add('selected');
        }

        // Debug logging
        console.log('Event properties:', event.properties);

        const artist = event.properties.Artist || 'Unknown Artist';
        const venue = event.properties.Venue || 'Unknown Venue';
        const eventDate = event.properties.Date;
        const eventTime = event.properties.Time || 'Time TBA';
        const artistImage = event.properties.ArtistImage;
        const artistLink = event.properties.ArtistLink;
        const formattedDate = formatDate(eventDate);

        console.log('Extracted data:', { artist, venue, eventDate, eventTime, artistImage, artistLink, formattedDate });

        // Create tooltip element with enhanced content
        legendTooltip = document.createElement('div');
        legendTooltip.className = 'legend-tooltip';
        
        // Get additional venue information
        const venueInfo = getVenueInfo(venue);
        
        // Better datetime formatting
        let displayDateTime = formattedDate;
        if (eventTime && eventTime !== 'Time TBA') {
            displayDateTime += ` at ${eventTime}`;
        }
        
        // Create image element with better error handling
        // Fix image path by replacing backslashes and encoding spaces
        const fixedImagePath = artistImage ? artistImage.replace(/\\/g, '/').replace(/ /g, '%20') : null;
        const imageHtml = fixedImagePath ? 
            `<img src="${fixedImagePath}" alt="${artist}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\"artist-placeholder\\">🎵</div>'">` :
            '<div class="artist-placeholder">🎵</div>';
        
        legendTooltip.innerHTML = `
            <div class="legend-tooltip-content">
                <div class="legend-tooltip-header">
                    <div class="legend-tooltip-artist-image">
                        ${imageHtml}
                    </div>
                    <div class="legend-tooltip-artist-info">
                        <div class="legend-tooltip-artist-name">${artist}</div>
                        <div class="legend-tooltip-venue">📍 ${venue}</div>
                        ${venueInfo ? `<div class="legend-tooltip-venue-details">${venueInfo}</div>` : ''}
                        <div class="legend-tooltip-datetime">📅 ${displayDateTime}</div>
                        ${artistLink ? `<div class="legend-tooltip-link"><a href="${artistLink}" target="_blank" rel="noopener">🔗 View on Songkick</a></div>` : ''}
                    </div>
                </div>
                <div class="legend-tooltip-actions">
                    <button class="legend-tooltip-zoom-btn">📍 Zoom to Show</button>
                    <button class="legend-tooltip-close">×</button>
                </div>
            </div>
        `;

        // Add to page
        document.body.appendChild(legendTooltip);

        // Debug: Check if elements are created properly
        console.log('Legend tooltip created:', legendTooltip);
        console.log('Artist image element:', legendTooltip.querySelector('.legend-tooltip-artist-image'));
        console.log('Artist name element:', legendTooltip.querySelector('.legend-tooltip-artist-name'));
        console.log('Full tooltip HTML:', legendTooltip.innerHTML);
        
        // Debug positioning
        const tooltipRect = legendTooltip.getBoundingClientRect();
        const legendElement = document.querySelector('.legend');
        const legendRect = legendElement ? legendElement.getBoundingClientRect() : null;
        console.log('Tooltip position:', {
            bottom: tooltipRect.bottom,
            top: tooltipRect.top,
            left: tooltipRect.left,
            right: tooltipRect.right
        });
        console.log('Legend position:', legendRect ? {
            bottom: legendRect.bottom,
            top: legendRect.top,
            left: legendRect.left,
            right: legendRect.right
        } : 'Legend not found');

        // Add zoom functionality
        const zoomBtn = legendTooltip.querySelector('.legend-tooltip-zoom-btn');
        zoomBtn.addEventListener('click', () => {
            flyToEvent(event);
            hideLegendTooltip();
        });

        // Add close functionality
        const closeBtn = legendTooltip.querySelector('.legend-tooltip-close');
        closeBtn.addEventListener('click', () => {
            hideLegendTooltip();
        });

        // Auto-close after 8 seconds
        setTimeout(() => {
            if (legendTooltip && legendTooltip.parentNode) {
                hideLegendTooltip();
            }
        }, 8000);

        // Close on background click
        legendTooltip.addEventListener('click', (e) => {
            if (e.target === legendTooltip) {
                hideLegendTooltip();
            }
        });
    }

    function hideLegendTooltip() {
        if (legendTooltip) {
            legendTooltip.remove();
            legendTooltip = null;
        }
        
        // Remove selected state from all dots
        document.querySelectorAll('.event-dot.selected').forEach(dot => {
            dot.classList.remove('selected');
        });
    }

    // Function to get additional venue information
    function getVenueInfo(venueName) {
        const venueDetails = {
            'The Burl': 'Live music venue & arcade bar',
            'Manchester Music Hall': 'Historic downtown music venue',
            'Lexington Opera House': 'Historic performing arts center',
            'The Green Lantern': 'Intimate live music venue',
            'Al\'s Bar': 'Local dive bar with live music',
            'Al\'s Bar of Lexington': 'Local dive bar with live music',
            'Dreaming Creek Brewery': 'Craft brewery with live music'
        };
        
        return venueDetails[venueName] || null;
    }
});
