mapboxgl.accessToken =
  "pk.eyJ1IjoidnJvb212YXJ1biIsImEiOiJjbTlkaHByc2gxMmE0MmpvdnY2Mzlib2d4In0._qkTq2jObNykyg12MxjprQ";

const defaultCenter = [-122.0585, 36.9918];

const map = new mapboxgl.Map({
  container: "map",
  center: defaultCenter,
  zoom: 16,
  style: "mapbox://styles/mapbox/streets-v12",
  pitch: 30,
});

map.on("load", () => {
  // Add 3D buildings
  map.addLayer({
    id: "3d-buildings",
    source: "composite",
    "source-layer": "building",
    filter: ["==", "extrude", "true"],
    type: "fill-extrusion",
    minzoom: 15,
    paint: {
      "fill-extrusion-color": "#aaa",
      "fill-extrusion-height": ["get", "height"],
      "fill-extrusion-base": ["get", "min_height"],
      "fill-extrusion-opacity": 0.6,
    },
  });

  // Add study spots by address
  addMarkerFromAddress(
    "414 McHenry Rd, Santa Cruz, CA 95064",
    "McHenry Library"
  );
  addMarkerFromAddress("580 Red Hill Rd, Santa Cruz, CA 95064", "S&E Library");
  // go through first 13 rows in addresses.csv, parse out the address and location and call addMarkerFromAddress
  fetch("addresses.csv")
    .then((response) => response.text())
    .then((csvText) => {
      const results = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      const first10 = results.data.slice(0, 59);
      first10.forEach((row) => {
        const address = row["Address"];
        const location = row["Location"];
        console.log(`Loading address: ${address}, location: ${location}`);
        if (address && location) {
          addMarkerFromAddress(address.trim(), location.trim());
        }
      });
    })
    .catch((err) => console.error("Error loading addresses.csv:", err));
});

// Geolocation
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const userLocation = [
        position.coords.longitude,
        position.coords.latitude,
      ];
      map.setCenter(userLocation);
      new mapboxgl.Marker({ color: "blue" })
        .setLngLat(userLocation)
        .setPopup(new mapboxgl.Popup().setHTML("<b>You are here</b>"))
        .addTo(map);
    },
    () => console.warn("Geolocation failed. Using default center.")
  );
}

// Geocode and place a marker
function addMarkerFromAddress(address, label) {
  const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    address
  )}.json?access_token=${mapboxgl.accessToken}`;

  fetch(endpoint)
    .then((res) => res.json())
    .then((data) => {
      console.log(`Geocoding result for ${label}:`, data);
      if (data.features && data.features.length > 0) {
        const coords = data.features[0].center;
        new mapboxgl.Marker()
          .setLngLat(coords)
          .setPopup(new mapboxgl.Popup().setHTML(`<h3>${label}</h3>`))
          .addTo(map);
      } else {
        console.error(`No location found for ${label}`);
      }
    })
    .catch((err) => console.error(`Geocoding error for "${label}":`, err));
}
