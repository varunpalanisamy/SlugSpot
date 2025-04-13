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
  
    testClasses.forEach((cls) => {
      const endpoint = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        cls.address
      )}&key=${window.GOOGLE_MAPS_API_KEY}`;
  
      fetch(endpoint)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "OK" && data.results[0]) {
            const coords = data.results[0].geometry.location;
            const marker = new google.maps.Marker({
              position: coords,
              map,
              icon: {
                url: "http://maps.google.com/mapfiles/ms/icons/pink-dot.png",
              },
              title: `${cls.className}`,
            });
  
            // Hide by default
            marker.setVisible(false);
  
            // Add info window
            const infoWindow = new google.maps.InfoWindow({
              content: `<h3>${cls.className}</h3><p>${cls.time}</p><p>${cls.location}</p>`,
            });
  
            marker.addListener("click", () => {
              infoWindow.open(map, marker);
            });
  
            markerGroups.test.push(marker); // ✅ Now marker is defined here
          } else {
            console.error(`Could not geocode address: ${cls.address}`);
          }
        })
        .catch((err) =>
          console.error(`Error geocoding for ${cls.className}:`, err)
        );
    });
  }
  
