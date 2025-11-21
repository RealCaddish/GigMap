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
        const description = document.getElementById('description');
        const closeDescription = document.getElementById('close-description');
        const aboutBtn = document.getElementById('about-btn');
        const modalBackdrop = document.getElementById('modal-backdrop');

        // Open modal from About button
        if (aboutBtn) {
            aboutBtn.addEventListener('click', () => {
                openModal();
            });
        }

        // Close modal from close button
        if (closeDescription) {
            closeDescription.addEventListener('click', () => {
                closeModal();
            });
        }

        // Close modal from backdrop click
        if (modalBackdrop) {
            modalBackdrop.addEventListener('click', () => {
                closeModal();
            });
        }

        // Prevent modal content clicks from closing
        if (description) {
            description.addEventListener('click', (e) => {
                e.stopPropagation();
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

        // Keyboard navigation
        document.addEventListener('keydown', handleKeyboardNavigation);
    }

    function openModal() {
        const description = document.getElementById('description');
        const modalBackdrop = document.getElementById('modal-backdrop');
        
        if (description && modalBackdrop) {
            description.classList.add('active');
            modalBackdrop.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }
    }

    function closeModal() {
        const description = document.getElementById('description');
        const modalBackdrop = document.getElementById('modal-backdrop');
        
        if (description && modalBackdrop) {
            description.classList.remove('active');
            modalBackdrop.classList.remove('active');
            document.body.style.overflow = ''; // Restore scrolling
        }
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
        colorPalette = generateColorPalette(dates);

        addLegend(byDate, dates, colorPalette);
        addGeoJSONLayers(byDate, dates, colorPalette);
        
        // Ensure map is properly loaded before fitting bounds
        setTimeout(() => {
            // Trigger a resize to ensure proper bounds calculation
            map.invalidateSize();
        }, 100);
    }

    function addLegend(data, dates, colorPalette) {
        // Remove existing legend if it exists
        if (legend) {
            map.removeControl(legend);
            legend = null;
        }
        
        legend = L.control({ position: 'bottomleft' });

        legend.onAdd = function (map) {
            const div = L.DomUtil.create('div', 'legend');
            
            // Create header with date range and color legend
            const dateRange = getDateRange(dates);
            const header = L.DomUtil.create('h4', '', div);
            header.textContent = `Event Calendar: ${dateRange}`;
            
            // Create color legend
            const colorLegend = L.DomUtil.create('div', 'color-legend', div);
            const legendItems = [
                { color: 'hsl(0, 75%, 50%)', label: 'Tonight/Tomorrow' },
                { color: 'hsl(45, 75%, 55%)', label: 'This Week' },
                { color: 'hsl(150, 70%, 50%)', label: 'Next Week' },
                { color: 'hsl(220, 70%, 50%)', label: 'Later' }
            ];
            
            legendItems.forEach(item => {
                const legendItem = L.DomUtil.create('div', 'color-legend-item', colorLegend);
                const swatch = L.DomUtil.create('span', 'color-swatch', legendItem);
                swatch.style.backgroundColor = item.color;
                const label = L.DomUtil.create('span', 'color-label', legendItem);
                label.textContent = item.label;
            });
            
            // Add numbered marker example to legend
            const markerExampleItem = L.DomUtil.create('div', 'color-legend-item', colorLegend);
            const markerExample = L.DomUtil.create('span', 'legend-marker-example', markerExampleItem);
            markerExample.innerHTML = '<div style="width: 28px; height: 28px; border-radius: 50%; background: var(--primary-color); color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">5</div>';
            const markerLabel = L.DomUtil.create('span', 'color-label', markerExampleItem);
            markerLabel.textContent = '= # of events';
            
            // Create calendar container
            const calendarContainer = L.DomUtil.create('div', 'calendar-container', div);
            
            // Get today's date for comparison
            const today = new Date();
            const todayString = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
            
            // Check if today has events
            const hasTodayEvents = dates.includes(todayString);
            
            // Create calendar days
            dates.forEach(function (date, index) {
                const dayDiv = L.DomUtil.create('div', 'calendar-day', calendarContainer);
                const dayNumber = new Date(date).getDate();
                const dayLabel = L.DomUtil.create('div', 'calendar-day-label', dayDiv);
                dayLabel.textContent = dayNumber;

                // Check if this date is today and add highlighting class
                if (date === todayString) {
                    dayDiv.classList.add('today');
                } else {
                    // Get the color for this date (should match map markers)
                    // Only apply border-left if it's not today (today uses full border)
                    const dateColor = colorPalette[index];
                    dayDiv.style.borderLeft = `3px solid ${dateColor}`;
                }

                // Create events container showing artist names
                const eventsContainer = L.DomUtil.create('div', 'events-container', dayDiv);
                
                // Show up to 3 events, with "more" indicator if more exist
                const eventsToShow = data[date].slice(0, 3);
                const remainingCount = Math.max(0, data[date].length - 3);
                
                eventsToShow.forEach((event, eventIdx) => {
                    const eventCard = L.DomUtil.create('div', 'event-card', eventsContainer);
                    
                    // Prevent event bubbling from child elements
                    eventCard.style.pointerEvents = 'auto';
                    
                    const artistName = L.DomUtil.create('div', 'event-artist-name', eventCard);
                    artistName.textContent = event.properties.Artist;
                    
                    const venueName = L.DomUtil.create('div', 'event-venue-name', eventCard);
                    venueName.textContent = event.properties.Venue;
                    
                    // Always show time, use 'TBA' if not available
                    const eventTime = L.DomUtil.create('div', 'event-time', eventCard);
                    eventTime.textContent = event.properties.Time || 'TBA';
                    
                    // Add click handler only on the card itself
                    eventCard.addEventListener('click', (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        showLegendTooltip(event);
                    }, true); // Use capture phase
                    
                    // Add hover for desktop - only on card, not children
                    if (!isMobile) {
                        let hoverTimeout;
                        eventCard.addEventListener('mouseenter', (e) => {
                            e.stopPropagation();
                            clearTimeout(hoverTimeout);
                            hoverTimeout = setTimeout(() => {
                                showDesktopTooltip(event, e);
                            }, 100);
                        }, true);
                        
                        eventCard.addEventListener('mouseleave', (e) => {
                            e.stopPropagation();
                            clearTimeout(hoverTimeout);
                            hideDesktopTooltip();
                        }, true);
                    }
                });
                
                // Show "more" indicator if there are additional events
                if (remainingCount > 0) {
                    const moreIndicator = L.DomUtil.create('div', 'event-more-indicator', eventsContainer);
                    moreIndicator.textContent = `+${remainingCount} more`;
                    moreIndicator.style.cssText = 'font-size: 0.65rem; color: var(--primary-color); font-weight: 600; margin-top: 2px; pointer-events: none;';
                }
                
                // Prevent map dragging when interacting with calendar day
                L.DomEvent.disableScrollPropagation(dayDiv);
                L.DomEvent.disableClickPropagation(dayDiv);
            });
            
            // Removed "no events today" indicator as requested
            
            // Prevent map dragging when interacting with legend
            L.DomEvent.disableScrollPropagation(div);
            L.DomEvent.disableClickPropagation(div);
            
            // Also prevent dragging on the calendar container
            L.DomEvent.disableScrollPropagation(calendarContainer);
            L.DomEvent.disableClickPropagation(calendarContainer);
            
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

    function addGeoJSONLayers(data, dates, colorPalette) {
        // Collect all markers to fit them to the map view
        const allMarkers = [];
        
        // Group all events by venue coordinates to handle overlapping
        const venueGroups = {};
        const allEvents = [];
        
        // Collect all events with their dates
        dates.forEach(function (date, index) {
            data[date].forEach(function (feature) {
                const coords = feature.geometry.coordinates;
                const coordKey = coords[0] + ',' + coords[1];
                
                if (!venueGroups[coordKey]) {
                    venueGroups[coordKey] = [];
                }
                
                venueGroups[coordKey].push({
                    feature: feature,
                    date: date,
                    dateIndex: index,
                    color: colorPalette[index]
                });
            });
        });
        
        // Process each venue group
        Object.keys(venueGroups).forEach(coordKey => {
            const events = venueGroups[coordKey];
            
            // Sort events by date (closest to today first for color selection)
            const today = new Date();
            events.sort((a, b) => {
                const daysA = Math.abs((new Date(a.date) - today) / (1000 * 60 * 60 * 24));
                const daysB = Math.abs((new Date(b.date) - today) / (1000 * 60 * 60 * 24));
                return daysA - daysB;
            });
            
            // Use color of closest upcoming event - find the date index to get matching color
            const closestDate = events[0].date;
            const dateIndex = dates.indexOf(closestDate);
            const primaryColor = dateIndex >= 0 ? colorPalette[dateIndex] : events[0].color;
            
            // Calculate marker size based on event count (larger for more events)
            const baseRadius = getMarkerRadius();
            const eventCount = events.length;
            const radius = eventCount === 1 ? baseRadius : baseRadius + (Math.min(eventCount - 1, 5) * 2); // Max +10px for 6+ events
            
            // Create single marker with event count
            const marker = createMarker(events[0].feature, primaryColor, radius, false, 0, eventCount);
            marker.eventCount = eventCount;
            marker.allEvents = events.map(e => e.feature);
            
            allMarkers.push(marker);
        });
        
        // Fit all markers to the map view with padding
        if (allMarkers.length > 0) {
            const group = new L.featureGroup(allMarkers);
            const bounds = group.getBounds();
            
            map.fitBounds(bounds, {
                padding: [50, 50],
                maxZoom: 15, // Don't zoom in too much
                animate: true,
                duration: 1
            });
        }
    }
    
    function createMarker(feature, color, radius, isRing = false, ringIndex = 0, totalRings = 1) {
        const latlng = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];
        
        // totalRings represents event count
        const eventCount = totalRings || 1;
        let marker;
        
        if (eventCount > 1) {
            // Multiple events - use divIcon with count badge
            const size = radius * 2;
            const iconHtml = `
                <div class="marker-count-badge" style="
                    background: ${color};
                    color: white;
                    border-radius: 50%;
                    width: ${size}px;
                    height: ${size}px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: ${Math.max(10, size * 0.35)}px;
                    font-weight: bold;
                    border: 3px solid white;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.4);
                    transition: transform 0.2s ease;
                ">${eventCount}</div>
            `;
            
            const customIcon = L.divIcon({
                className: 'custom-marker-with-count',
                html: iconHtml,
                iconSize: [size, size],
                iconAnchor: [size / 2, size / 2],
                popupAnchor: [0, -size / 2]
            });
            
            marker = L.marker(latlng, { icon: customIcon });
            
            // Add hover effects for divIcon marker
            marker.on('mouseover', function () {
                const badge = this._icon?.querySelector('.marker-count-badge');
                if (badge) {
                    badge.style.transform = 'scale(1.15)';
                    badge.style.boxShadow = '0 4px 15px rgba(0,0,0,0.5)';
                }
            });
            
            marker.on('mouseout', function () {
                const badge = this._icon?.querySelector('.marker-count-badge');
                if (badge) {
                    badge.style.transform = 'scale(1)';
                    badge.style.boxShadow = '0 2px 10px rgba(0,0,0,0.4)';
                }
            });
        } else {
            // Single event - use circleMarker
            marker = L.circleMarker(latlng, {
                radius: radius,
                fillColor: color,
                color: '#000',
                weight: 1.5,
                opacity: 1,
                fillOpacity: 0.85
            });
            
            // Add hover effects for circleMarker
            marker.on('mouseover', function () {
                this.setRadius(radius + 2);
            });

            marker.on('mouseout', function () {
                this.setRadius(radius);
            });
        }

        // Add click handler with optimized behavior
        marker.on('click', function (e) {
            e.originalEvent.stopPropagation();
            handleMarkerClick(e, feature);
        });

        // Bind optimized popup (will show all events if multiple)
        const popupContent = createPopupContent(feature);
        marker.bindPopup(popupContent, {
            maxWidth: getPopupMaxWidth(),
            className: 'custom-popup',
            closeButton: true,
            autoPan: true,
            autoPanPadding: [50, 50]
        });

        marker.addTo(map);
        return marker;
    }

    function createPopupContent(feature) {
        const { Artist, Venue, Date: eventDate, Time, ArtistImage } = feature.properties;
        
        // Check if there are multiple events at this venue
        const venueEvents = getVenueEvents(Venue);
        
        if (venueEvents.length === 1) {
            // Single event - show normal popup with relative date
            const relDate = formatRelativeDate(eventDate);
            return `
                <div class="popup-content">
                    ${ArtistImage ? `<img src="${ArtistImage}" alt="${Artist}" class="popup-image" onerror="this.style.display='none'">` : ''}
                    <div class="popup-info">
                        <div class="popup-date-badge" style="background-color: ${relDate.color};">${relDate.label}</div>
                        <div class="popup-artist">${Artist}</div>
                        <div class="popup-venue">📍 ${Venue}</div>
                        <div class="popup-time">🕐 ${Time || 'TBA'}</div>
                        <div class="popup-full-date">${relDate.full}</div>
                    </div>
                </div>
            `;
        } else {
            // Multiple events - show venue summary with all events, images, and relative dates
            const eventsHtml = venueEvents
                .sort((a, b) => new Date(a.Date) - new Date(b.Date))
                .map(event => {
                    const relDate = formatRelativeDate(event.Date);
                    const imagePath = event.ArtistImage || '';
                    return `
                        <div class="popup-event-card" style="border-left: 3px solid ${relDate.color};">
                            <div class="popup-event-image-wrapper">
                                ${imagePath ? `<img src="${imagePath}" alt="${event.Artist}" class="popup-event-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />` : '<div class="popup-event-image-placeholder" style="display: flex;">🎵</div>'}
                                ${imagePath ? '<div class="popup-event-image-placeholder" style="display: none;">🎵</div>' : ''}
                            </div>
                            <div class="popup-event-details">
                                <div class="popup-event-date-badge" style="background-color: ${relDate.color};">${relDate.label}</div>
                                <div class="popup-event-artist">${event.Artist}</div>
                                <div class="popup-event-meta">
                                    <span class="popup-event-time">🕐 ${event.Time || 'TBA'}</span>
                                    <span class="popup-event-full-date">${relDate.full}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            
            return `
                <div class="popup-content multi-event">
                    <div class="popup-venue-header">
                        <h3 class="popup-venue-title">📍 ${Venue}</h3>
                        <div class="popup-events-count">${venueEvents.length} Upcoming Shows</div>
                    </div>
                    <div class="popup-events-list">
                        ${eventsHtml}
                    </div>
                </div>
            `;
        }
    }
    
    function getVenueEvents(venueName) {
        const events = [];
        Object.keys(venuesData).forEach(date => {
            venuesData[date].forEach(feature => {
                if (feature.properties.Venue === venueName) {
                    events.push(feature.properties);
                }
            });
        });
        return events;
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
        // Get all markers on the map and fit them to view
        const allMarkers = [];
        map.eachLayer(function(layer) {
            // Check for both CircleMarker (single events) and Marker (multi-event venues with divIcon)
            if (layer instanceof L.CircleMarker || (layer instanceof L.Marker && layer.options.icon)) {
                // Make sure it's not a base layer or other non-marker layer
                if (layer.getLatLng) {
                    allMarkers.push(layer);
                }
            }
        });
        
        if (allMarkers.length > 0) {
            const group = new L.featureGroup(allMarkers);
            map.fitBounds(group.getBounds(), {
                padding: [50, 50],
                maxZoom: 15,
                animate: true,
                duration: 1
            });
        } else {
            // Fallback to original center if no markers found
            map.flyTo(config.originalCenter, config.originalZoom, {
                duration: 1,
                easeLinearity: 0.25
            });
        }
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
                closeModal();
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
    function generateColorPalette(dates) {
        // Generate time-based color palette
        // Closer events = warmer colors (red/orange), further = cooler (blue/purple)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return dates.map(dateString => {
            const eventDate = new Date(dateString);
            eventDate.setHours(0, 0, 0, 0);
            const diffTime = eventDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Color scheme based on time distance:
            // 0-1 days (tonight/tomorrow): Red/Orange (urgent)
            // 2-3 days: Orange/Yellow (soon)
            // 4-7 days: Yellow/Green (this week)
            // 8-14 days: Green/Cyan (next week)
            // 15+ days: Blue/Purple (later)
            
            if (diffDays <= 1) {
                // Red to Orange (tonight/tomorrow)
                return `hsl(${0 + (diffDays * 15)}, 75%, 50%)`; // Red to Orange
            } else if (diffDays <= 3) {
                // Orange to Yellow (soon)
                return `hsl(${30 + ((diffDays - 1) * 15)}, 75%, 55%)`; // Orange to Yellow
            } else if (diffDays <= 7) {
                // Yellow to Green (this week)
                return `hsl(${60 + ((diffDays - 3) * 15)}, 70%, 50%)`; // Yellow to Green
            } else if (diffDays <= 14) {
                // Green to Cyan (next week)
                return `hsl(${120 + ((diffDays - 7) * 10)}, 70%, 50%)`; // Green to Cyan
            } else {
                // Blue to Purple (later)
                return `hsl(${200 + Math.min((diffDays - 14) * 5, 60)}, 70%, 50%)`; // Blue to Purple
            }
        });
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
    
    function formatRelativeDate(dateString) {
        const eventDate = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        eventDate.setHours(0, 0, 0, 0);
        
        const diffTime = eventDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Get color for this date using the same logic as generateColorPalette
        let color;
        if (diffDays <= 1) {
            color = `hsl(${0 + (diffDays * 15)}, 75%, 50%)`; // Red to Orange
        } else if (diffDays <= 3) {
            color = `hsl(${30 + ((diffDays - 1) * 15)}, 75%, 55%)`; // Orange to Yellow
        } else if (diffDays <= 7) {
            color = `hsl(${60 + ((diffDays - 3) * 15)}, 70%, 50%)`; // Yellow to Green
        } else if (diffDays <= 14) {
            color = `hsl(${120 + ((diffDays - 7) * 10)}, 70%, 50%)`; // Green to Cyan
        } else {
            color = `hsl(${200 + Math.min((diffDays - 14) * 5, 60)}, 70%, 50%)`; // Blue to Purple
        }
        
        if (diffDays === 0) {
            return { label: 'Tonight', full: formatDate(dateString), color: color };
        } else if (diffDays === 1) {
            return { label: 'Tomorrow', full: formatDate(dateString), color: color };
        } else if (diffDays === 2) {
            return { label: 'In 2 Days', full: formatDate(dateString), color: color };
        } else if (diffDays >= 3 && diffDays <= 7) {
            return { label: 'This Week', full: formatDate(dateString), color: color };
        } else if (diffDays >= 8 && diffDays <= 14) {
            return { label: 'Next Week', full: formatDate(dateString), color: color };
        } else {
            return { label: formatDate(dateString), full: formatDate(dateString), color: color };
        }
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

    // Performance optimizations - Service Worker registration
    // Unregister any existing service workers on localhost
    if ('serviceWorker' in navigator) {
        if (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname === '') {
            // Unregister service workers for local development
            navigator.serviceWorker.getRegistrations().then(registrations => {
                registrations.forEach(registration => {
                    registration.unregister();
                });
            });
        } else {
            // Register service worker for production
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .catch(() => {
                        // Service worker registration failed - silently fail
                    });
            });
        }
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
        const clickedDot = event.target || document.querySelector('[data-artist="' + artist + '"][data-venue="' + venue + '"]');
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
            clickedDot = document.querySelector('[data-artist="' + event.properties.Artist + '"][data-venue="' + event.properties.Venue + '"]');
        }
        
        if (clickedDot && clickedDot.classList.contains('event-dot')) {
            clickedDot.classList.add('selected');
        }

        const artist = event.properties.Artist || 'Unknown Artist';
        const venue = event.properties.Venue || 'Unknown Venue';
        const eventDate = event.properties.Date;
        const eventTime = event.properties.Time || 'Time TBA';
        const artistImage = event.properties.ArtistImage;
        const artistLink = event.properties.ArtistLink;
        const formattedDate = formatDate(eventDate);

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
        
        // Force a repaint to ensure the tooltip is visible
        legendTooltip.offsetHeight;

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
