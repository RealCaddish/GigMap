// Initialize the map and set the view to the center of Lexington, KY
var map = L.map('mapid').setView([38.0406, -84.5037], 13);

// Add OpenStreetMap tiles
L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.{ext}', {
	minZoom: 0,
	maxZoom: 20,
	attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	ext: 'png'
}).addTo(map);

// Define the URL of the GeoJSON file
var geojsonUrl = 'shp/venues_gigs.geojson';

// Define a function to style the GeoJSON points
function stylePoints(feature, latlng) {
    return L.circleMarker(latlng, {
        radius: 8,
        fillColor: 'red',
        color: '#000',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    });
}
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
// Define a function to create popups
function onEachFeature(feature, layer) {
    if (feature.properties && feature.properties.Venue && feature.properties.Artist && feature.properties.Datetime) {
        var formattedDateTime = formatDateTime(feature.properties.Datetime);
        var popupContent = '<strong>' + feature.properties.Venue + '</strong><br><hr>' +
            feature.properties.Artist + '<br><br>' +
            'Day: ' + formattedDateTime.day + '<br>' +
            'Time of performance: ' + formattedDateTime.time;
        layer.bindPopup(popupContent);
    }
}

// Fetch the GeoJSON data and add it to the map
fetch(geojsonUrl)
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, {
            pointToLayer: stylePoints,
            onEachFeature: onEachFeature
        }).addTo(map);
    })
    .catch(error => {
        console.error('Error loading GeoJSON data:', error);
    });