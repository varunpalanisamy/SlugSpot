// studySpots.js

// Attach initMap to the window to ensure it is globally accessible.
window.initMap = function () {
  // Initialize the map at a default center.
  const defaultCenter = { lat: 36.9918, lng: -122.0585 };
  const map = new google.maps.Map(document.getElementById("map"), {
    center: defaultCenter,
    zoom: 16,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
  });

  // Example: Show the user's current location.
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        map.setCenter(userLocation);
        new google.maps.Marker({
          position: userLocation,
          map: map,
          title: "You are here",
          icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        });
      },
      () => console.warn("Geolocation failed. Using default center.")
    );
  }

  // Create a Geocoder instance.
  const geocoder = new google.maps.Geocoder();

  // Helper function: geocode an address, add a marker, and attach a click listener for an InfoWindow.
  function geocodeAndPlaceMarker(address, label, color) {
    geocoder.geocode({ address: address }, (results, status) => {
      if (status === "OK" && results[0]) {
        const marker = new google.maps.Marker({
          map: map,
          position: results[0].geometry.location,
          title: label,
          icon: {
            url: `http://maps.google.com/mapfiles/ms/icons/${color}-dot.png`, // Use the color parameter
          },
        });
        // Create an InfoWindow that displays the location name.
        const infoWindow = new google.maps.InfoWindow({
          content: "<h3>" + label + "</h3>",
        });
        marker.addListener("click", () => {
          infoWindow.open(map, marker);
        });
      } else {
        console.error(`Geocode was not successful for ${label}: ${status}`);
      }
    });
  }

  // Add some hardcoded markers.
  // geocodeAndPlaceMarker("414 McHenry Rd, Santa Cruz, CA 95064", "McHenry Library");
  // geocodeAndPlaceMarker("580 Red Hill Rd, Santa Cruz, CA 95064", "S&E Library");

  // Load markers from addresses.csv.
  fetch("classes_addresses.csv")
    .then((response) => response.text())
    .then((csvText) => {
      const results = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });
      results.data.forEach((row) => {
        const address = row["Address"]?.trim();
        const location = row["Location"]?.trim();
        console.log(`Placing marker for ${location} at address: ${address}`);
        if (address && location) {
          geocodeAndPlaceMarker(address, location, "red");
        }
      });
    })
    .catch((err) => console.error("Error loading addresses.csv:", err));

  fetch("public_addresses.csv")
    .then((response) => response.text())
    .then((csvText) => {
      const results = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });
      results.data.forEach((row) => {
        const address = row["Address"]?.trim();
        const location = row["Location"]?.trim();
        console.log(`Placing marker for ${location} at address: ${address}`);
        if (address && location) {
          geocodeAndPlaceMarker(address, location, "green");
        }
      });
    })
    .catch((err) => console.error("Error loading addresses.csv:", err));
};
