document.addEventListener('DOMContentLoaded', function () {
    var originalCenter = [38.0406, -84.5037]; // Lexington KY coordinates
    var originalZoom = 13;
    var map = L.map('map').setView(originalCenter, originalZoom); // Center map on Lexington, KY

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // add a selector for closing and opening a box for the description
    document.querySelector('.description').addEventListener('click', function() {
        this.classList.toggle('open');
      });

    // load the venues/events joined geojson file asyncronously 
    fetch('shp/merged_venues_events.geojson')
        .then(function (response) {
            return response.json();
        })
        .then(function (json) {
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

            // Create GeoJSON layers and legend
            addLegend(byDate, dates, colorPalette);
            addGeoJSONLayers(byDate, dates, colorPalette);
        });

    // Map click event to reset the view
    map.on('click', function () {
        map.flyTo(originalCenter, originalZoom);
    });

    function addLegend(data, dates, colorPalette) {
        var legend = L.control({
            position: 'bottomleft'
        });

        legend.onAdd = function (map) {
            var div = L.DomUtil.create('div', 'legend');
            div.innerHTML = '<h4>Event Calendar: Sept 26 - Oct 26</h4>';
            dates.forEach(function (date, index) {
                var dayDiv = L.DomUtil.create('div', 'calendar-day', div);
                dayDiv.innerHTML = `<div style="position: absolute; top: 0; width: 100%;">${new Date(date).getDate()}</div>`;

                data[date].forEach(function (event, idx) {
                    var dot = L.DomUtil.create('div', 'event-dot', dayDiv);
                    dot.style.backgroundColor = colorPalette[index];
                    // Add a title tooltip
                    dot.title = `Artist: ${event.properties.Artist}, Venue: ${event.properties.Venue}`;
                    // If you want more interactive or styled tooltips, use an attribute and CSS/JS
                    dot.setAttribute('data-artist', event.properties.Artist);
                    dot.setAttribute('data-venue', event.properties.Venue);
                });
            });
            return div;
        };
        legend.addTo(map);
    }



    // function to read the points data from the geojson object, convert to circleMarkers, 
    // then apply the colorPallette function to them
    function addGeoJSONLayers(data, dates, colorPalette) {
        dates.forEach(function (date, index) {
            L.geoJSON(data[date], {
                pointToLayer: function (feature, latlng) {
                    var marker = L.circleMarker(latlng, { // create circleMarkers and style the fillColor
                        radius: 8,
                        fillColor: colorPalette[index],
                        color: '#000',
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.8
                    }).on('click', function (e) {
                        // Calculate the offset position to put the marker in the lower right-hand corner
                        var offsetLat = e.latlng.lat + 0.001;
                        var offsetLng = e.latlng.lng - 0.004 * map.getSize().x / map.getSize().y;
                        map.flyTo([offsetLat, offsetLng], 16); // Fly to the new position with a closer zoom
                    });

                    // Redefine the popup content with new layout
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

    // create a color pallette for the points and the legend symbols
    function generateColorPalette(count) {
        var colors = [];
        var baseHue = 0; // Starting hue
        for (var i = 0; i < count; i++) {
            colors.push(`hsl(${(baseHue + i * 137) % 360}, 70%, 50%)`); // Using a prime number to scatter hues evenly
        }
        return colors;
    }

});