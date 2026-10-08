const { test, expect } = require("@playwright/test");
const { makePdf } = require("./fixtures.cjs");

async function ready(page) {
  await page.goto("http://127.0.0.1:4173/tgsalor/");
  await page.evaluate(() => window.pilotIncomeReady);
}
async function closeDayDetails(page) {
  if (await page.locator("#dayDetailsModal").evaluate((dialog) => dialog.open))
    await page.locator("#dayDetailsCloseButton").click();
}
async function upload(page, options = {}) {
  await closeDayDetails(page);
  await page.locator("#pdfInput").setInputFiles({
    name: "schedule.pdf",
    mimeType: "application/pdf",
    buffer: makePdf(options),
  });
  await expect(page.locator("#loadedContent")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.pilotIncomeApp.state.busy))
    .toBe(false);
}
async function addFlight(page, day = 30) {
  await page.locator('button[data-day="' + day + '"]').click();
  await page.locator("[data-flight-add]").click();
  const form = page.locator("#flightForm");
  await form.locator('[name="flightNumber"]').fill("636");
  await form.locator('[name="depStation"]').fill("BKK");
  await form.locator('[name="depTime"]').fill("08:00");
  await form.locator('[name="arrStation"]').fill("TPE");
  await form.locator('[name="arrTime"]').fill("12:30");
  await form.getByRole("button", { name: "Save flight" }).click();
  await expect(page.locator("#dayModal")).not.toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.pilotIncomeApp.state.persisted))
    .toBe(true);
  await closeDayDetails(page);
}

test.beforeEach(async ({
  page,
}) => {
  page.pageErrors = [];
  page.on("pageerror", (error) => page.pageErrors.push(error.message));
});
test.afterEach(async ({
  page,
}) => {
  expect(page.pageErrors).toEqual([]);
});

test("first visit is usable without profile setup or eagerly loading PDF/export libraries", async ({
  page,
}) => {
  const external = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:4173/"))
      external.push(request.url());
  });
  await ready(page);
  await expect(page.locator("#welcomeSection")).toBeVisible();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  expect(
    await page.evaluate(() => Boolean(window.pdfjsLib || window.html2canvas)),
  ).toBe(false);
  await expect(page.locator("#offlineStatus")).toHaveText("Offline ready");
  await expect(page.locator("#updateButton")).not.toBeVisible();
  await expect(page.locator(".format-cue")).toContainText("THAI monthly");
  await expect(page.locator(".welcome-help p").first()).not.toBeVisible();
  await page.getByText("PDF & offline help", { exact: true }).click();
  await expect(page.locator(".welcome-help")).toContainText("Only page 1 is read");
  await expect(page.locator(".welcome-help")).toContainText("scanned PDFs");
  await expect(page.locator(".welcome-help")).toContainText("multi-month");
  await expect(page.locator(".welcome-help")).toContainText("Offline ready");
  await expect(page.locator(".welcome-help")).toContainText(
    "Clearing this site’s browser data removes them",
  );
  await page.getByText("PDF & offline help", { exact: true }).click();
  expect(external).toEqual([]);
});

test("enlarged calendar text stays readable and keyboard navigation reveals offscreen dates", async ({
  page,
}) => {
  await ready(page);
  await upload(page, { fourFlights: true });
  await page.evaluate(() => document.fonts.ready);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "32px";
    });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    const readability = await page.locator("#calendarGrid").evaluate((grid) => {
      const tokens = [
        ...grid.querySelectorAll(
          ".flight-number, .flight-arrival, .calendar-time-row time, .arrival-offset",
        ),
      ];
      return tokens.every((token) => {
        const range = document.createRange();
        range.selectNodeContents(token);
        const textRects = [...range.getClientRects()];
        const cell = token.closest(".calendar-day").getBoundingClientRect();
        return (
          parseFloat(getComputedStyle(token).fontSize) >= 24 &&
          textRects.length === 1 &&
          textRects.every((rect) =>
            rect.left >= cell.left && rect.right <= cell.right &&
            rect.top >= cell.top && rect.bottom <= cell.bottom,
          )
        );
      });
    });
    expect(readability).toBe(true);
    expect(
      await page.locator(".calendar-total:visible").evaluateAll((nodes) =>
        nodes.every((node) => node.scrollWidth <= node.clientWidth),
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#calendarScrollHint")).toBeVisible();
  await page.locator('button[data-day="1"]').focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
  await expect(page.locator('button[data-day="6"]')).toBeFocused();
  expect(
    await page.locator("#calendarScroll").evaluate((node) => node.scrollLeft),
  ).toBeGreaterThan(0);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator("#calendarScrollHint")).not.toBeVisible();
  await expect(page.locator("#calendarScroll")).not.toHaveAttribute("tabindex", "0");
});

test("phone flight correction controls have separated 44px targets", async ({
  page,
}) => {
  await ready(page);
  await upload(page);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator('button[data-day="1"]').click();
    const tools = page.locator("#dayContent .flight-tools").first();
    const edit = await tools.locator("[data-flight-edit]").boundingBox();
    const remove = await tools.locator("[data-flight-delete]").boundingBox();
    expect(edit.width).toBeGreaterThanOrEqual(44);
    expect(edit.height).toBeGreaterThanOrEqual(44);
    expect(remove.width).toBeGreaterThanOrEqual(44);
    expect(remove.height).toBeGreaterThanOrEqual(44);
    expect(remove.x - edit.x - edit.width).toBeGreaterThanOrEqual(4);
    await tools.locator("[data-flight-edit]").click();
    await expect(page.locator("#dayModal")).toBeVisible();
    await page.locator("#dayModal")
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    await closeDayDetails(page);
  }
});

for (const failure of ["missing", "mime", "syntax"]) {
  test(`PDF reader reports ${failure} failures and can retry without reloading`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ serviceWorkers: "block" });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const pattern = "**/vendor/pdfjs/pdf.min.mjs*";
      await page.route(pattern, (route) =>
        route.fulfill({
          status: failure === "missing" ? 404 : 200,
          contentType:
            failure === "mime" ? "text/html" : "application/javascript",
          body:
            failure === "syntax"
              ? "export const broken = ;"
              : "<html>Missing asset</html>",
        }),
      );
      await ready(page);
      await page.locator("#pdfInput").setInputFiles({
        name: "schedule.pdf",
        mimeType: "application/pdf",
        buffer: makePdf(),
      });
      await expect(page.locator("#statusBox")).toContainText(
        failure === "missing"
          ? "Publish the vendor folder"
          : failure === "mime"
            ? "JavaScript content type"
            : "Update your browser",
      );
      await expect
        .poll(() => page.evaluate(() => window.pilotIncomeApp.state.busy))
        .toBe(false);
      await expect(page.locator("#welcomeSection")).toBeVisible();
      await page.unroute(pattern);
      await upload(page);
      await expect(page.locator("#earnedTotal")).toHaveText("฿13,425");
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });
}

test("real PDF extraction, per-flight income, SBY/TRG, and salary settings", async ({
  page,
}) => {
  await ready(page);
  await upload(page);
  await expect(page.locator("#pilotNameText")).toHaveText("Test Pilot");
  await expect(page.locator("#grandTotal")).toHaveText("฿11,625");
  await expect(page.locator("#earnedTotal")).toHaveText("฿13,425");
  await expect(page.locator("#dayContent .flight-row")).toHaveCount(2);
  await expect(page.locator("#dayContent")).not.toContainText(
    "Airport local times",
  );
  await expect(page.locator('button[data-day="2"]')).toContainText("SBY");
  await expect(page.locator('button[data-day="3"]')).toContainText("TRG");
  await page.locator('button[data-day="3"]').click();
  await expect(page.locator("#dayContent")).toContainText("Training duty");
  await closeDayDetails(page);
  await page.locator("#settingsButton").click();
  await page.locator("#baseSalaryInput").fill("100000");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(page.locator("#grandTotal")).toHaveText("฿111,625");
  await expect(page.locator("#earnedTotal")).toHaveText("฿113,425");
  await page.reload();
  await page.evaluate(() => window.pilotIncomeReady);
  await expect(page.locator("#grandTotal")).toHaveText("฿111,625");
  expect(await page.evaluate(() => Boolean(window.pdfjsLib))).toBe(false);
});

test("every date supports edits, including dates absent from the PDF", async ({
  page,
}) => {
  await ready(page);
  await upload(page, { missingDay: 30 });
  await expect(page.locator("#statusBox")).toContainText("1 date was not read");
  await expect(page.locator('button[data-day="30"]')).toContainText("Check");
  await addFlight(page);
  await expect(page.locator("#dayContent")).toContainText("Manually adjusted");
  await expect(page.locator("#earnedTotal")).toHaveText("฿19,450");
  await page.reload();
  await page.evaluate(() => window.pilotIncomeReady);
  await page.locator('button[data-day="30"]').click();
  await expect(page.locator("#dayContent .flight-row")).toHaveCount(1);
  await expect(page.locator("#dayContent")).toContainText("TG 636");
});

test("invalid replacements retain the prior schedule, file identity, and manual edits", async ({
  page,
}) => {
  await ready(page);
  await upload(page);
  await addFlight(page);
  const before = await page.evaluate(() => ({
    total: window.pilotIncomeApp.currentComputedSchedule().earnedTotal,
    fingerprint: window.pilotIncomeApp.state.fingerprint,
  }));
  await page.locator("#pdfInput").setInputFiles({
    name: "bad.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("Not a PDF"),
  });
  await expect(page.locator("#statusBox")).toContainText("not a PDF");
  expect(
    await page.evaluate(() => ({
      total: window.pilotIncomeApp.currentComputedSchedule().earnedTotal,
      fingerprint: window.pilotIncomeApp.state.fingerprint,
    })),
  ).toEqual(before);
  expect(
    await page.evaluate(() => window.pilotIncomeApp.state.savedPdfName),
  ).toBe("schedule.pdf");
  await upload(page);
  await expect(page.locator("#earnedTotal")).toHaveText("฿19,450");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.locator("#pdfInput").setInputFiles({
    name: "replacement.pdf",
    mimeType: "application/pdf",
    buffer: makePdf({ pilotName: "ANOTHER PILOT" }),
  });
  await expect
    .poll(() => page.evaluate(() => window.pilotIncomeApp.state.busy))
    .toBe(false);
  await expect(page.locator("#pilotNameText")).toHaveText("Test Pilot");
  await expect(page.locator("#earnedTotal")).toHaveText("฿19,450");
});

test("skipped flights and extra pages are explicitly flagged", async ({
  page,
}) => {
  await ready(page);
  await upload(page, { skippedFlight: true, pageCount: 2 });
  await expect(page.locator("#statusBox")).toContainText(
    "1 flight was not included",
  );
  await expect(page.locator("#statusBox")).toContainText(
    "Only page 1 was processed",
  );
  await page.locator('button[data-day="4"]').click();
  await expect(page.locator("#dayContent")).toContainText(
    "Missing timezone for ZZZ",
  );
  await expect(page.locator("#earnedTotal")).toHaveText("฿13,425");
});

test("offline reopen restores without reparsing, and supports edits, exports, and new PDF imports", async ({
  page,
  context,
  browser,
  browserName,
}) => {
  await ready(page);
  await upload(page);
  await expect(page.locator("#offlineStatus")).toHaveText("Offline ready");
  // Playwright 1.63 WebKit's offline switch rejects even literal service-worker
  // responses (microsoft/playwright#42775). Make the origin unavailable instead.
  if (browserName === "webkit")
    await page.request.post("/__test/network", { data: { unavailable: true } });
  else await context.setOffline(true);
  await page.close();
  try {
    if (browserName === "webkit") {
      const fresh = await browser.newContext();
      try {
        const emptyPage = await fresh.newPage();
        await expect(
          emptyPage.goto("http://127.0.0.1:4173/tgsalor/"),
        ).rejects.toThrow();
      } finally {
        await fresh.close();
      }
    }
    const reopened = await context.newPage();
    reopened.on("pageerror", (error) => page.pageErrors.push(error.message));
    await ready(reopened);
    await expect(reopened.locator("#earnedTotal")).toHaveText("฿13,425");
    expect(await reopened.evaluate(() => Boolean(window.pdfjsLib))).toBe(false);
    await addFlight(reopened);
    await reopened.locator("#shareCalendarButton").click();
    await expect(reopened.locator("#sharePreviewFrame img")).toBeVisible();
    await expect(reopened.locator("#shareSaveButton")).toBeEnabled();
    const downloadEvent = reopened.waitForEvent("download");
    await reopened.locator("#shareSaveButton").click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe("tg-schedule-2026-06.png");
    await reopened.locator("#shareCloseButton").click();
    reopened.once("dialog", (dialog) => dialog.accept());
    await upload(reopened, { pilotName: "OFFLINE PILOT" });
    await expect(reopened.locator("#pilotNameText")).toHaveText(
      "Offline Pilot",
    );
    await expect(reopened.locator("#earnedTotal")).toHaveText("฿13,425");
    await expect
      .poll(() =>
        reopened.evaluate(() => window.pilotIncomeApp.state.persisted),
      )
      .toBe(true);
  } finally {
    if (browserName === "webkit")
      await context.request.post("/__test/network", {
        data: { unavailable: false },
      });
  }
});

test("old localStorage PDFs, preferences, and manual edits migrate without data loss", async ({
  page,
}) => {
  const pdfData = makePdf().toString("base64");
  await page.addInitScript((base64) => {
    if (localStorage.getItem("migrationSeeded")) return;
    localStorage.setItem("migrationSeeded", "yes");
    localStorage.setItem(
      "pilotIncomeProfile",
      JSON.stringify({ roleRate: "1250", baseSalary: "90000" }),
    );
    localStorage.setItem(
      "pilotIncomeDisplaySettings",
      JSON.stringify({
        calendarAmountMode: "nextDay",
        calendarFlightLabelMode: "arrival",
        shareIncludeIncome: true,
      }),
    );
    localStorage.setItem(
      "pilotIncomeSchedulePdf",
      JSON.stringify({
        name: "legacy.pdf",
        dataUrl: "data:application/pdf;base64," + base64,
      }),
    );
    localStorage.setItem(
      "pilotIncomeScheduleEdits",
      JSON.stringify({
        key: "01 Jun 26 - 30 Jun 26|1",
        days: {
          30: {
            added: [
              {
                id: "manual-legacy",
                flightNumber: "636",
                displayNumber: "636",
                depStation: "BKK",
                depTime: "08:00",
                arrStation: "TPE",
                arrTime: "12:30",
              },
            ],
            deleted: [],
            edited: {},
            deletedDuties: [],
            addedDuties: [],
          },
        },
      }),
    );
  }, pdfData);
  await ready(page);
  await expect(page.locator("#earnedTotal")).toHaveText("฿109,450");
  expect(
    await page.evaluate(() => localStorage.getItem("pilotIncomeSchedulePdf")),
  ).toBeNull();
  expect(
    await page.evaluate(() => localStorage.getItem("pilotIncomeScheduleEdits")),
  ).toBeNull();
  await expect(page.locator('button[data-day="1"]')).toContainText("TPE");
  await page.reload();
  await page.evaluate(() => window.pilotIncomeReady);
  await expect(page.locator("#earnedTotal")).toHaveText("฿109,450");
  expect(await page.evaluate(() => Boolean(window.pdfjsLib))).toBe(false);
});

test("failed storage writes leave a usable in-memory schedule and can be retried", async ({
  page,
}) => {
  await ready(page);
  await upload(page);
  await page.evaluate(() => {
    window.originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function () {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await upload(page, { pilotName: "TEMPORARY PILOT" });
  await expect(page.locator("#storageNotice")).toBeVisible();
  await expect(page.locator("#pilotNameText")).toHaveText("Temporary Pilot");
  expect(await page.evaluate(() => window.pilotIncomeApp.state.persisted)).toBe(
    false,
  );
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = window.originalPut;
  });
  await page.getByRole("button", { name: "Retry saving" }).click();
  await expect(page.locator("#storageNotice")).not.toBeVisible();
  await page.reload();
  await page.evaluate(() => window.pilotIncomeReady);
  await expect(page.locator("#pilotNameText")).toHaveText("Temporary Pilot");
});

test("settings and editor cancellation preserve data, and deleting a schedule preserves the profile", async ({
  page,
}) => {
  await ready(page);
  await upload(page);
  await page.locator("#settingsButton").click();
  await page.locator("#baseSalaryInput").fill("90000");
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#settingsCancelButton").click();
  await expect(page.locator("#grandTotal")).toHaveText("฿11,625");
  await page.locator('button[data-day="1"]').click();
  await page.locator("[data-flight-add]").click();
  await page.locator('[name="flightNumber"]').fill("1");
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#editorCloseButton").click();
  await expect(page.locator("#dayContent .flight-row")).toHaveCount(2);
  await closeDayDetails(page);
  await page.locator("#settingsButton").click();
  await page.locator("#baseSalaryInput").fill("90000");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await page.locator("#settingsButton").click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#deletePdfButton").click();
  await expect(page.locator("#settingsPdfSummary")).toHaveText(
    "No schedule saved.",
  );
  await page.locator("#settingsCloseButton").click();
  await expect(page.locator("#welcomeSection")).toBeVisible();
  await page.reload();
  await page.evaluate(() => window.pilotIncomeReady);
  await expect(page.locator("#welcomeSection")).toBeVisible();
  expect(
    await page.evaluate(() => window.pilotIncomeApp.state.profile.baseSalary),
  ).toBe("90000");
});

test("rapid share options use the latest image, and export errors offer a safe retry", async ({
  page,
}) => {
  await ready(page);
  await upload(page);
  await page.locator("#shareCalendarButton").click();
  await expect(page.locator("#sharePreviewFrame img")).toBeVisible();
  await page.evaluate(() => {
    window.actualCapture = window.html2canvas;
    window.captureWidths = [];
    window.html2canvas = async (node, options) => {
      window.captureWidths.push(node.offsetWidth);
      await new Promise((resolve) => setTimeout(resolve, 150));
      return window.actualCapture(node, options);
    };
  });
  await page.locator("#shareIncludeIncome").check();
  await page.locator("#shareIncludeIncome").uncheck();
  await expect(page.locator("#shareSaveButton")).toBeEnabled();
  await expect
    .poll(() =>
      page
        .locator("#sharePreviewFrame img")
        .evaluate((image) => image.naturalWidth),
    )
    .toBe(1640);
  await page.evaluate(() => {
    window.html2canvas = () =>
      Promise.reject(new Error("Capture failed for testing"));
  });
  await page.locator("#shareIncludeIncome").check();
  await expect(page.getByRole("button", { name: "Retry image" })).toBeVisible();
  await expect(page.locator("#shareSaveButton")).toBeDisabled();
  await page.evaluate(() => {
    window.html2canvas = window.actualCapture;
  });
  await page.getByRole("button", { name: "Retry image" }).click();
  await expect(page.locator("#shareSaveButton")).toBeEnabled();
});

test("monthly income shows one total with a compact keyboard-accessible breakdown", async ({
  page,
}) => {
  await ready(page);
  await upload(page);
  const section = page.locator("#incomeSection");
  const details = page.locator("#allowanceDetails");
  await expect(
    section.getByRole("heading", {
      name: "Estimated monthly income",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator("#incomeSettingsButton")).toHaveCount(0);
  await expect(details).not.toHaveAttribute("open", "");
  await expect(page.locator("#grandTotal")).not.toBeVisible();
  await expect(section.locator(".money:visible")).toHaveCount(1);
  expect((await section.boundingBox()).height).toBeLessThanOrEqual(190);
  const summary = details.locator("summary");
  await summary.focus();
  await summary.press("Enter");
  await expect(page.locator("#grandTotal")).toBeVisible();
  await expect(page.locator("#incomeBaseSalary")).toHaveText("฿0");
  await expect(page.locator("#nextMonthTotal")).toHaveText("฿1,800");
  await summary.press("Space");
  await expect(page.locator("#grandTotal")).not.toBeVisible();
  await page.locator("#settingsButton").click();
  await page.locator("#baseSalaryInput").fill("100000");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(page.locator("#earnedTotal")).toHaveText("฿113,425");
  await summary.click();
  await expect(page.locator("#incomeBaseSalary")).toHaveText("฿100,000");
  await expect(page.locator("#grandTotal")).toHaveText("฿111,625");
  await page.evaluate(() => {
    const app = window.pilotIncomeApp;
    app.state.schedule.days.forEach((day) => {
      day.flights = [];
    });
    app.renderSchedule();
  });
  await expect(page.locator("#earnedTotal")).toHaveText("฿100,000");
  await expect(page.locator("#grandTotal")).toHaveText("฿100,000");
  await expect(page.locator("#nextMonthTotal")).toHaveText("฿0");
  await page.setViewportSize({ width: 320, height: 568 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("mobile, iPad, desktop, and enlarged text reflow without horizontal overflow", async ({
  page,
}) => {
  await ready(page);
  await upload(page);
  for (const [width, height] of [
    [320, 568],
    [375, 812],
    [390, 844],
    [430, 932],
    [768, 1024],
    [1024, 768],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width, height });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    if (width >= 375 && width < 768) {
      await expect(page.locator("#calendarScrollHint")).not.toBeVisible();
      expect(
        await page.locator("#calendarScroll").evaluate((scroller) => {
          const bounds = scroller.getBoundingClientRect();
          return scroller.scrollWidth <= scroller.clientWidth &&
            [...scroller.querySelectorAll(".weekdays span")].every((day) => {
              const rect = day.getBoundingClientRect();
              return rect.left >= bounds.left && rect.right <= bounds.right;
            });
        }),
      ).toBe(true);
    }
    expect(
      await page
        .locator(".calendar-total:visible")
        .evaluateAll((amounts) =>
          amounts.every((amount) => amount.scrollWidth <= amount.clientWidth),
        ),
    ).toBe(true);
    const calendar = await page.locator("#calendarSection").boundingBox();
    if (width >= 768) {
      const panel = await page.locator("#dayPanel").boundingBox();
      expect(panel.x).toBeGreaterThan(calendar.x);
      await expect(page.locator("#dayDetailsCloseButton")).not.toBeVisible();
    } else {
      await expect(page.locator("#dayPanel")).not.toBeVisible();
      await page.locator('button[data-day="1"]').click();
      await expect(page.locator("#dayDetailsModal")).toBeVisible();
      expect(
        await page
          .locator("#dayDetailsModal")
          .evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth),
      ).toBe(true);
      await closeDayDetails(page);
    }
  }
  await page.setViewportSize({ width: 320, height: 568 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    await page.locator(".button:visible").evaluateAll((buttons) =>
      buttons.every((button) => {
        const parent = button.closest(".section, .header, dialog");
        if (!parent) return true;
        const childRect = button.getBoundingClientRect(),
          parentRect = parent.getBoundingClientRect();
        return (
          childRect.left >= parentRect.left - 1 &&
          childRect.right <= parentRect.right + 1
        );
      }),
    ),
  ).toBe(true);
  await page.locator("#settingsButton").click();
  expect(
    await page
      .locator("#settingsModal")
      .evaluate((modal) => modal.scrollWidth <= modal.clientWidth),
  ).toBe(true);
  expect(
    await page
      .locator("#baseSalaryInput")
      .evaluate((input) => parseFloat(getComputedStyle(input).fontSize)),
  ).toBeGreaterThanOrEqual(16);
  await page.locator("#settingsCloseButton").click();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  await page.locator('button[data-day="1"]').click();
  await page.screenshot({
    path: "test-results/mobile-day-modal.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.screenshot({ path: "test-results/ipad.png", fullPage: true });
});

test("calendar with flight times fits typical phone screens and allows scrolling on small screens", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-06-02T05:00:00Z"));
  await ready(page);
  await upload(page);
  await expect(page.locator("#uploadButton")).toHaveCount(0);
  await expect(page.locator(".calendar-section #appHeader")).toBeVisible();
  await expect(page.locator("#appTitle")).toHaveText("June 2026");
  await expect(page.locator("#headerHome")).toBeEmpty();
  await expect(page.locator("#todayButton")).toHaveCount(0);
  await expect(page.locator('button[data-day="2"]')).toHaveAttribute(
    "aria-current",
    "date",
  );
  for (const month of [6, 8]) {
    await upload(page, { month });
    for (const [width, height] of [
      [320, 568],
      [390, 844],
      [430, 932],
    ]) {
      await page.setViewportSize({ width, height });
      if (width >= 390) {
        await expect
          .poll(() =>
            page
              .locator("#calendarSection")
              .evaluate((calendar) => calendar.getBoundingClientRect().bottom),
          )
          // Allow subpixel rounding at the bottom border.
          .toBeLessThanOrEqual(height + 1);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        await page
          .locator(".calendar-day:not(.blank)")
          .first()
          .evaluate((day) => day.getBoundingClientRect().height),
      ).toBeGreaterThanOrEqual(width < 390 ? 80 : 96);
    }
  }
  await page.locator("#settingsButton").click();
  const chooserPromise = page.waitForEvent("filechooser");
  await page.locator("#settingsReplaceButton").click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: "new-month.pdf",
    mimeType: "application/pdf",
    buffer: makePdf({ pilotName: "NEW PILOT" }),
  });
  await expect(page.locator("#settingsPdfSummary")).toContainText(
    "new-month.pdf",
  );
  await page.locator("#settingsCloseButton").click();
  await expect(page.locator("#pilotNameText")).toHaveText("New Pilot");
  await expect(page.locator("#appTitle")).toHaveText("June 2026");
});

test("day details and flight editor show date-aware airport offsets without changing calendar cells", async ({
  page,
}) => {
  await ready(page);
  await upload(page);
  await expect(page.locator("#calendarSection .timezone-label")).toHaveCount(0);
  await page.locator("#incomePrivacyButton").click();
  await page.locator('button[data-day="1"]').click();
  await expect(page.locator("#dayContent .day-range-zone")).toHaveText([
    "UTC+7",
    "UTC+7",
  ]);
  await expect(
    page.locator("#dayContent .route-line .timezone-label"),
  ).toHaveText(["UTC+7", "UTC+8", "UTC+8", "UTC+7"]);
  await page.locator("[data-flight-edit]").first().click();
  await expect(page.locator("#editorDepartureZone")).toHaveText("UTC+7");
  await expect(page.locator("#editorArrivalZone")).toHaveText("UTC+8");
  const form = page.locator("#flightForm");
  await form.locator('[name="arrStation"]').fill("DEL");
  await expect(page.locator("#editorArrivalZone")).toHaveText("UTC+5:30");
  await form.locator('[name="arrStation"]').fill("KTM");
  await expect(page.locator("#editorArrivalZone")).toHaveText("UTC+5:45");
  await form.locator('[name="arrStation"]').fill("ZZZ");
  await expect(page.locator("#editorArrivalZone")).toHaveText("");
  await form.locator('[name="arrStation"]').fill("TPE");
  await form.locator('[name="depTime"]').fill("");
  await expect(page.locator("#editorDepartureZone")).toHaveText("");
  await expect(page.locator("#editorArrivalZone")).toHaveText("");
  await form.locator('[name="depTime"]').fill("08:00");
  await expect(page.locator("#editorDepartureZone")).toHaveText("UTC+7");
  await expect(page.locator("#editorArrivalZone")).toHaveText("UTC+8");
  await form.locator('[name="flightNumber"]').fill("637");
  await form.locator('[name="flightNumber"]').blur();
  await expect(page.locator("#editorDepartureZone")).toHaveText("UTC+8");
  await expect(page.locator("#editorArrivalZone")).toHaveText("UTC+7");
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#flightCancelButton").click();
  await closeDayDetails(page);
  await page.reload();
  await page.evaluate(() => window.pilotIncomeReady);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.locator('button[data-day="1"]').click();
  await expect(page.locator("#dayContent .day-range-zone")).toHaveText([
    "UTC+7",
    "UTC+7",
  ]);
});

test("daily flight ranges show local times, overnight markers, and update after edits", async ({
  page,
}) => {
  await ready(page);
  await upload(page);
  const day = page.locator('button[data-day="1"]');
  await expect(day.locator(".flight-start-time")).toHaveText("08:00");
  await expect(day.locator(".flight-end-time")).toHaveText("03:00");
  await expect(day.locator(".arrival-offset")).toHaveText("+1");
  const hierarchy = await day.evaluate((cell) => {
    const start = cell.querySelector(".flight-start-time");
    const end = cell.querySelector(".flight-end-time");
    const flights = cell.querySelectorAll(".flight-chip");
    return {
      startAboveFlights:
        start.getBoundingClientRect().bottom <=
        flights[0].getBoundingClientRect().top,
      endBelowFlights:
        end.getBoundingClientRect().top >=
        flights[flights.length - 1].getBoundingClientRect().bottom,
      readableTimes:
        parseFloat(getComputedStyle(start).fontSize) >= 12 &&
        parseFloat(getComputedStyle(cell.querySelector(".arrival-offset")).fontSize) >= 12,
    };
  });
  expect(hierarchy).toEqual({
    startAboveFlights: true,
    endBelowFlights: true,
    readableTimes: true,
  });

  for (const number of [2, 3, 4])
    await expect(
      page.locator(`button[data-day="${number}"] .calendar-flight-times`),
    ).toHaveCount(0);
  await page.locator("#incomePrivacyButton").click();
  await expect(day.locator(".calendar-flight-times")).toBeVisible();
  await expect(day).toHaveAttribute(
    "aria-label",
    /depart BKK at 08:00; arrive BKK at 03:00 the next day/,
  );
  expect(await day.getAttribute("aria-label")).not.toContain("฿");
  await day.click();
  await expect(page.locator("#dayContent .day-range-start")).toHaveText(
    "08:00",
  );
  await expect(page.locator("#dayContent .day-range-end")).toHaveText("03:00");
  await expect(page.locator("#dayContent .day-range-offset")).toHaveText(
    "+1 day",
  );
  await expect(page.locator("#dayContent .day-range-station")).toHaveText([
    "BKK",
    "BKK",
  ]);
  await page.locator("[data-flight-edit]").first().click();
  await page.locator('#flightForm [name="depTime"]').fill("07:00");
  await page.getByRole("button", { name: "Save flight", exact: true }).click();
  await closeDayDetails(page);
  await expect(day.locator(".flight-start-time")).toHaveText("07:00");
  await expect(page.locator("#dayContent .day-range-start")).toHaveText(
    "07:00",
  );
  await day.click();
  await page.locator("[data-flight-edit]").last().click();
  await page.locator('#flightForm [name="arrTime"]').fill("04:00");
  await page.getByRole("button", { name: "Save flight", exact: true }).click();
  await closeDayDetails(page);
  await expect(day.locator(".flight-end-time")).toHaveText("04:00");
  await expect(page.locator("#dayContent .day-range-end")).toHaveText("04:00");
  await day.click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("[data-flight-delete]").first().click();
  await closeDayDetails(page);
  await expect(day.locator(".flight-start-time")).toHaveText("23:00");
  await page.reload();
  await page.evaluate(() => window.pilotIncomeReady);
  await expect(day.locator(".flight-start-time")).toHaveText("23:00");
  await expect(day.locator(".flight-end-time")).toHaveText("04:00");
  await day.click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("[data-flight-delete]").click();
  await closeDayDetails(page);
  await expect(day.locator(".calendar-flight-times")).toHaveCount(0);
  await expect(page.locator("#dayContent .day-flight-range")).toHaveCount(0);
  await addFlight(page, 1);
  await closeDayDetails(page);
  await expect(day.locator(".calendar-flight-times")).toBeVisible();
  await expect(day.locator(".flight-start-time")).toHaveText(/^\d{2}:\d{2}$/);
  await expect(day.locator(".flight-end-time")).toHaveText(/^\d{2}:\d{2}$/);
  await upload(page, { skippedFlight: true, missingDay: 30 });
  await expect(
    page.locator('button[data-day="4"] .calendar-flight-times'),
  ).toHaveCount(0);
  await expect(
    page.locator('button[data-day="30"] .calendar-flight-times'),
  ).toHaveCount(0);
});

test("compact calendar displays all four flight numbers without clipping", async ({
  page,
}) => {
  await ready(page);
  await upload(page, { fourFlights: true });
  const day = page.locator('button[data-day="1"]');
  await expect(day.locator(".flight-chip")).toHaveText([
    "1234-HKT",
    "636-TPE",
    "4321-BKK",
    "637-BKK",
  ]);
  await expect(page.locator(".more-flights")).toHaveCount(0);
  await expect(page.locator("#effectiveText")).not.toBeVisible();
  for (const width of [320, 390, 430, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    await expect
      .poll(() =>
        day
          .locator(".flight-chip")
          .evaluateAll((chips) =>
            chips.every(
              (chip) =>
                chip.scrollWidth <= chip.clientWidth &&
                chip.scrollHeight <= chip.clientHeight,
            ),
          ),
      )
      .toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width < 768) {
      const height = await page
        .locator("#calendarSection")
        .evaluate((section) => section.getBoundingClientRect().height);
      expect(height).toBeLessThan(844);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollHeight))
    .toBeLessThan(1700);
  await page.screenshot({
    path: "test-results/four-flights-mobile.png",
    fullPage: true,
  });
  await day.click();
  await expect(page.locator("#dayContent .flight-row")).toHaveCount(4);
  await closeDayDetails(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.evaluate(() => (document.documentElement.style.fontSize = "32px"));
  expect(
    await day
      .locator(".flight-chip")
      .evaluateAll((chips) =>
        chips.every(
          (chip) =>
            chip.scrollWidth <= chip.clientWidth &&
            chip.scrollHeight <= chip.clientHeight,
        ),
      ),
  ).toBe(true);
  await page.evaluate(() => (document.documentElement.style.fontSize = ""));
  await page.locator("#shareCalendarButton").click();
  await expect(page.locator("#sharePreviewFrame img")).toBeVisible();
  await page.evaluate(() => {
    const capture = window.html2canvas;
    window.html2canvas = (node, options) => {
      window.exportFlightLabels = [
        ...node.querySelectorAll(".flight-chip:not(.duty-chip)"),
      ].map((chip) => chip.textContent);
      window.exportCalendarLegend = node.textContent
        .toLowerCase()
        .includes("daily income");
      return capture(node, options);
    };
  });
  await page.locator("#shareIncludeIncome").check();
  await expect
    .poll(() => page.evaluate(() => window.exportFlightLabels))
    .toEqual(["1234-HKT", "636-TPE", "4321-BKK", "637-BKK"]);
  expect(await page.evaluate(() => window.exportCalendarLegend)).toBe(true);
  await expect(page.locator("#shareSaveButton")).toBeEnabled();
});

test("phone day details open as a modal, preserve scroll and focus, and become a side panel on iPad", async ({
  page,
}) => {
  await ready(page);
  await upload(page);
  await expect(page.locator("#dayPanel")).not.toBeVisible();
  await expect(page.locator("#dayDetailsModal")).not.toBeVisible();
  const day = page.locator('button[data-day="1"]');
  await day.click();
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await expect(page.locator("#dayDetailsModal")).toBeVisible();
  await expect(page.locator("#dayDetailsCloseButton")).toBeFocused();
  await expect(page.locator("#dayContent .flight-row")).toHaveCount(2);
  await page.locator("[data-flight-add]").click();
  await expect(page.locator("#dayModal")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#dayDetailsModal")).toBeVisible();
  await expect(page.locator("[data-flight-add]")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(day).not.toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  await day.click();
  await page.locator("#nextDayButton").click();
  await expect(page.locator("#dayTitle")).toHaveText("June 2");
  await expect(page.locator("#dayContent")).toContainText("Standby");
  await page.mouse.click(2, 2);
  await expect(page.locator("#dayDetailsModal")).not.toBeVisible();
  await expect(page.locator("#calendarGrid :focus")).toHaveCount(0);
  await day.click();
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.locator("#dayDetailsModal")).not.toBeVisible();
  await expect(page.locator(".workspace #dayPanel")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#dayPanel")).not.toBeVisible();
  await day.click();
  await expect(page.locator("#dayDetailsModal")).toBeVisible();
  await page.evaluate(() => (document.documentElement.style.fontSize = "32px"));
  expect(
    await page
      .locator("#dayDetailsModal")
      .evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth),
  ).toBe(true);
  await closeDayDetails(page);
});

test("exports have one fixed layout across devices and monthly income can be included while the page stays private", async ({
  page,
}) => {
  await ready(page);
  await upload(page, { fourFlights: true });
  await expect(page.locator("#shareImageSize")).toHaveCount(0);
  let dimensions;
  for (const [width, height] of [
    [320, 568],
    [768, 1024],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(
      (width) =>
        (document.documentElement.style.fontSize = width === 768 ? "32px" : ""),
      width,
    );
    await page.locator("#shareCalendarButton").click();
    await expect(page.locator("#shareSaveButton")).toBeEnabled();
    const size = await page
      .locator("#sharePreviewFrame img")
      .evaluate((image) => [image.naturalWidth, image.naturalHeight]);
    expect(size[0]).toBe(1640);
    if (dimensions) expect(size).toEqual(dimensions);
    dimensions = size;
    await page.locator("#shareCloseButton").click();
  }
  await page.evaluate(() => {
    const capture = window.html2canvas;
    window.html2canvas = (node, options) => {
      window.exportedText = node.innerText;
      window.exportedMonthly = Boolean(node.querySelector(".export-income"));
      window.exportedDaily = node.querySelectorAll(".calendar-total").length;
      window.exportedTimezoneLabels =
        node.querySelectorAll(".timezone-label").length;
      window.exportedFlightTimes = [
        ...node.querySelectorAll(".calendar-flight-times time"),
      ].map((time) => time.textContent);
      return capture(node, options);
    };
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#incomePrivacyButton").click();
  await page.locator("#shareCalendarButton").click();
  await expect(page.locator("#shareSaveButton")).toBeEnabled();
  expect(await page.evaluate(() => window.exportedText)).not.toMatch(
    /Tap a date|Monthly income ↓|Preparing|฿/i,
  );
  expect(await page.evaluate(() => window.exportedText)).toContain("© bankgg");
  expect(await page.evaluate(() => window.exportedTimezoneLabels)).toBe(0);
  expect(await page.evaluate(() => window.exportedText)).toContain(
    "↑ Departure · ↓ Arrival · airport local",
  );
  expect(await page.evaluate(() => window.exportedFlightTimes)).toEqual([
    "08:00",
    "03:00",
  ]);
  await expect(page.locator("#shareIncludeIncome")).toBeEnabled();
  await page.locator("#shareIncludeIncome").click();
  await expect(page.locator("#shareIncludeIncome")).toBeChecked();
  await expect
    .poll(() => page.evaluate(() => window.exportedMonthly))
    .toBe(true);
  await expect(page.locator("#shareSaveButton")).toBeEnabled();
  expect(await page.evaluate(() => window.exportedText)).toContain(
    "Estimated monthly income",
  );
  expect(await page.evaluate(() => window.exportedText)).toContain("฿18,475");
  expect(await page.evaluate(() => window.exportedDaily)).toBe(0);
  await expect(page.locator("#incomeSection")).not.toBeVisible();
  await page.locator("#shareIncludeIncome").uncheck();
  await expect
    .poll(() => page.evaluate(() => window.exportedMonthly))
    .toBe(false);
  await expect(page.locator("#shareSaveButton")).toBeEnabled();
  await page.locator("#shareCloseButton").click();
  await page.locator("#incomePrivacyButton").click();
  await page.locator("#shareCalendarButton").click();
  await page.locator("#shareIncludeIncome").check();
  await expect(page.locator("#shareSaveButton")).toBeEnabled();
  const data = await page
    .locator("#sharePreviewFrame img")
    .evaluate(async (image) =>
      Array.from(new Uint8Array(await (await fetch(image.src)).arrayBuffer())),
    );
  require("node:fs").writeFileSync(
    "test-results/shared-calendar.png",
    Buffer.from(data),
  );
});

test("settings have clean option cards and flights show number plus destination on separate rows", async ({
  page,
}) => {
  await ready(page);
  await upload(page, { fourFlights: true });
  await page.locator("#settingsButton").click();
  await expect(
    page.locator('input[name="calendarFlightLabelMode"]'),
  ).toHaveCount(0);
  expect(
    await page
      .locator(".calendar-amount-options")
      .evaluate((group) => getComputedStyle(group).borderTopWidth),
  ).toBe("0px");
  await page
    .locator('input[name="calendarAmountMode"][value="nextDay"]')
    .check();
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(page.locator("#calendarAmountLegend")).toHaveText(
    "Daily estimate · next-day pay",
  );
  await expect(page.locator("#calendarAmountLegend")).toBeVisible();
  await expect(page.locator(".income-caption")).toContainText(
    "all flight allowances",
  );
  await page.reload();
  await page.evaluate(() => window.pilotIncomeReady);
  await expect(page.locator("#calendarAmountLegend")).toHaveText(
    "Daily estimate · next-day pay",
  );
  await expect(page.locator("#calendarAmountLegend")).toBeVisible();
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    const chips = page.locator('button[data-day="1"] .flight-chip');
    await page.evaluate(() => document.fonts.ready);
    expect(
      await chips.locator(".flight-number, .flight-arrival").evaluateAll((nodes) =>
        nodes.every((node) => {
          const range = document.createRange();
          range.selectNodeContents(node);
          return range.getClientRects().length === 1 &&
            node.scrollWidth <= node.clientWidth;
        }),
      ),
    ).toBe(true);
    expect(
      await chips.evaluateAll((nodes) =>
        nodes.every(
          (node, index) =>
            !index ||
            node.getBoundingClientRect().top >=
              nodes[index - 1].getBoundingClientRect().bottom,
        ),
      ),
    ).toBe(true);
    expect(
      await chips.evaluateAll((nodes) =>
        nodes.every((node) => node.scrollWidth <= node.clientWidth),
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#settingsButton").click();
  await page.screenshot({ path: "test-results/settings.png" });
  await page.locator("#settingsCloseButton").click();
  await page.locator("#incomePrivacyButton").click();
  await page.locator("#settingsButton").click();
  await expect(page.locator(".settings-privacy-note")).toBeVisible();
  await page.screenshot({ path: "test-results/settings-private.png" });
});

test("income privacy persists and covers the calendar, dialogs, settings, and exports", async ({
  page,
}) => {
  await ready(page);
  await upload(page);
  await expect(page.locator(".site-bar")).toContainText("Pilot Planner");
  await page.locator('button[data-day="1"]').click();
  const modalHeight = await page
    .locator("#dayDetailsModal")
    .evaluate((dialog) => dialog.scrollHeight);
  expect(modalHeight).toBeLessThan(700);
  await page.locator("#dayIncomePrivacyButton").click();
  await expect(page.locator("#dayContent .money:visible")).toHaveCount(0);
  await expect(page.locator("#dayContent .route-line")).toHaveCount(2);
  await closeDayDetails(page);
  await expect(page.locator("#incomeSection")).not.toBeVisible();
  await expect(page.locator(".calendar-total:visible")).toHaveCount(0);
  await expect(page.locator("#calendarAmountLegend")).toHaveText("");
  await expect(page.locator("#calendarAmountLegend")).not.toBeVisible();
  expect(await page.locator("body").innerText()).not.toContain("฿");
  expect(
    await page.locator('button[data-day="1"]').getAttribute("aria-label"),
  ).not.toContain("฿");
  await page.reload();
  await page.evaluate(() => window.pilotIncomeReady);
  await expect(page.locator("#incomePrivacyButton")).toHaveAttribute(
    "aria-label",
    "Show income",
  );
  await expect(page.locator("#incomeSection")).not.toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("pilotIncomeDisplaySettings"))
          .hideIncome,
    ),
  ).toBe(true);
  await page.locator("#settingsButton").click();
  await expect(page.locator("#baseSalaryInput")).not.toBeVisible();
  expect(await page.locator("#settingsModal").innerText()).not.toContain("฿");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  expect(
    await page.evaluate(() => window.pilotIncomeApp.state.display.hideIncome),
  ).toBe(true);
  await page.evaluate(async () => {
    const capture = await ensureCaptureLibrary();
    window.html2canvas = (node, options) => {
      window.privateExportText = node.innerText;
      window.privateExportSensitiveCount = node.querySelectorAll(
        ".calendar-total, .income-sensitive",
      ).length;
      return capture(node, options);
    };
  });
  await page.locator("#shareCalendarButton").click();
  await expect(page.locator("#shareIncludeIncome")).toBeEnabled();
  await expect(page.locator("#sharePreviewFrame img")).toBeVisible();
  expect(await page.evaluate(() => window.privateExportText)).not.toContain(
    "฿",
  );
  expect(await page.evaluate(() => window.privateExportSensitiveCount)).toBe(0);
  await page.locator("#shareCloseButton").click();
  await page.locator("#incomePrivacyButton").click();
  await expect(page.locator("#earnedTotal")).toBeVisible();
  await expect(page.locator("#earnedTotal")).toHaveText("฿13,425");
  await expect(page.locator("#calendarAmountLegend")).toHaveText(
    "Daily estimate · all allowances",
  );
  await page.reload();
  await page.evaluate(() => window.pilotIncomeReady);
  await expect(page.locator("#earnedTotal")).toBeVisible();
});

test("only today keeps a calendar highlight, with keyboard focus restored when needed", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-06-02T05:00:00Z"));
  await ready(page);
  await upload(page);
  await expect(page.locator(".calendar-day.today")).toHaveCount(1);
  await expect(page.locator(".calendar-day.selected")).toHaveCount(0);
  await page.locator('button[data-day="1"]').click();
  await closeDayDetails(page);
  await expect(page.locator("#calendarGrid :focus")).toHaveCount(0);
  await expect(page.locator('button[data-day="2"]')).toHaveClass(/today/);
  await expect(page.locator('button[data-day="1"]')).not.toHaveClass(
    /selected|today/,
  );
  await page.locator('button[data-day="1"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#dayDetailsModal")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator('button[data-day="1"]')).toBeFocused();
});

test("keyboard navigation and focus restoration remain usable", async ({
  page,
}) => {
  await ready(page);
  await upload(page);
  await page.locator('button[data-day="1"]').focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('button[data-day="2"]')).toBeFocused();
  await expect(page.locator("#dayTitle")).toHaveText("June 2");
  await page.locator("#settingsButton").click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#settingsButton")).toBeFocused();
});

test("printed calendar dates survive changing the device timezone", async ({
  browser,
}) => {
  const chromium = browser.browserType().name() === "chromium";
  const creator = await browser.newContext(
    chromium ? {} : { timezoneId: "Asia/Bangkok" },
  );
  const reader = await browser.newContext({
    timezoneId: "America/Los_Angeles",
  });
  try {
    const creatorPage = await creator.newPage();
    const session = chromium ? await creator.newCDPSession(creatorPage) : null;
    if (session)
      await session.send("Emulation.setTimezoneOverride", {
        timezoneId: "Asia/Bangkok",
      });
    await ready(creatorPage);
    await upload(creatorPage);
    if (session) {
      await session.send("Emulation.setTimezoneOverride", {
        timezoneId: "America/Los_Angeles",
      });
      await creatorPage.evaluate(() => window.pilotIncomeApp.renderSchedule());
      await expect(creatorPage.locator("#dayTitle")).toHaveText("June 1");
      await expect(creatorPage.locator("#earnedTotal")).toHaveText("฿13,425");
    }
    const record = await creatorPage.evaluate(async () => {
      const record = activeRecord();
      return {
        ...record,
        pdfBlob: undefined,
        pdfBytes: Array.from(
          new Uint8Array(
            await window.pilotIncomeApp.state.pdfBlob.arrayBuffer(),
          ),
        ),
      };
    });
    expect(record.schedule.range.start).toBe("2026-06-01");
    const readerPage = await reader.newPage();
    await ready(readerPage);
    await readerPage.evaluate(async (record) => {
      record.pdfBytes = new Uint8Array(record.pdfBytes).buffer;
      await databaseOperation("readwrite", (store) =>
        store.put(record, "active"),
      );
    }, record);
    await readerPage.reload();
    await readerPage.evaluate(() => window.pilotIncomeReady);
    await expect(readerPage.locator("#monthTitle")).toHaveText("June 2026");
    await expect(readerPage.locator("#dayTitle")).toHaveText("June 1");
    await expect(readerPage.locator("#earnedTotal")).toHaveText("฿13,425");
    expect(await readerPage.evaluate(() => Boolean(window.pdfjsLib))).toBe(
      false,
    );
  } finally {
    await creator.close();
    await reader.close();
  }
});

test("native sharing uses the prepared file during the click gesture and cancellation is quiet", async ({
  page,
}) => {
  await ready(page);
  await upload(page);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => true,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async ({ files }) => {
        window.shareProof = {
          active: navigator.userActivation.isActive,
          name: files[0].name,
          type: files[0].type,
        };
        throw new DOMException("Cancelled", "AbortError");
      },
    });
  });
  await page.locator("#shareCalendarButton").click();
  await expect(page.locator("#shareNativeButton")).toBeEnabled();
  await page.locator("#shareNativeButton").click();
  expect(await page.evaluate(() => window.shareProof)).toEqual({
    active: true,
    name: "tg-schedule-2026-06.png",
    type: "image/png",
  });
  await expect(page.locator("#shareStatus")).toHaveText("");
});

test("a failed legacy migration retains the original PDF and edits until retry succeeds", async ({
  page,
}) => {
  await page.addInitScript((base64) => {
    localStorage.setItem(
      "pilotIncomeSchedulePdf",
      JSON.stringify({ name: "legacy.pdf", dataUrl: "data:;base64," + base64 }),
    );
    localStorage.setItem(
      "pilotIncomeScheduleEdits",
      JSON.stringify({ key: "01 Jun 26 - 30 Jun 26|1", days: {} }),
    );
    window.originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
  }, makePdf().toString("base64"));
  await ready(page);
  await expect(page.locator("#earnedTotal")).toHaveText("฿13,425");
  await expect(page.locator("#storageNotice")).toBeVisible();
  expect(
    await page.evaluate(() =>
      Boolean(localStorage.getItem("pilotIncomeSchedulePdf")),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() =>
      Boolean(localStorage.getItem("pilotIncomeScheduleEdits")),
    ),
  ).toBe(true);
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = window.originalPut;
  });
  await page.getByRole("button", { name: "Retry saving" }).click();
  await expect(page.locator("#storageNotice")).not.toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("pilotIncomeSchedulePdf")),
  ).toBeNull();
  expect(
    await page.evaluate(() => localStorage.getItem("pilotIncomeScheduleEdits")),
  ).toBeNull();
});

test("failed offline updates retain the working cache, and accepted updates retain saved edits", async ({
  page,
}) => {
  await ready(page);
  await upload(page);
  await addFlight(page);
  await expect(page.locator("#offlineStatus")).toHaveText("Offline ready");
  const originalCaches = await page.evaluate(() => caches.keys());
  try {
    await page.request.post("/__test/worker-revision", {
      data: { version: "test-failed", failAsset: true },
    });
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration.update();
      if (registration.installing)
        await new Promise((resolve) => {
          const worker = registration.installing;
          worker.addEventListener("statechange", () => {
            if (worker.state === "redundant") resolve();
          });
        });
    });
    expect(await page.evaluate(() => caches.keys())).toEqual(originalCaches);
    await expect(page.locator("#offlineStatus")).toHaveText("Offline ready");
    await expect(page.locator("#updateButton")).not.toBeVisible();
    await page.request.post("/__test/worker-revision", {
      data: { version: "test-successful" },
    });
    await page.evaluate(async () =>
      (await navigator.serviceWorker.getRegistration()).update(),
    );
    await expect(page.locator("#updateButton")).toBeVisible();
    await Promise.all([
      page.waitForEvent("load"),
      page.locator("#updateButton").click(),
    ]);
    await page.evaluate(() => window.pilotIncomeReady);
    await expect(page.locator("#earnedTotal")).toHaveText("฿19,450");
    await expect(page.locator("#offlineStatus")).toHaveText("Offline ready");
    await expect
      .poll(() => page.evaluate(() => caches.keys()))
      .toEqual([originalCaches[0].replace(/[^:]+$/, "test-successful")]);
  } finally {
    await page.request.post("/__test/worker-revision", { data: {} });
  }
});
