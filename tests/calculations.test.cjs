const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function app() {
  const html = fs.readFileSync(require.resolve("../index.html"), "utf8");
  const code = html
    .match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace("window.pilotIncomeReady = initApp();", "");
  const context = vm.createContext({
    window: {},
    matchMedia: () => ({ matches: false }),
    document: { getElementById: () => ({}) },
    Date,
    Intl,
    Map,
    Set,
    Number,
    Math,
    String,
    crypto: require("node:crypto").webcrypto,
    structuredClone,
  });
  vm.runInContext(code, context);
  return (expression) => vm.runInContext(expression, context);
}

test("block durations account for local airport timezones and overnight arrivals", () => {
  const run = app();
  assert.equal(
    run(
      'calculateBlockMinutesForDate(new Date(Date.UTC(2026,5,19)),"08:00","12:30","BKK","TPE")',
    ),
    210,
  );
  assert.equal(
    run(
      'calculateBlockMinutesForDate(new Date(Date.UTC(2026,5,19)),"23:00","06:00","BKK","HND")',
    ),
    300,
  );
  assert.equal(
    run(
      'calculateBlockMinutesForDate(new Date(Date.UTC(2026,5,19)),"23:30","01:00","BKK","CNX")',
    ),
    90,
  );
  assert.equal(
    run(
      'calculateBlockMinutesForDate(new Date(Date.UTC(2026,5,19)),"09:00","16:00","BKK","LHR")',
    ),
    780,
  );
  assert.equal(
    run(
      'calculateBlockMinutesForDate(new Date(Date.UTC(2026,0,19)),"09:00","16:00","BKK","LHR")',
    ),
    840,
  );
  assert.equal(
    run(
      'calculateBlockMinutesForDate(new Date(Date.UTC(2026,5,19)),"09:00","16:00","ZZZ","BKK")',
    ),
    null,
  );
});

test("red-eye policy and its strict 02:00–06:00 overlap boundaries are preserved", () => {
  const run = app();
  for (const [departure, arrival, expected] of [
    ["01:00", "02:00", false],
    ["06:00", "07:00", false],
    ["02:00", "03:00", true],
    ["23:00", "03:00", true],
    ["08:00", "12:00", false],
  ]) {
    assert.equal(
      run('overlapsWocl("' + departure + '","' + arrival + '")'),
      expected,
    );
  }
});

test("daily allowance is paid once for BKK departure and flight-level totals exclude it", () => {
  const run = app();
  run(
    'state.profile={roleRate:"1250",baseSalary:"100000"};state.schedule=normalizeSchedule({range:{start:new Date(Date.UTC(2026,5,1)),end:new Date(Date.UTC(2026,5,30))},days:[{day:1,flights:[{flightNumber:"636",displayNumber:"636",depStation:"BKK",depTime:"08:00",arrStation:"TPE",arrTime:"12:30"},{flightNumber:"637",displayNumber:"637",depStation:"TPE",depTime:"23:00",arrStation:"BKK",arrTime:"03:00"}],skipped:[],nonFlightDuties:[]}],pageCount:1});state.scheduleEdits={key:"test",days:{}};',
  );
  assert.equal(run("currentComputedSchedule().blockMinutes"), 510);
  assert.equal(run("currentComputedSchedule().blockPay"), 10625);
  assert.equal(run("currentComputedSchedule().landingPay"), 1300);
  assert.equal(run("currentComputedSchedule().redEyePay"), 500);
  assert.equal(run("currentComputedSchedule().dayBonus"), 1000);
  assert.equal(run("currentComputedSchedule().grandTotal"), 111625);
  assert.equal(run("currentComputedSchedule().earnedTotal"), 113425);
  assert.equal(run("currentComputedSchedule().days[0].flights[0].total"), 5025);
  assert.equal(run("currentComputedSchedule().dayOffCount"), 0);
});

test("each flight rounds block pay separately", () => {
  const run = app();
  assert.equal(
    run(
      'computeDay({date:new Date(Date.UTC(2026,5,1)),flights:[{depStation:"BKK",arrStation:"CNX",depTime:"08:00",arrTime:"08:01"},{depStation:"BKK",arrStation:"CNX",depTime:"09:00",arrTime:"09:01"}]},1250).blockPay',
    ),
    42,
  );
});

test("all calendar dates exist, while unknown dates are not counted as days off", () => {
  const run = app();
  run(
    'state.schedule=normalizeSchedule({range:{start:new Date(Date.UTC(2024,1,1)),end:new Date(Date.UTC(2024,1,29))},days:[{day:1,flights:[],skipped:[],nonFlightDuties:["TRG"]}],pageCount:1});state.scheduleEdits={key:"test",days:{}}',
  );
  assert.equal(run("state.schedule.days.length"), 29);
  assert.equal(run("state.schedule.days[28].hasPdfData"), false);
  assert.equal(run("currentComputedSchedule().workingDayCount"), 1);
  assert.equal(run("currentComputedSchedule().dayOffCount"), 0);
  assert.equal(
    run(
      'buildFlightFromInput({flightNumber:"636",depStation:"BKK",arrStation:"TPE",depTime:"08:00",arrTime:"12:30"},{date:state.schedule.days[28].date}).flight.minutes',
    ),
    210,
  );
});

test("malformed dates, unsupported roles, salary values, and manual flights are validated", () => {
  const run = app();
  assert.equal(run('parseEffectiveRange("31FEB26 - 28FEB26")'), null);
  assert.equal(run('parseEffectiveRange("01XYZ26 - 30JUN26")'), null);
  assert.equal(
    run('sanitizeProfile({roleRate:"2500",baseSalary:"Infinity"}).roleRate'),
    "1250",
  );
  assert.equal(run('sanitizeProfile({baseSalary:"-500"}).baseSalary'), "0");
  assert.match(
    run(
      'buildFlightFromInput({flightNumber:"0",depStation:"ZZZ",arrStation:"BKK",depTime:"25:00",arrTime:"10:00"},{date:new Date(Date.UTC(2026,5,1))}).error',
    ),
    /1 and 9999/,
  );
  assert.throws(
    () =>
      run(
        "normalizeSchedule({range:{start:new Date(Date.UTC(2026,5,30)),end:new Date(Date.UTC(2026,6,1))},days:[]})",
      ),
    /one calendar month/,
  );
});

test("manual edits retain parsed IDs and text is escaped", () => {
  const run = app();
  run(
    'state.schedule=normalizeSchedule({range:{start:new Date(Date.UTC(2026,5,1)),end:new Date(Date.UTC(2026,5,30))},days:[{day:1,flights:[],skipped:[],nonFlightDuties:["SBY"]}],pageCount:1});state.scheduleEdits={key:"a",days:{}};getDayEditBucket(1).addedDuties=["TRG"];getDayEditBucket(1).deletedDuties=["SBY"];',
  );
  assert.equal(
    run("currentComputedSchedule().days[0].nonFlightDuties.join()"),
    "TRG",
  );
  assert.equal(
    run('escapeHtml("<img src=x onerror=alert(1)>")'),
    "&lt;img src=x onerror=alert(1)&gt;",
  );
});

test("daily flight ranges use chronological endpoints and airport local overnight dates", () => {
  const run = app();
  const flight = (depStation, depTime, arrStation, arrTime) => ({
    depStation,
    depTime,
    arrStation,
    arrTime,
  });
  const range = (flights, extra = {}) =>
    JSON.parse(
      run(
        `JSON.stringify(getDailyFlightRange({...${JSON.stringify({ flights, skipped: [], hasPdfData: true, ...extra })}, date: new Date(Date.UTC(2026,5,19))}))`,
      ),
    );
  assert.deepEqual(
    range([
      flight("BKK", "08:00", "TPE", "12:30"),
      flight("TPE", "23:00", "BKK", "03:00"),
    ]),
    {
      startTime: "08:00",
      startStation: "BKK",
      endTime: "03:00",
      endStation: "BKK",
      arrivalDayOffset: 1,
      startUtcOffset: "UTC+7",
      endUtcOffset: "UTC+7",
    },
  );
  assert.deepEqual(
    range([
      flight("BKK", "09:00", "HKT", "10:00"),
      flight("HND", "10:00", "BKK", "08:30"),
    ]),
    {
      startTime: "10:00",
      startStation: "HND",
      endTime: "10:00",
      endStation: "HKT",
      arrivalDayOffset: 0,
      startUtcOffset: "UTC+9",
      endUtcOffset: "UTC+7",
    },
  );
  assert.equal(
    range([flight("HND", "10:00", "BKK", "08:30")]).arrivalDayOffset,
    0,
  );
  assert.equal(
    range([flight("BKK", "23:30", "CNX", "01:00")]).arrivalDayOffset,
    1,
  );
  assert.equal(range([]), null);
  assert.equal(range([flight("ZZZ", "08:00", "BKK", "10:00")]), null);
  assert.equal(range([flight("BKK", "invalid", "CNX", "10:00")]), null);
  assert.equal(
    range([flight("BKK", "08:00", "CNX", "10:00")], { skipped: [{}] }),
    null,
  );
  assert.equal(
    range([flight("BKK", "08:00", "CNX", "10:00")], { hasPdfData: false }),
    null,
  );
});

test("UTC labels reflect fractional offsets, daylight saving, and the actual arrival date", () => {
  const run = app();
  const label = (date, time, zone) =>
    run(
      `formatUtcOffset(zonedLocalToUtc(new Date(${JSON.stringify(date)}), ${JSON.stringify(time)}, ${JSON.stringify(zone)}), ${JSON.stringify(zone)})`,
    );
  assert.equal(label("2026-06-19T00:00:00Z", "08:00", "Asia/Bangkok"), "UTC+7");
  assert.equal(
    label("2026-06-19T00:00:00Z", "08:00", "Asia/Kolkata"),
    "UTC+5:30",
  );
  assert.equal(
    label("2026-06-19T00:00:00Z", "08:00", "Asia/Kathmandu"),
    "UTC+5:45",
  );
  assert.equal(
    label("2026-06-19T00:00:00Z", "08:00", "America/St_Johns"),
    "UTC-2:30",
  );
  assert.equal(
    label("2026-01-19T00:00:00Z", "08:00", "Europe/London"),
    "UTC+0",
  );
  assert.equal(
    label("2026-06-19T00:00:00Z", "08:00", "Europe/London"),
    "UTC+1",
  );
  assert.equal(
    label("2026-01-19T00:00:00Z", "08:00", "America/New_York"),
    "UTC-5",
  );
  assert.equal(
    label("2026-06-19T00:00:00Z", "08:00", "America/New_York"),
    "UTC-4",
  );
  assert.equal(run('formatUtcOffset(null, "Asia/Bangkok")'), "");
  assert.equal(run("formatUtcOffset(Date.now(), undefined)"), "");
  assert.equal(
    run(
      'getDailyFlightRange({date: new Date(Date.UTC(2026,2,28)), flights: [{depStation:"BKK", depTime:"23:00", arrStation:"LHR", arrTime:"06:00"}], skipped: []}).endUtcOffset',
    ),
    "UTC+1",
  );
});
