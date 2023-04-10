import { workerData } from "worker_threads";
import * as _t from "../mods/tools.js";
import AbstractScraper from "./gedeeld/abstract-scraper.js";
import makeScraperConfig from "./gedeeld/scraper-config.js";

// SCRAPER CONFIG

const depulScraper = new AbstractScraper(makeScraperConfig({
  maxExecutionTime: 60000,
  workerData: Object.assign({}, workerData),
  puppeteerConfig: {
    mainPage: {
      timeout: 35000,
    },
    singlePage: {
      timeout: 25000
    },
    app: {
      mainPage: {
        url: "https://www.livepul.com/agenda/",
        requiredProperties: ['venueEventUrl', 'title']
      }
    }
  }
}));

depulScraper.listenToMasterThread();

// MAKE BASE EVENTS

depulScraper.makeBaseEventList = async function () {

  const {stopFunctie, page} = await this.makeBaseEventListStart()

  await page.evaluate(() => {
    // hack op site
    loadContent("all", "music"); // eslint-disable-line
  });

  await _t.waitFor(250);

  let rawEvents = await page.evaluate(
    ({ months,workerData }) => {
      return Array.from(document.querySelectorAll(".agenda-item"))
        .filter((rawEvent, index) => index % workerData.workerCount === workerData.index)
        .map((rawEvent) => {
          const title = rawEvent.querySelector("h2")?.textContent.trim() ?? "";
          const res = {
            unavailable: "",
            pageInfo: `<a href='${document.location.href}'>${workerData.family} - main - ${title}</a>`,
            errors: [],
            title
          };     
          res.shortText = 
            rawEvent.querySelector(".text-box .desc")?.textContent.trim() ?? "";
          
          const startDay =
            rawEvent
              .querySelector("time .number")
              ?.textContent.trim()
              ?.padStart(2, "0") ?? null;
          const startMonthName =
            rawEvent.querySelector(".time month")?.textContent.trim() ?? null;
          const startMonth = months[startMonthName];
          const startMonthJSNumber = Number(startMonth) - 1;
          const refDate = new Date();
          let startYear = refDate.getFullYear();
          if (startMonthJSNumber < refDate.getMonth()) {
            startYear = startYear + 1;
          }
          res.startDate = `${startYear}-${startMonth}-${startDay}`;
          res.venueEventUrl = rawEvent.querySelector("a")?.href ?? null;

          const imageMatch =
            rawEvent
              .querySelector("a")
              ?.getAttribute("style")
              .match(/url\('(.*)'\)/) ?? null;
          if (
            imageMatch &&
            Array.isArray(imageMatch) &&
            imageMatch.length === 2
          ) {
            res.image = imageMatch[1];
          }

          return res;
        });
    },
    { months: this.months,workerData}
  );

  return await this.makeBaseEventListEnd({
    stopFunctie, page, rawEvents}
  );
  
};

// GET PAGE INFO

depulScraper.getPageInfo = async function ({ page, event }) {
  
  const {stopFunctie} =  await this.getPageInfoStart()
  
  const pageInfo = await page.evaluate(
    ({ months , event}) => {
      const res = {
        unavailable: event.unavailable,
        pageInfo: `<a class='page-info' href='${document.location.href}'>${event.title}</a>`,
        errors: [],
      };

      try {
        const contentBox = document.querySelector("#content-box") ?? null;
        if (contentBox) {
          [
            contentBox.querySelector(".item-bottom") ?? null,
            contentBox.querySelector(".social-content") ?? null,
            contentBox.querySelector(".facebook-comments") ?? null,
          ].forEach((removeFromContentBox) => {
            if (removeFromContentBox) {
              contentBox.removeChild(removeFromContentBox);
            }
          });
          res.longTextHTML = contentBox.innerHTML;
        }
      } catch (caughtError) {
        res.errors.push({
          caughtError,
          remarks: `longTextHTML ${event.title}`,
        });
      }

      const agendaTitleBar =
        document.getElementById("agenda-title-bar") ?? null;
      res.shortText = agendaTitleBar?.querySelector("h3")?.textContent.trim();
      const rightHandDataColumn =
        agendaTitleBar?.querySelector(".column.right") ?? null;
      if (!rightHandDataColumn) {
        return res;
      }
      rightHandDataColumn
        .querySelectorAll("h1 + ul li")
        ?.forEach((columnRow) => {
          const lowerCaseTextContent = columnRow?.textContent.toLowerCase();
          if (lowerCaseTextContent.includes("datum")) {
            try {
              const startDateMatch = lowerCaseTextContent.match(
                /(\d\d)\s+(\w{2,3})\s+(\d{4})/
              );
              if (
                startDateMatch &&
                Array.isArray(startDateMatch) &&
                startDateMatch.length === 4
              ) {
                res.startDate = `${startDateMatch[3]}-${
                  months[startDateMatch[2]]
                }-${startDateMatch[1]}`;
                if (!res.startDate){
                  throw Error('geen start date');
                }
              }
            } catch (caughtError) {
              res.errors.push({ error: caughtError, remarks: `startDate mislukt ${event.title}` });
            }
          } else if (lowerCaseTextContent.includes("aanvang")) {
            if (!res.startDate) {
              return res;
            }
            try {
              const startTimeMatch = lowerCaseTextContent.match(/\d\d:\d\d/);
              if (
                startTimeMatch &&
                Array.isArray(startTimeMatch) &&
                startTimeMatch.length === 1
              ) {
                res.startDateTime = new Date(
                  `${res.startDate}T${startTimeMatch[0]}:00`
                ).toISOString();
              }
            } catch (caughtError) {
              res.errors.push({
                error: caughtError,
                remarks: `startDateTime en startDate samenvoegen ${event.title}`,
              });
            }
          } else if (lowerCaseTextContent.includes("open")) {
            if (!res.startDate) {
              return res;
            }
            try {
              const doorTimeMatch = lowerCaseTextContent.match(/\d\d:\d\d/);
              if (
                doorTimeMatch &&
                Array.isArray(doorTimeMatch) &&
                doorTimeMatch.length === 1
              ) {
                res.doorOpenDateTime = new Date(
                  `${res.startDate}T${doorTimeMatch[0]}:00`
                ).toISOString();
              }
            } catch (caughtError) {
              res.errors.push({
                error: caughtError,
                remarks: `doorDateTime en startDate ${event.title}`,
              });
            }
          }
          if (!res.startDateTime && res.doorOpenDateTime) {
            res.startDateTime = res.doorOpenDateTime;
            res.doorOpenDateTime = null;
          }
        });
      if (!res.startDateTime) {
        res.unavailable += " geen start date time";
      }
      return res;
    },
    { months: this.months , event}
  );

  return await this.getPageInfoEnd({pageInfo, stopFunctie, page})

};

// SINGLE EVENT CHECK 

depulScraper.singleEventCheck = async function (event) {
  const firstCheckText = `${event?.title ?? ""} ${event?.shortText ?? ""}`;
  if (
    firstCheckText.includes("metal") ||
    firstCheckText.includes("punk") ||
    firstCheckText.includes("punx") ||
    firstCheckText.includes("noise") ||
    firstCheckText.includes("industrial")
  ) {
    return {
      event,
      success: true,
      reason: "Genres in title+shortText",
    };
  }

  const tempPage = await this.browser.newPage();
  await tempPage.goto(event.venueEventUrl, {
    waitUntil: "domcontentloaded",
    timeout: this.singlePageTimeout,
  });

  const rockMetalOpPagina = await tempPage.evaluate(() => {
    const tc =
      document.getElementById("content-box")?.textContent.toLowerCase() ?? "";
    return (
      tc.includes("metal") ||
      tc.includes("punk") ||
      tc.includes("thrash") ||
      tc.includes("punx") ||
      tc.includes("noise") ||
      tc.includes("industrial")
    );
  });
  await tempPage.close();

  if (rockMetalOpPagina) {
    return {
      event,
      success: true,
      reason: "Genres found in text of event URL",
    };
  }

  return {
    event,
    success: false,
    reason: "genres not in title, shortText, or event URL",
  };
};