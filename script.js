// Initialize the map and set the view to the center of Lexington, KY
var originalLatLng = [38.0406, -84.5037];
var originalZoom = 13;
var map = L.map('mapid').setView(originalLatLng, originalZoom);

// Add OpenStreetMap tiles
L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.{ext}', {
    minZoom: 0,
    maxZoom: 20,
    attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    ext: 'png',
    apikey: '2c3cc290-ef3a-486a-86ec-bd0958a845b5'
}).addTo(map);

// Define the URL of the GeoJSON file
var geojsonUrl = 'shp/venues_gigs.geojson';

// Define a function to format the date and time
function formatDateTime(datetime) {
    var date = new Date(datetime);
    var options = {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    };
    var day = date.toLocaleDateString('en-US', options);
    var time = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
    return {
        day: day,
        time: time
    };
}

// Function to get the color based on the date difference
function getColor(datetime) {
    var eventDate = new Date(datetime);
    var now = new Date();
    var diffDays = Math.floor((eventDate - now) / (1000 * 60 * 60 * 24));

    if (diffDays <= 3) {
        return 'green';
    } else if (diffDays <= 7) {
        return 'yellow';
    } else {
        return 'red';
    }
}

// Group events by venue
function groupByVenue(data) {
    var venues = {};
    data.features.forEach(function (feature) {
        var venue = feature.properties.Venue;
        if (!venues[venue]) {
            venues[venue] = [];
        }
        venues[venue].push(feature);
    });
    return venues;
}

// Define a function to create popups for each venue
function createPopupContent(venue, events) {
    var popupContent = '<div class="popup-content"><div class="popup-location">' + venue + '</div><hr>';
    if (events.length > 5) {
        popupContent += '<ul>';
        events.forEach(function (event) {
            var formattedDateTime = formatDateTime(event.properties.Datetime);
            var color = getColor(event.properties.Datetime);
            popupContent += '<li><div style="color:' + color + ';" class="popup-datetime">' + formattedDateTime.day + ' - ' + formattedDateTime.time + '</div>' +
                '<div class="popup-artist"><a href="' + event.properties.ArtistLink + '" target="_blank">' + event.properties.Artist + '</a></div></li>';
        });
        popupContent += '</ul>';
    } else {
        events.forEach(function (event) {
            var formattedDateTime = formatDateTime(event.properties.Datetime);
            var color = getColor(event.properties.Datetime);
            popupContent += '<div style="color:' + color + ';" class="popup-datetime">' + formattedDateTime.day + ' - ' + formattedDateTime.time + '</div>' +
                '<div class="popup-artist"><a href="' + event.properties.ArtistLink + '" target="_blank">' + event.properties.Artist + '</a></div><hr>';
        });
    }
    popupContent += '</div>';
    return popupContent;
}

// Add legend to the map
function addLegend(map) {
    var legend = L.control({
        position: 'bottomright'
    });

    legend.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'legend');
        div.innerHTML += '<h4>Event Timing</h4>';
        div.innerHTML += '<div><span class="circle" style="background: green"></span><span>0-3 days</span></div>';
        div.innerHTML += '<div><span class="circle" style="background: yellow"></span><span>4-7 days</span></div>';
        div.innerHTML += '<div><span class="circle" style="background: red"></span><span>8+ days</span></div>';
        return div;
    };

    legend.addTo(map);
}

// Add back button functionality
function addBackButton() {
    var backButton = document.getElementById('back-button');
    backButton.style.display = 'block';
    backButton.addEventListener('click', function () {
        map.setView(originalLatLng, originalZoom);
        backButton.style.display = 'none';
    });
}

// Fetch the GeoJSON data and add it to the map
fetch(geojsonUrl)
    .then(response => response.json())
    .then(data => {
        var venues = groupByVenue(data);

        Object.keys(venues).forEach(function (venue) {
            var events = venues[venue];
            var latlng = [events[0].geometry.coordinates[1], events[0].geometry.coordinates[0]];
            var earliestEvent = events.reduce((earliest, current) => {
                return new Date(current.properties.Datetime) < new Date(earliest.properties.Datetime) ? current : earliest;
            });
            var color = getColor(earliestEvent.properties.Datetime);
            var marker = L.circleMarker(latlng, {
                radius: 8,
                fillColor: color,
                color: '#000',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(map);
            var popupContent = createPopupContent(venue, events);
            marker.bindPopup(popupContent);

            marker.on('click', function () {
                map.setView(latlng, 15); // Zoom in to the point
                addBackButton(); // Show the back button
            });
        });

        // Add the legend to the map
        addLegend(map);
    })
    .catch(error => {
        console.error('Error loading GeoJSON data:', error);
    });