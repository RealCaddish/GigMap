document.addEventListener('DOMContentLoaded', function () {
    var originalCenter = [38.0406, -84.5037]; // Lexington KY coordinates
    var originalZoom = 13;

    // Detect mobile screen and disable scroll wheel zoom accordingly
    var isMobile = window.innerWidth <= 768;
    var map = L.map('map', {
        center: originalCenter,
        zoom: originalZoom,
        scrollWheelZoom: !isMobile,
        tap: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add listener for description toggle
    document.querySelector('.description').addEventListener('click', function () {
        this.classList.toggle('open');
    });

    // Add listener for legend toggle (if implemented in HTML)
    const legendToggle = document.getElementById('toggle-legend');
    if (legendToggle) {
        legendToggle.addEventListener('click', function () {
            document.querySelector('.legend').classList.toggle('collapsed');
        });
    }

    // Load the venues/events joined geojson file
    fetch('shp/merged_venues_events.geojson')
        .then(response => response.json())
        .then(json => {
            var byDate = {};
            json.features.forEach(function (feature) {
                var date = feature.properties.Date;
                if (!byDate[date]) {
                    byDate[date] = [];
                }
                byDate[date].push(feature);
            });

            var dates = Object.keys(byDate).sort();
            var colorPalette = generateColorPalette(dates.length);

            addLegend(byDate, dates, colorPalette);
            addGeoJSONLayers(byDate, dates, colorPalette);
        });

    // Map click event to reset the view
    map.on('click', function () {
        map.flyTo(originalCenter, originalZoom);
    });

    function addLegend(data, dates, colorPalette) {
        var legend = L.control({ position: 'bottomleft' });

        legend.onAdd = function (map) {
            var div = L.DomUtil.create('div', 'legend');
            div.innerHTML = '<h4>Event Calendar: Jul 04 - Jul 30</h4>';
            dates.forEach(function (date, index) {
                var dayDiv = L.DomUtil.create('div', 'calendar-day', div);
                dayDiv.innerHTML = `<div style="position: absolute; top: 0; width: 100%;">${new Date(date).getDate()}</div>`;

                data[date].forEach(function (event, idx) {
                    var dot = L.DomUtil.create('div', 'event-dot', dayDiv);
                    dot.style.backgroundColor = colorPalette[index];
                    dot.title = `Artist: ${event.properties.Artist}, Venue: ${event.properties.Venue}`;
                    dot.setAttribute('data-artist', event.properties.Artist);
                    dot.setAttribute('data-venue', event.properties.Venue);
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
                    var marker = L.circleMarker(latlng, {
                        radius: 8,
                        fillColor: colorPalette[index],
                        color: '#000',
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.8
                    }).on('click', function (e) {
                        var offsetLat = e.latlng.lat + 0.001;
                        var offsetLng = e.latlng.lng - 0.0001 * map.getSize().x / map.getSize().y;
                        map.flyTo([offsetLat, offsetLng], 17);
                    });

                    var popupContent = `
                        <div style="display: flex; align-items: flex-start; padding: 5px;">
                            <img src="${feature.properties['ArtistImage']}" alt="Image of ${feature.properties.Artist}"
                                style="width: 120px; height: 120px; object-fit: cover; margin-right: 10px; border: 2px solid #ddd; box-shadow: 3px 3px 5px rgba(0,0,0,0.1);">
                            <div>
                                <h1 style="margin: 0; font-size: 1.2em;">${feature.properties.Date}</h1>
                                <h2 style="margin: 5px 0 0 0; font-size: 1.1em;">${feature.properties.Artist}</h2>
                                <p style="margin: 5px 0 0 0;">${feature.properties.Venue}<br>${feature.properties.Time || 'TBA'}</p>
                            </div>
                        </div>
                    `;

                    marker.bindPopup(popupContent);
                    return marker;
                }
            }).addTo(map);
        });
    }

    function generateColorPalette(count) {
        var colors = [];
        var baseHue = 0;
        for (var i = 0; i < count; i++) {
            colors.push(`hsl(${(baseHue + i * 137) % 360}, 70%, 50%)`);
        }
        return colors;
    }
});
