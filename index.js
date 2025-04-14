const express = require("express");
const path = require("path");
const fs = require("fs");
const csv = require("csv-parser");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

app.use(express.urlencoded({ extended: true }));

let classData = [];
fs.createReadStream(
  path.join(__dirname, "public", "data", "occupied_rooms.csv")
)
  .pipe(csv())
  .on("data", (row) => {
    classData.push(row);
  })
  .on("end", () => {
    console.log("CSV loaded for pick-a-room, total rows:", classData.length);
  });

let userClasses = [];

function parseDayTime(dtStr) {
  const regex = /([A-Za-z]+)\s+(\d{1,2}:\d{2}[AP]M)-(\d{1,2}:\d{2}[AP]M)/;
  const match = dtStr.match(regex);
  if (match) {
    return { days: match[1], start: match[2], end: match[3] };
  }
  return null;
}

function timeToMinutes(timeStr) {
  let parsed = dayjs(timeStr, "hh:mmA");
  if (!parsed.isValid()) {
    parsed = dayjs(timeStr, "h:mmA");
  }
  if (!parsed.isValid()) {
    console.log("Time parse fail:", timeStr);
    return 0;
  }
  const minutesFromMidnight = parsed.hour() * 60 + parsed.minute();
  return minutesFromMidnight - 420; 
}



// Root redirect to /home
app.get("/", (req, res) => {
  res.redirect("/home");
});


app.get("/home", (req, res) => {
  const day = req.query.day || "Monday";
  const dayMapping = {
    Monday: "M",
    Tuesday: "Tu",
    Wednesday: "W",
    Thursday: "Th",
    Friday: "F",
  };
  const dayAbbr = dayMapping[day] || "M";

  const scale = 0.75; 
  const totalMinutes = 1320 - 420;
  const calendarHeight = totalMinutes * scale;


  const bookings = userClasses

  .filter(c => c.days.includes(dayAbbr))
  .map(c => {
    const startOffset = timeToMinutes(c.start);
    const endOffset = timeToMinutes(c.end);
    const rawHeight = (endOffset - startOffset) * scale;
    const adjustedHeight = rawHeight - 5;
    return {
      className: c.className,
      timeRange: `${c.start} - ${c.end}`,
      top: startOffset * scale,
      height: adjustedHeight > 0 ? adjustedHeight : 0
    };
  });



  res.render("home", { day, bookings, scale, calendarHeight });
});


app.get("/config.js", (req, res) => {
  res.set("Content-Type", "application/javascript");
  res.send(`window.GOOGLE_MAPS_API_KEY = "${process.env.GOOGLE_MAPS_API_KEY}";`);
});

app.get("/map", (req, res) => {
  res.render("map");
});


// Returns a JSON array of the user's classes for Monday
app.get("/api/myclasses", (req, res) => {

  const day = "Monday";
  const dayMapping = {
    Monday: "M",
    Tuesday: "Tu",
    Wednesday: "W",
    Thursday: "Th",
    Friday: "F",
  };
  const dayAbbr = dayMapping[day] || "M";


  const mondayClasses = userClasses.filter((c) => c.days.includes(dayAbbr));

  res.json(mondayClasses);
});


app.get("/home/freerooms", (req, res) => {
  const day = req.query.day || "Monday";
  const timeStr = req.query.time; // e.g. "01:30PM"
  if (!timeStr) {
    return res.json([]);
  }

  const dayMapping = {
    Monday: "M",
    Tuesday: "Tu",
    Wednesday: "W",
    Thursday: "Th",
    Friday: "F",
  };
  const dayAbbr = dayMapping[day] || "M";
  const clickOffset = timeToMinutes(timeStr);

  const classesForDay = classData.filter((row) => {
    const dt = parseDayTime(row["Day/Time"]);
    if (!dt) return false;
    return dt.days.includes(dayAbbr);
  });

  let allRooms = new Set();
  for (let row of classesForDay) {
    let loc = row["Location"].replace(/^[A-Z]+:\s*/i, "").trim();
    allRooms.add(loc);
  }

  // Remove rooms that are occupied at the clicked time.
  for (let row of classesForDay) {
    const dt = parseDayTime(row["Day/Time"]);
    if (!dt) continue;
    const startMins = timeToMinutes(dt.start);
    const endMins = timeToMinutes(dt.end);
    if (clickOffset >= startMins && clickOffset < endMins) {
      let loc = row["Location"].replace(/^[A-Z]+:\s*/i, "").trim();
      allRooms.delete(loc);
    }
  }

  // Filter out bad room names.
  const disallowedPrefixes = [
    /^TA\s/i,
    /^CoastBio/i,
    /^Music Center/i,
    /^LEC/i,
    /^STU/i,
    /^SiliconValleyCtr/i,
    /^50 Mtr Pool/i,
    /^Harbor/i,
    /^East Gym/i,
    /^West Tennis Ct/i,
    /^East Field/i,
    /^OPERS Multi Purpose/i,
    /^Martial Arts/i,
    /^McHenry Lib/i,
    /^Sci & Engr Library/i,
    /^Ocean/i,
    /^LG/i,
    /^Biomed/i,
  ];
  function isDisallowed(room) {
    return disallowedPrefixes.some((pattern) => pattern.test(room));
  }
  let filteredRooms = Array.from(allRooms).filter(
    (room) => !isDisallowed(room)
  );
  filteredRooms.sort((a, b) =>
    a.localeCompare(b, "en", { sensitivity: "base" })
  );

  return res.json(filteredRooms);
});

app.get("/schedule", (req, res) => {
  const allClasses = Array.from(
    new Set(classData.map((row) => row["Class"].trim()))
  ).sort();
  res.render("schedule", { allClasses, userClasses });
});

app.post("/schedule", (req, res) => {
  const classCode = req.body.classCode.trim();
  if (!classCode) {
    return res.send("Please enter a class code.");
  }
  const record = classData.find((r) => r["Class"].trim().startsWith(classCode));
  if (!record) {
    return res.send("Could not find a class matching that code.");
  }
  const dt = parseDayTime(record["Day/Time"]);
  if (!dt) {
    return res.send("Found class, but could not parse its Day/Time.");
  }
  userClasses.push({
    className: record["Class"],
    location: record["Location"],
    days: dt.days,
    start: dt.start,
    end: dt.end,
  });

  res.redirect("/schedule");
});

app.post("/schedule/remove", (req, res) => {
  const classToRemove = req.body.classToRemove;
  userClasses = userClasses.filter((c) => c.className !== classToRemove);
  res.redirect("/schedule");
});

app.get("/pickaroom", (req, res) => {
  const day = req.query.day || "Monday";
  const location = req.query.location || "";
  const dayMapping = {
    Monday: "M",
    Tuesday: "Tu",
    Wednesday: "W",
    Thursday: "Th",
    Friday: "F",
  };
  const dayAbbr = dayMapping[day] || "M";

  const filtered = classData.filter((item) => {
    const dtObj = parseDayTime(item["Day/Time"]);
    if (!dtObj) return false;
    if (!dtObj.days.includes(dayAbbr)) return false;
    const normalizedLoc = item["Location"].replace(/^[A-Z]+:\s*/i, "");
    if (
      location &&
      !normalizedLoc.toLowerCase().includes(location.toLowerCase())
    )
      return false;
    return true;
  });

  const scale = 0.75;
  const totalMinutes = 1320 - 420;
  const calendarHeight = totalMinutes * scale;

  const bookings = filtered
    .map((item) => {
      const dtObj = parseDayTime(item["Day/Time"]);
      if (!dtObj) return null;
      const startOffset = timeToMinutes(dtObj.start);
      const endOffset = timeToMinutes(dtObj.end);
      return {
        className: item["Class"],
        location: item["Location"],
        timeRange: `${dtObj.start} - ${dtObj.end}`,
        top: startOffset * scale,
        height: (endOffset - startOffset) * scale,
      };
    })
    .filter(Boolean);

  const allLocations = Array.from(
    new Set(
      classData.map((row) => row["Location"].replace(/^[A-Z]+:\s*/i, "").trim())
    )
  ).sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));

  res.render("pickaroom", {
    day,
    locationFilter: location,
    bookings,
    scale,
    calendarHeight,
    allLocations,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
