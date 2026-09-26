/* Synthetic coordinates follow the existing monthly-report parser, not a real pilot's PDF. */
function makePdf({
  pilotName = "TEST PILOT",
  missingDay = 0,
  skippedFlight = false,
  pageCount = 1,
  fourFlights = false,
  month = 6,
} = {}) {
  const commands = [];
  const text = (value, x, y, size = 7) => {
    const safe = value.replace(/([\\()])/g, "\\$1");
    commands.push(
      "BT /F1 " +
        size +
        " Tf 1 0 0 1 " +
        x +
        " " +
        (800 - y) +
        " Tm (" +
        safe +
        ") Tj ET",
    );
  };
  const monthCode = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ][month - 1];
  const dayCount = new Date(Date.UTC(2026, month, 0)).getUTCDate();
  text("01" + monthCode + "26 - " + dayCount + monthCode + "26", 20, 40);
  text("PERS.NO: 12345 FO " + pilotName + " A/C QUAL: A350", 20, 60);
  const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  for (let day = 1; day <= dayCount; day++) {
    if (day !== missingDay)
      text(
        day + weekdays[new Date(Date.UTC(2026, month - 1, day)).getUTCDay()],
        120 + (day - 1) * 40,
        100,
        6,
      );
  }
  text("DUTY", 20, 130);
  text("SBY", 162, 140);
  text("TRG", 202, 140);
  text("FLT", 20, 200);
  text("FLT", 20, 290);
  const flight = (day, y, number, dep, depTime, arr, arrTime) => {
    const x = 122 + (day - 1) * 40;
    [
      [number, y],
      [dep, y + 10],
      [depTime, y + 20],
      [arr, y + 30],
      [arrTime, y + 40],
    ].forEach(([value, row]) => text(value, x, row));
  };
  flight(1, 200, "636", "BKK", "08:00", "TPE", "12:30");
  flight(1, 290, "637", "TPE", "23:00", "BKK", "03:00");
  if (fourFlights) {
    text("FLT", 20, 380);
    text("FLT", 20, 470);
    flight(1, 380, "1234", "BKK", "08:00", "HKT", "09:30");
    flight(1, 470, "4321", "HKT", "10:30", "BKK", "12:00");
  }
  if (skippedFlight) flight(4, 200, "999", "ZZZ", "09:00", "BKK", "11:00");
  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [" +
      Array.from({ length: pageCount }, (_, i) => 3 + i + " 0 R").join(" ") +
      "] /Count " +
      pageCount +
      " >>",
  ];
  const fontId = 3 + pageCount,
    streamId = 4 + pageCount;
  for (let i = 0; i < pageCount; i++)
    objects.push(
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1400 800] /Resources << /Font << /F1 " +
        fontId +
        " 0 R >> >> /Contents " +
        streamId +
        " 0 R >>",
    );
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push(
    "<< /Length " +
      Buffer.byteLength(stream) +
      " >>\nstream\n" +
      stream +
      "\nendstream",
  );
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += index + 1 + " 0 obj\n" + object + "\nendobj\n";
  });
  const xref = Buffer.byteLength(pdf);
  pdf += "xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n";
  pdf += offsets
    .slice(1)
    .map((offset) => String(offset).padStart(10, "0") + " 00000 n \n")
    .join("");
  pdf +=
    "trailer\n<< /Size " +
    (objects.length + 1) +
    " /Root 1 0 R >>\nstartxref\n" +
    xref +
    "\n%%EOF";
  return Buffer.from(pdf);
}
module.exports = { makePdf };
