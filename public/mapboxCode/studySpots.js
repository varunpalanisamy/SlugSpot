let map;
const markerGroups = {
  class: [],
  study: [],
  food: [],
  test: [],
};

// Attach initMap globally
window.initMap = function () {
  const defaultCenter = { lat: 36.9918, lng: -122.0585 };
  map = new google.maps.Map(document.getElementById("map"), {
    center: defaultCenter,
    zoom: 16,
    tilt: 45,
    heading: 45,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
  });

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      const userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      map.setCenter(userLocation);
      new google.maps.Marker({
        position: userLocation,
        map,
        title: "You are here",
        icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
      });
    });
  }

  const geocoder = new google.maps.Geocoder();

  function geocodeAndPlaceMarker(address, label, color, category) {
    geocoder.geocode({ address: address }, (results, status) => {
      if (status === "OK" && results[0]) {
        const marker = new google.maps.Marker({
          map,
          position: results[0].geometry.location,
          title: label,
          icon: {
            url: `http://maps.google.com/mapfiles/ms/icons/${color}-dot.png`,
          },
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `<h3>${label}</h3>`,
        });

        marker.addListener("click", () => {
          infoWindow.open(map, marker);
        });

        markerGroups[category].push(marker);
        marker.setVisible(false); // Start hidden
      } else {
        console.error(`Geocode failed for ${label}: ${status}`);
      }
    });
  }

  function normalizeLocation(rawLoc) {
    return rawLoc.replace(/^(LEC:|SEM:|LAB:)?\s*/, "").trim();
  }

  function geocodeAndPlaceMultiMarker(address, locationsArray, color, category) {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: address }, (results, status) => {
      if (status === "OK" && results[0]) {
        const marker = new google.maps.Marker({
          map,
          position: results[0].geometry.location,
          title: `Classes here: ${locationsArray.length}`,
          icon: {
            url: `http://maps.google.com/mapfiles/ms/icons/${color}-dot.png`,
          },
        });
        marker.setVisible(false);
  
        let contentHtml = "<div style='min-width: 200px;'>";
        if (locationsArray.length === 1) {
          // Instead of just showing the text, make it a link:
          const loc = locationsArray[0];
          const link = `/pickaroom?day=Monday&location=${encodeURIComponent(loc)}`;
          contentHtml += `<h3><a href="${link}" style="text-decoration:none; color:blue;">${loc}</a></h3>`;
        } else {
          contentHtml += `<h3>Multiple Classes:</h3>`;
          contentHtml += `<ul style="padding-left: 1.2em;">`;
          locationsArray.forEach(loc => {
            // Make each item a link to pickaroom
            const link = `/pickaroom?day=Monday&location=${encodeURIComponent(loc)}`;
            contentHtml += `<li><a href="${link}" style="text-decoration:none; color:blue;">${loc}</a></li>`;
          });
          contentHtml += `</ul>`;
        }
        contentHtml += "</div>";
  
        const infoWindow = new google.maps.InfoWindow({ content: contentHtml });
        marker.addListener("click", () => {
          infoWindow.open(map, marker);
        });
  
        markerGroups[category].push(marker);
      } else {
        console.error(`Geocode failed for ${address}: ${status}`);
      }
    });
  }
  
 
  fetch("/mapboxCode/test.csv")
  .then((res) => res.text())
  .then((csvText) => {
    const results = Papa.parse(csvText, { header: true, skipEmptyLines: true });

    // This object will map: address -> array of "locations"
    const addressMap = {};

    results.data.forEach((row) => {
      const address = row["Address"]?.trim();
      const location = row["Location"]?.trim();
      if (!address || !location) return;

      // Group by address
      if (!addressMap[address]) {
        addressMap[address] = [];
      }
      addressMap[address].push(location);
    });

    // Now addressMap might look like:
    // {
    //   "606 Engineering Loop, Santa Cruz, CA 95064": ["J Baskin Engr 372", "J Baskin Engr 169"],
    //   "710 College Nine Road, Santa Cruz, CA 95064": ["Soc Sci 1 110", "Soc Sci 1 461", ...],
    //   ...
    // }

    // Next, for each address, geocode once and place a single marker.
    Object.keys(addressMap).forEach((address) => {
      const locArray = addressMap[address];
      geocodeAndPlaceMultiMarker(address, locArray, "red", "class"); 
        // color & category can be changed as needed
    });
  });


  fetch("/mapboxCode/public_addresses.csv")
    .then((res) => res.text())
    .then((csvText) => {
      const results = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });
      results.data.forEach((row) => {
        const address = row["Address"]?.trim();
        const location = row["Location"]?.trim();
        if (address && location) {
          geocodeAndPlaceMarker(address, location, "green", "study");
        }
      });
    });

  fetch("/mapboxCode/food_addresses.csv")
    .then((res) => res.text())
    .then((csvText) => {
      const results = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });
      results.data.forEach((row) => {
        const address = row["Address"]?.trim();
        const location = row["Location"]?.trim();
        if (address && location) {
          geocodeAndPlaceMarker(address, location, "purple", "food");
        }
      });
    });

  if (typeof initMarkers === "function") {
    initMarkers(map);
  }
};

// Toggle marker visibility
window.toggleMarkers = function (type) {
  if (!markerGroups[type] || markerGroups[type].length === 0) {
    console.warn(`No markers found for type: ${type}`);
    return;
  }
  const currentlyVisible = markerGroups[type].some(m => m.getVisible());
  markerGroups[type].forEach(marker => {
    marker.setVisible(!currentlyVisible);
  });
  console.log(
    `${!currentlyVisible ? "Showing" : "Hiding"} ${markerGroups[type].length} "${type}" markers`
  );
};
