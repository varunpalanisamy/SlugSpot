// Declare initMap globally so that the callback from the Google Maps API can find it.
window.initMap = function() {
  // Initialize the map at the default center.
  const defaultCenter = { lat: 36.9918, lng: -122.0585 };
  const map = new google.maps.Map(document.getElementById("map"), {
    center: defaultCenter,
    zoom: 16,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
  });

  // Create one global InfoWindow that will be reused for all markers.
  const infoWindow = new google.maps.InfoWindow();

  // Show the user's current location.
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        map.setCenter(userLocation);
        new google.maps.Marker({
          position: userLocation,
          map: map,
          title: "You are here",
          icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
        });
      },
      () => console.warn("Geolocation failed. Using default center.")
    );
  }

  // Create a Geocoder instance.
  const geocoder = new google.maps.Geocoder();

  // Helper function: geocode an address, place a marker,
  // and attach a click listener that opens an InfoWindow with the location name.
  function geocodeAndPlaceMarker(address, label) {
    geocoder.geocode({ address: address }, (results, status) => {
      if (status === "OK" && results[0]) {
        const marker = new google.maps.Marker({
          map: map,
          position: results[0].geometry.location,
          title: label // This sets the marker's tooltip.
        });
        // Add a click listener to open the info window.
        marker.addListener("click", () => {
          infoWindow.setContent("<h3>" + label + "</h3>");
          infoWindow.open(map, marker);
        });
      } else {
        console.error(`Geocode was not successful for ${label}: ${status}`);
      }
    });
  }

  // Add some hardcoded markers as examples.
  geocodeAndPlaceMarker("414 McHenry Rd, Santa Cruz, CA 95064", "McHenry Library");
  geocodeAndPlaceMarker("580 Red Hill Rd, Santa Cruz, CA 95064", "S&E Library");

  // Load markers from addresses.csv.
  fetch("addresses.csv")
    .then((response) => response.text())
    .then((csvText) => {
      const results = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });
      // For each row in the CSV, geocode the address and place a marker.
      results.data.forEach((row) => {
        const address = row["Address"]?.trim();
        const location = row["Location"]?.trim();
        console.log(`Placing marker for ${location} at address: ${address}`);
        if (address && location) {
          geocodeAndPlaceMarker(address, location);
        }
      });
    })
    .catch((err) => console.error("Error loading addresses.csv:", err));
};
