let map;
const scheduledClasses = new Map();
const markerGroups = {
  class: [],
  study: [],
  food: [],
  test: [],
};

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
        marker.setVisible(false);
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
          const loc = locationsArray[0];
          const link = `/pickaroom?day=Monday&location=${encodeURIComponent(loc)}`;
          contentHtml += `<h3><a href="${link}" style="text-decoration:none; color:blue;">${loc}</a></h3>`;
        } else {
          contentHtml += `<h3>Multiple Classes:</h3>`;
          contentHtml += `<ul style="padding-left: 1.2em;">`;
          locationsArray.forEach(loc => {
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

    const addressMap = {};

    results.data.forEach((row) => {
      const address = row["Address"]?.trim();
      const location = row["Location"]?.trim();
      if (!address || !location) return;

      if (!addressMap[address]) {
        addressMap[address] = [];
      }
      addressMap[address].push(location);
    });

    Object.keys(addressMap).forEach((address) => {
      const locArray = addressMap[address];
      geocodeAndPlaceMultiMarker(address, locArray, "red", "class"); 
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


window.showClosestSpots = async function () {
  if (!navigator.geolocation) {
    alert("Geolocation not supported.");
    return;
  }

  navigator.geolocation.getCurrentPosition(async (position) => {
    const userLatLng = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };

    for (let type in markerGroups) {
      markerGroups[type].forEach(marker => marker.setVisible(false));
    }

    new google.maps.Marker({
      position: userLatLng,
      map,
      title: "You are here",
      icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
    });

    const closest = {};
    const types = ["study", "food", "class"];

    for (const type of types) {
      const markers = markerGroups[type];
      if (!markers || markers.length === 0) continue;

      const distances = await Promise.all(
        markers.map(marker => getWalkingTime(userLatLng, marker.getPosition()))
      );

      const combined = markers.map((marker, i) => ({
        marker,
        distance: distances[i],
        label: marker.getTitle(), 
      }));

      if (type === "class") {
        const oneHour = 60;
      
        const currentDay = "M";
        const currentTimeMins = 15 * 60;
      
        // Real-time version (for future):
        // const now = new Date();
        // const currentDay = ["Su", "M", "Tu", "W", "Th", "F", "Sa"][now.getDay()];
        // const currentTimeMins = now.getHours() * 60 + now.getMinutes();
      
        const validEntries = combined.filter((entry) => {
          const title = entry.marker.getTitle();
          const classTimes = scheduledClasses.get(title);
          if (!classTimes) return true;
      
          let foundSubClassFree = false;
          for (let [start, end] of classTimes) {
            
            // Hardcoded demo for "M 3:00 PM"
            const oneHour = 60;
            const currentTimeMins = 15 * 60; 
            if (end <= currentTimeMins || start >= currentTimeMins + oneHour) {
              foundSubClassFree = true;
              break;
            }
          }
          return foundSubClassFree;

        });
      
        const uniqueByBuilding = {};
        for (let entry of validEntries) {
          const title = entry.marker.getTitle();
          const building = title.split(" ")[0];
          if (!uniqueByBuilding[building] || entry.distance < uniqueByBuilding[building].distance) {
            uniqueByBuilding[building] = entry;
          }
        }
      
        combined.length = 0;
        combined.push(...Object.values(uniqueByBuilding));
      }
      

      // Sort and show top 3
      combined
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3)
        .forEach(entry => entry.marker.setVisible(true));
    }
  });
};


window.showBetweenClassSpots = async function () {
  if (!markerGroups.test || markerGroups.test.length < 2) {
    alert("You need at least two class locations to use this feature.");
    return;
  }

  const class1 = markerGroups.test[0].getPosition();
  const class2 = markerGroups.test[1].getPosition();

  for (let type in markerGroups) {
    markerGroups[type].forEach(marker => marker.setVisible(false));
  }

  markerGroups.test.forEach(m => m.setVisible(true));

  const types = ["study", "food", "class"];
  for (const type of types) {
    const markers = markerGroups[type];
    if (!markers || markers.length === 0) continue;

    const distances = await Promise.all(
      markers.map(async (marker) => {
        const toFromClass1 = await getWalkingTime(class1, marker.getPosition());
        const toFromClass2 = await getWalkingTime(marker.getPosition(), class2);
        return {
          marker,
          total: toFromClass1 + toFromClass2,
          label: marker.getTitle(),
        };
      })
    );

    let uniqueMap = {};
    if (type === "class") {
      distances.forEach(entry => {
        const building = entry.label.split(" ")[0]; 
        if (!uniqueMap[building] || entry.total < uniqueMap[building].total) {
          uniqueMap[building] = entry;
        }
      });
      distances.length = 0;
      distances.push(...Object.values(uniqueMap));
    }

    distances
      .sort((a, b) => a.total - b.total)
      .slice(0, 3)
      .forEach(entry => entry.marker.setVisible(true));
  }
};

