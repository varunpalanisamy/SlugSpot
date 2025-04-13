function initMarkers(map) {
  const testClasses = [
    {
      className: "AM 11B - Math Methds Econ II",
      location: "Kresge Acad",
      time: "MWF 10:40AM-11:45AM",
      address: "510 Porter-Kresge Rd, Santa Cruz, CA 95064",
    },
    {
      className: "AM 20 - Math Methods II",
      location: "ClassroomUnit",
      time: "MWF 01:20PM-02:25PM",
      address: "520 Steinhart Way, Santa Cruz, CA 95064",
    },
  ];

  const classCoords = {
    start: null,
    end: null,
  };

  const breakStart = "11:45";
  const breakEnd = "13:20";

  function timeToMinutes(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  function overlapsBreak(schedule) {
    // Format: "MWF 12:00PM-01:05PM"
    const match = schedule.match(/(\d{1,2}:\d{2}[AP]M)-(\d{1,2}:\d{2}[AP]M)/);
    if (!match) return false;

    const parse = (t) =>
      timeToMinutes(
        t
          .replace("AM", "")
          .replace("PM", "")
          .trim()
          .replace(/^(\d):/, "0$1:")
      ) + (t.includes("PM") && !t.startsWith("12") ? 720 : 0);

    const [_, startTime, endTime] = match;
    const breakStartMin = timeToMinutes(breakStart);
    const breakEndMin = timeToMinutes(breakEnd);
    return parse(startTime) < breakEndMin && parse(endTime) > breakStartMin;
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
          unitSystem: google.maps.UnitSystem.IMPERIAL,
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

  Promise.all(
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
  ).then(() => {
    const sources = [
      { file: "public_addresses.csv", label: "📚 Study", tag: "study" },
      { file: "food_addresses.csv", label: "🍔 Food", tag: "food" },
      { file: "classes_addresses.csv", label: "🚫 Class", tag: "class" },
    ];

    sources.forEach(({ file, label, tag }) => {
      fetch(file)
        .then((res) => res.text())
        .then((csvText) => {
          const results = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
          });

          const filtered = results.data.filter((row) => {
            if (file === "classes_addresses.csv") {
              return !overlapsBreak(row["Day/Time"]);
            }
            return true;
          });

          Promise.all(
            filtered.map((row) =>
              geocodeAddress(row.Address).then((coords) => {
                if (!coords) return null;

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
            console.log(`✅ ${label} spots between your classes:`);
            spots
              .filter(Boolean)
              .sort((a, b) => a.totalTransit - b.totalTransit)
              .forEach((spot) => {
                console.log(
                  `${spot.type} — ${spot.name} (${spot.fromStart} min from first class, ${spot.toNext} min to next)`
                );
              });
          });
        });
    });
  });
}
