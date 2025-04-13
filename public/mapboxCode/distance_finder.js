function initMarkers(map) {
  // 1) fetch user’s Monday classes from our new route
  const testClasses = [];
  fetch("/api/myclasses")
    .then((res) => res.json())
    .then((userClasses) => {
      console.log("✅ Received userClasses from /api/myclasses:");
      userClasses.forEach((cls, i) => {
        console.log(`Class ${i}:`, cls);
      });
      // => userClasses is an array of objects: [{ className, days, start, end }, ...]
      // 2) parse classes_addresses.csv so we can map each "className" to an "Address"
      return fetch("/mapboxCode/test.csv")
        .then((res) => res.text())
        .then((csvText) => {
          const parsed = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
          });
          console.log("✅ Parsed test.csv:");
          parsed.data.forEach((row, i) => {
            console.log(
              `Row ${i}: Location=${row["Location"]}, Address=${row["Address"]}`
            );
          });
          return { userClasses, addressRows: parsed.data };
        });
    })
    .then(({ userClasses, addressRows }) => {
      // 3) For each userClass, find the address in addressRows
      userClasses.forEach((cls, index) => {
        const normalizedClass = normalizeLocation(cls.location);
        console.log(`🔍 [${index}] Raw class location: ${cls.location}`);
        console.log(
          `🔍 [${index}] Normalized class location: ${normalizedClass}`
        );

        const matching = addressRows.find((row, rowIdx) => {
          const rawRowLoc = row["Class"] || row["Location"] || "";
          const normalizedRowLoc = normalizeLocation(rawRowLoc);
          console.log(
            `🆚 Comparing with row ${rowIdx} normalized location: ${normalizedRowLoc}`
          );
          return normalizedRowLoc === normalizedClass;
        });

        if (!matching) {
          console.warn(
            `❌ No address match for ${cls.className} → normalized: '${normalizedClass}'`
          );
          return;
        }

        const address = matching["Address"];
        console.log(`✅ Found address: ${address}`);
        geocodeAndPlacePinkMarker(map, cls, address);
      });
    })
    .catch((err) => {
      console.error("Error fetching user classes or addresses:", err);
    });

  const classCoords = { start: null, end: null };
  const breakStart = "11:45";
  const breakEnd = "13:20";
  const breakStartMin = timeToMinutes(breakStart);
  const breakEndMin = timeToMinutes(breakEnd);

  const scheduledClasses = new Map(); // location → list of [start, end] in minutes

  // Utility to parse time to minutes
  function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  }

  // Parses 'MWF 01:20PM-02:25PM' into [startMin, endMin]
  function parseClassTime(str) {
    const match = str.match(/(\d{1,2}:\d{2}[AP]M)-(\d{1,2}:\d{2}[AP]M)/);
    if (!match) return null;

    const [_, startStr, endStr] = match;

    const to24hr = (s) => {
      let [h, m] = s.replace(/AM|PM/, "").split(":").map(Number);
      if (s.includes("PM") && h !== 12) h += 12;
      if (s.includes("AM") && h === 12) h = 0;
      return h * 60 + m;
    };

    return [to24hr(startStr), to24hr(endStr)];
  }

  function normalizeLocation(rawLoc) {
    if (!rawLoc) return "";
    return rawLoc.replace(/^(LEC:|SEM:|LAB:)?\s*/, "").trim();
  }

  function locationHasConflict(loc) {
    const entries = scheduledClasses.get(loc);
    if (!entries) return false;
    return entries.some(
      ([start, end]) => start < breakEndMin && end > breakStartMin
    );
  }

  function geocodeAddress(address) {
    const endpoint = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${window.GOOGLE_MAPS_API_KEY}`;
    return fetch(endpoint)
      .then((res) => res.json())
      .then((data) =>
        data.status === "OK" ? data.results[0].geometry.location : null
      );
  }

  function getWalkingTime(from, to) {
    return new Promise((resolve, reject) => {
      const service = new google.maps.DistanceMatrixService();
      service.getDistanceMatrix(
        {
          origins: [from],
          destinations: [to],
          travelMode: google.maps.TravelMode.WALKING,
        },
        (response, status) => {
          if (status === "OK") {
            const durationSec = response.rows[0].elements[0].duration.value;
            resolve(durationSec / 60);
          } else {
            console.error("DistanceMatrixService failed:", status);
            reject(status);
          }
        }
      );
    });
  }

  // Step 1: Load class schedule first
  fetch("/data/occupied_rooms.csv")
    .then((res) => res.text())
    .then((csvText) => {
      const results = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      results.data.forEach((row) => {
        const loc = normalizeLocation(row["Location"]);
        const timeRange = parseClassTime(row["Day/Time"]);
        if (!timeRange) return;

        if (!scheduledClasses.has(loc)) scheduledClasses.set(loc, []);
        scheduledClasses.get(loc).push(timeRange);
      });

      // Step 2: Geocode test classes
      return Promise.all(
        testClasses.map((cls, i) =>
          geocodeAddress(cls.address).then((coords) => {
            if (!coords) return;

            const marker = new google.maps.Marker({
              position: coords,
              map,
              icon: {
                url: "http://maps.google.com/mapfiles/ms/icons/pink-dot.png",
              },
              title: `${cls.className}`,
            });

            marker.setVisible(false);

            const infoWindow = new google.maps.InfoWindow({
              content: `<h3>${cls.className}</h3><p>${cls.time}</p><p>${cls.location}</p>`,
            });

            marker.addListener("click", () => {
              infoWindow.open(map, marker);
            });

            markerGroups.test.push(marker);

            if (i === 0) classCoords.start = coords;
            if (i === 1) classCoords.end = coords;
          })
        )
      );
    })
    .then(() => {
      const sources = [
        { file: "public_addresses.csv", label: "📚 Study" },
        { file: "food_addresses.csv", label: "🍔 Food" },
        { file: "test.csv", label: "🚪 Classroom" },
      ];

      sources.forEach(({ file, label }) => {
        fetch(file)
          .then((res) => res.text())
          .then((csvText) => {
            const results = Papa.parse(csvText, {
              header: true,
              skipEmptyLines: true,
            });

            const validSpots = results.data.filter((row) => {
              const loc = normalizeLocation(row.Location || row.Class || "");
              return !locationHasConflict(loc);
            });

            Promise.all(
              validSpots.map((row) =>
                geocodeAddress(row.Address).then((coords) => {
                  if (!coords) return null;
                  if (!classCoords.start || !classCoords.end) {
                    console.warn("🚫 Missing start or end coordinates; skipping walk time calculations.");
                    return;
                  }
                  

                  return Promise.all([
                    getWalkingTime(classCoords.start, coords),
                    getWalkingTime(coords, classCoords.end),
                  ]).then(([fromStart, toNext]) => {
                    return {
                      name: row.Location || row.Class || row.Address,
                      address: row.Address,
                      fromStart: Math.round(fromStart),
                      toNext: Math.round(toNext),
                      totalTransit: Math.round(fromStart + toNext),
                      type: label,
                    };
                  });
                })
              )
            ).then((spots) => {
              console.log(`✅ ${label} spaces open between your classes:`);
              spots
                .filter(Boolean)
                .sort((a, b) => a.totalTransit - b.totalTransit)
                .forEach((spot) => {
                  console.log(
                    `${spot.type} — ${spot.name} (${spot.fromStart} min from class 1, ${spot.toNext} min to class 2)`
                  );
                });
            });
          });
      });
    });
}

// Helper to geocode + place pink marker
function geocodeAndPlacePinkMarker(map, clsObj, address) {
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: address }, (results, status) => {
    if (status === "OK" && results[0]) {
      const marker = new google.maps.Marker({
        map,
        position: results[0].geometry.location,
        title: clsObj.className,
        icon: {
          url: "http://maps.google.com/mapfiles/ms/icons/pink-dot.png",
        },
      });
      marker.setVisible(false); // default hidden until user toggles

      // infoWindow
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <h3>${clsObj.className}</h3>
          <p>Days: ${clsObj.days}</p>
          <p>Start: ${clsObj.start}, End: ${clsObj.end}</p>
        `,
      });
      marker.addListener("click", () => infoWindow.open(map, marker));

      // store in markerGroups["test"] so “Test Classes” button can show/hide
      markerGroups.test.push(marker);
    } else {
      console.error(`geocode failed for ${clsObj.className}:`, status);
    }
  });
}
