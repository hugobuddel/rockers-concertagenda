import { workerData } from "worker_threads";
import * as _t from "../mods/tools.js";
import AbstractScraper from "./gedeeld/abstract-scraper.js";
import makeScraperConfig from "./gedeeld/scraper-config.js";


// SCRAPER CONFIG

const p60Scraper = new AbstractScraper(makeScraperConfig({
  workerData: Object.assign({}, workerData),
  puppeteerConfig: {
    mainPage: {
      timeout: 60000,
    },    
    singlePage: {
      timeout: 30000
    },
    app: {
      mainPage: {
        url: "https://p60.nl/agenda",
        requiredProperties: ['venueEventUrl', 'title', 'startDateTime']
      }
    }
  }
}));

p60Scraper.listenToMasterThread();

// MAKE BASE EVENTS

p60Scraper.makeBaseEventList = async function () {

  const {stopFunctie, page} = await this.makeBaseEventListStart()

  await _t.autoScroll(page);
  await _t.autoScroll(page);
  await _t.autoScroll(page);
  await _t.autoScroll(page);

  await _t.waitFor(50);

  const rawEvents = await page.evaluate(({workerData}) => {
    return Array.from(document.querySelectorAll(".views-infinite-scroll-content-wrapper > .p60-list__item-container")).filter(itemEl => {
      return itemEl.textContent.includes('concert')
    }).map(
      (itemEl) => {
        const title = itemEl.querySelector(
          ".p60-list__item__title"
        )?.textContent.trim() ?? '';

        const res = {
          unavailable: '',
          pageInfo: `<a href='${document.location.href}'>${workerData.family} main - ${title}</a>`,
          errors: [],
          title
        };

        res.venueEventUrl = itemEl.querySelector('.field-group-link')?.href;

        const doorOpenDateTimeB = itemEl.querySelector('.p60-list__item__date time')?.getAttribute('datetime')
        try {
          res.doorOpenDateTime = new Date(doorOpenDateTimeB).toISOString();
        } catch (caughtError) {
          res.errors.push({error: caughtError, remarks: `openDoorDateTime omzetten ${doorOpenDateTimeB}`})
        }

        const startTime = itemEl.querySelector('.field--name-field-aanvang')?.textContent.trim();
        let startDateTimeB ;
        if (res.doorOpenDateTime){
          startDateTimeB = doorOpenDateTimeB.replace(/T\d\d:\d\d/, `T${startTime}`);
          try {
            res.startDateTime = new Date(startDateTimeB).toISOString();
          } catch (caughtError) {
            res.errors.push({error: caughtError, remarks: `startDateTime omzetten ${startDateTimeB}`})
            res.unavailable = 'geen startdatetime.'
          }
        }

        res.shortText = itemEl.querySelector('.p60-list__item__description')?.textContent.trim() ?? '';
        const imageMatch = Array.from(document.querySelectorAll('style')).map(styleEl => styleEl.innerHTML).join(`\n`).match(/topbanner.*background-image.*(https.*\.jpg)/)
        if (imageMatch){
          res.image = imageMatch[1]
        }
        return res;
      }
    );
  }, {workerData});

  return await this.makeBaseEventListEnd({
    stopFunctie, page, rawEvents}
  );
};


// @TODO Rock control naar async

// GET PAGE INFO

p60Scraper.getPageInfo = async function ({ page, event }) {
  
  const {stopFunctie} =  await this.getPageInfoStart()

  if (event.unavailable){
    return await this.getPageInfoEnd({pageInfo: {}, stopFunctie, page})
  }
  
  const pageInfo = await page.evaluate(
    ({event}) => {

      const res = {
        unavailable: event.unavailable,
        pageInfo: `<a href='${document.location.href}'>${document.title}</a>`,
        errors: [],
      };

      // res.ticketURL = document.querySelector('.content-section__event-info [href*="ticketmaster"]')?.href ?? null;
      res.longTextHTML = Array.from(document.querySelectorAll('.kmtContent, .group-footer .media-section')).reduce((prev, next) => prev + next.innerHTML,'')
      return res;
    }, {event}
  );

  return await this.getPageInfoEnd({pageInfo, stopFunctie, page})
  
};
