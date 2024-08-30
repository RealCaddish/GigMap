document.addEventListener('DOMContentLoaded', function () {
    var map = L.map('map').setView([38.0406, -84.5037], 13); // Center map on Lexington, KY

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    fetch('merged_venues_events.geojson')
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

    function addLegend(data, dates, colorPalette) {
        var legend = L.control({
            position: 'bottomright'
        });

        legend.onAdd = function (map) {
            var div = L.DomUtil.create('div', 'legend');
            div.innerHTML = '<h4>Event Calendar</h4>';
            dates.forEach(function (date, index) {
                var dayDiv = L.DomUtil.create('div', 'calendar-day', div);
                dayDiv.innerHTML = `<div style="position: absolute; top: 0; width: 100%;">${new Date(date).getDate()}</div>`; // Day number at top of the cell

                data[date].forEach(function (event, idx) {
                    var dot = L.DomUtil.create('div', 'event-dot', dayDiv);
                    dot.style.backgroundColor = colorPalette[index]; // Consistent color for all events on the same day
                    dot.title = `Event: ${event.properties.Artist}`; // Tooltip to show event detail
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
                        fillColor: colorPalette[index], // Use the same color for all events on the same day
                        color: '#000',
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.8
                    });

                    // Define the content of the popup
                    var popupContent = `
                        <div>
                            <img src="${feature.properties['Artist Image']}" alt="Artist Image" style="width:100%; max-height:150px; object-fit: cover;">
                            <h3 style="margin: 5px 0;">${feature.properties.Artist}</h3>
                            <h4 style="margin: 0; color: #666;">${feature.properties.Venue}</h4>
                        </div>
                    `;


                    // Bind the popup to the marker
                    marker.bindPopup(popupContent);

                    return marker;
                }
            }).addTo(map);
        });
    }


    function generateColorPalette(count) {
        var colors = [];
        var baseHue = 0; // Starting hue
        for (var i = 0; i < count; i++) {
            colors.push(`hsl(${(baseHue + i * 137) % 360}, 70%, 50%)`); // Using a prime number to scatter hues evenly
        }
        return colors;
    }

});