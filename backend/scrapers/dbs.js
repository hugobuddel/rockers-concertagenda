import { workerData } from "worker_threads";
import * as _t from "../mods/tools.js";
import AbstractScraper from "./gedeeld/abstract-scraper.js";
import makeScraperConfig from "./gedeeld/scraper-config.js";

// SCRAPER CONFIG

const dbsScraper = new AbstractScraper(makeScraperConfig({
  maxExecutionTime: 60044,
  workerData: Object.assign({}, workerData),
  puppeteerConfig: {
    mainPage: {
      timeout: 60045,
      waitUntil: 'domcontentloaded'
    },
    singlePage: {
      timeout: 45000
    },
    app: {
      mainPage: {
        url: "https://www.dbstudio.nl/agenda/",
        requiredProperties: ['venueEventUrl', 'title', 'startDateTime']
      },
      singlePage: {
        requiredProperties: ['venueEventUrl', 'title', 'price', 'startDateTime']
      }
    }
  }
}));

dbsScraper.listenToMasterThread();

// MAKE BASE EVENTS

dbsScraper.makeBaseEventList = async function () {

  const availableBaseEvents = await this.checkBaseEventAvailable(workerData.family);
  if (availableBaseEvents){
    const thisWorkersEvents = availableBaseEvents.filter((eventEl, index) => index % workerData.workerCount === workerData.index)
    return await this.makeBaseEventListEnd({
      stopFunctie: null, rawEvents: thisWorkersEvents}
    );    
  }   

  const {stopFunctie, page} = await this.makeBaseEventListStart()

  await page.waitForSelector('.fusion-events-post')
  await _t.waitFor(100)

  const rawEvents = await page.evaluate(
    ({ months,workerData }) => {
      return Array.from(document.querySelectorAll(".fusion-events-post"))
        .map((eventEl) => {
          const title = eventEl.querySelector(".fusion-events-meta .url")?.textContent.trim() ?? null;
          const res = {
            unavailable: "",
            pageInfo: `<a class='page-info' href='${document.location.href}'>${workerData.family} - main - ${title}</a>`,
            errors: [],
            title
          };

          if (title?.toLowerCase().includes('cancelled')){ //TODO 1.algemene check maken 2. uitbreiden.
            res.unavailable += ' event cancelled'
          }

          res.venueEventUrl = eventEl.querySelector(".fusion-events-meta .url")?.href ?? null;

          const startDateEl =
            eventEl.querySelector(".tribe-event-date-start") ?? null;
          if (!startDateEl) {
            res.corrupted = 'no start date el';
          }

          const startTextcontent =
            eventEl
              .querySelector(".tribe-event-date-start")
              ?.textContent.toLowerCase() ?? "LEEG";
          res.eventDateText = startTextcontent;

          try {
            const match1 = startTextcontent.match(/(\d+)\s+(\w+)/);
            res.day = match1[1];
            let monthName = match1[2];
            res.month = months[monthName];
            res.day = res.day.padStart(2, "0");
            const yearMatch = startTextcontent.match(/\d{4}/);
            if (
              !yearMatch ||
              !Array.isArray(yearMatch) ||
              yearMatch.length < 1
            ) {
              res.year = new Date().getFullYear();
            } else {
              res.year = yearMatch[1];
            }
            res.year = res.year || new Date().getFullYear();
            const timeMatch = startTextcontent
              .match(/\d{1,2}:\d\d/);
            if (!timeMatch ||
              !Array.isArray(timeMatch) ||
              timeMatch.length < 1) {
              res.time = '12:00';
            } else {
              res.time = timeMatch[0].padStart(5, "0");
              res.startDate = `${res.year}-${res.month}-${res.day}`;
              res.startDateTime = new Date(
                `${res.startDate}T${res.time}:00Z`
              ).toISOString();
            }
                
          } catch (caughtError) {
            res.errors.push({error: caughtError, remarks: `Wirwar datums e.d. ${title}`,toDebug:res});
          }

          try {
            const endDateEl =
            eventEl.querySelector(".tribe-event-time") ?? null;            
            if (res.startDate && endDateEl) {
              if (endDateEl) {
                const endDateM = endDateEl.textContent
                  .toLowerCase()
                  .match(/\d{1,2}:\d\d/);
                if (Array.isArray(endDateM) && endDateM.length > 0) {
                  res.endTime = endDateM[0].padStart(5, "0");
                  res.endDateTime = new Date(
                    `${res.startDate}T${res.endTime}:00Z`
                  ).toISOString();
                  if (res.endDateTime === res.startDateTime) {
                    res.endDateTime = null;
                  }
                }
              }
            } 
          }
          catch (caughtError) {
            res.errors.push({error: caughtError, remarks: `Wirwar datums e.d. ${title}`,toDebug:res});
          }

          return res;
        });
    },
    { months: this.months,workerData }
  );

  this.saveBaseEventlist(workerData.family, rawEvents)
  const thisWorkersEvents = rawEvents.filter((eventEl, index) => index % workerData.workerCount === workerData.index)
  return await this.makeBaseEventListEnd({
    stopFunctie, rawEvents: thisWorkersEvents}
  );
  
};

// GET PAGE INFO

dbsScraper.getPageInfo = async function ({ page, event }) {
  
  const {stopFunctie} =  await this.getPageInfoStart()
  
  const pageInfo = await page.evaluate(({event}) => {
    const res = {
      unavailable: event.unavailable,
      pageInfo: `<a class='page-info' href='${document.location.href}'>${document.title}</a>`,
      errors: [],
    };

    res.longTextHTML = 
      document.querySelector(".tribe-events-single-event-description")
        ?.innerHTML ?? '';
    res.image =
      document.querySelector(".tribe-events-event-image .wp-post-image")?.src ??
      null;
    if (!res.image){
      res.errors.push({
        remarks: `image missing ${res.pageInfo}`
      })
    }    
    res.shortText += document.querySelector(".tribe-events-event-categories")?.textContent.toLowerCase() ??
      "";

    res.ticketURL = document.querySelector('.tribe-events-event-url a')?.href ?? null;
    if (!res.ticketURL){
      res.priceTextcontent = `€0,00`;
    }

    return res;
  }, {event});

  if (pageInfo.ticketURL && !pageInfo.unavailable) {
    try {
      await page.goto(pageInfo.ticketURL)
      await page.waitForSelector('[data-testid]', {timeout: 6500})
      await _t.waitFor(250);
      pageInfo.priceTextcontent = await page.evaluate(()=>{
        return document.querySelectorAll('[data-testid]')[1]?.textContent ?? null
      })
    } catch (caughtError) {
      pageInfo.errors.push({
        error: caughtError, 
        remarks: `prijs ophalen dbs ticketpagina ${pageInfo.pageInfo}`, 
        toDebug: {event}
      })
    }
  }

  return await this.getPageInfoEnd({pageInfo, stopFunctie, page})
  
};

dbsScraper.singleMergedEventCheck = async function(event){

  const hasGoodTerms = await this.hasGoodTerms(event)
  if (hasGoodTerms.success) return hasGoodTerms

  return {
    event,
    reason: `no good terms found ${event.categoriesToTest}`,
    success: false
  }
}
