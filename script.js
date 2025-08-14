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
            
            // Create calendar days
            dates.forEach(function (date, index) {
                const dayDiv = L.DomUtil.create('div', 'calendar-day', div);
                const dayNumber = new Date(date).getDate();
                dayDiv.innerHTML = `<div style="position: absolute; top: 0; width: 100%;">${dayNumber}</div>`;

                data[date].forEach(function (event) {
                    const dot = L.DomUtil.create('div', 'event-dot', dayDiv);
                    dot.style.backgroundColor = colorPalette[index];
                    dot.title = `${event.properties.Artist} at ${event.properties.Venue}`;
                    dot.setAttribute('data-artist', event.properties.Artist);
                    dot.setAttribute('data-venue', event.properties.Venue);
                    
                    // Add click handler for legend dots
                    dot.addEventListener('click', () => {
                        flyToEvent(event);
                    });
                });
            });
            
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
});
