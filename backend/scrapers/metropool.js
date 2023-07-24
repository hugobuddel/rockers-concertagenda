import { workerData } from "worker_threads";
import * as _t from "../mods/tools.js";
import AbstractScraper from "./gedeeld/abstract-scraper.js";
import makeScraperConfig from "./gedeeld/scraper-config.js";

//#region [rgba(0, 60, 0, 0.3)]       SCRAPER CONFIG
const metropoolScraper = new AbstractScraper(makeScraperConfig({
  maxExecutionTime: 120000,
  workerData: Object.assign({}, workerData),
  puppeteerConfig: {
    mainPage: {
      timeout: 60000,
      waitUntil: "load",
    },
    singlePage: {
      timeout: 45000
    },
    app: {
      mainPage: {
        url: "https://metropool.nl/agenda",
        requiredProperties: ['venueEventUrl', 'title']
      },
      singlePage: {
        requiredProperties: ['venueEventUrl', 'title', 'price', 'startDateTime']
      }
    }
  }
}));
//#endregion                          SCRAPER CONFIG

metropoolScraper.listenToMasterThread();

//#region [rgba(0, 120, 0, 0.3)]      RAW EVENT CHECK
metropoolScraper.singleRawEventCheck = async function(event){

  const workingTitle = this.cleanupEventTitle(event.title)

  const isRefused = await this.rockRefuseListCheck(event, workingTitle)
  if (isRefused.success) return {
    reason: isRefused.reason,
    event,
    success: false
  };

  const isAllowed = await this.rockAllowListCheck(event, workingTitle)
  if (isAllowed.success) return isAllowed;

  const hasForbiddenTerms = await this.hasForbiddenTerms(event);
  if (hasForbiddenTerms.success) {
    await this.saveRefusedTitle(workingTitle)
    return {
      reason: hasForbiddenTerms.reason,
      success: false,
      event
    }
  }

  const hasGoodTermsRes = await this.hasGoodTerms(event);
  if (hasGoodTermsRes.success) {
    await this.saveAllowedTitle(workingTitle)
    return hasGoodTermsRes;
  }

  const isRockRes = await this.isRock(event, [workingTitle]);
  if (isRockRes.success){
    await this.saveAllowedTitle(workingTitle)
  } else {
    await this.saveRefusedTitle(workingTitle)
  }
  return isRockRes;
}
//#endregion                          RAW EVENT CHECK

//#region [rgba(0, 180, 0, 0.3)]      SINGLE EVENT CHECK
//#endregion                          SINGLE EVENT CHECK

//#region [rgba(0, 240, 0, 0.3)]      BASE EVENT LIST
metropoolScraper.makeBaseEventList = async function () {

  const availableBaseEvents = await this.checkBaseEventAvailable(workerData.family);
  if (availableBaseEvents){
    const thisWorkersEvents = availableBaseEvents.filter((eventEl, index) => index % workerData.workerCount === workerData.index)
    return await this.makeBaseEventListEnd({
      stopFunctie: null, rawEvents: thisWorkersEvents}
    );    
  }  

  const {stopFunctie, page} = await this.makeBaseEventListStart()

  await _t.autoScroll(page);
  await _t.autoScroll(page);
  await _t.autoScroll(page);

  let rawEvents = await page.evaluate(({workerData, unavailabiltyTerms}) => {
    return Array.from(document.querySelectorAll(".card--event"))
      .map((rawEvent) => {
        const title = rawEvent.querySelector(".card__title")?.textContent ?? null;
        const res = {
          pageInfo: `<a class='page-info' href='${location.href}'>${workerData.family} main - ${title}</a>`,
          errors: [],        
          title,  
        }          
        res.venueEventUrl = rawEvent?.href ?? null;
        const genres = rawEvent.dataset?.genres ?? '';
        const st = rawEvent.querySelector(".card__title card__title--sub")?.textContent;
        res.shortText = (st + ' ' + genres).trim();
        const uaRex = new RegExp(unavailabiltyTerms.join("|"), 'gi');
        res.unavailable = !!rawEvent.textContent.match(uaRex);        
        res.soldOut = !!rawEvent.querySelector(".card__title--label")?.textContent.match(/uitverkocht|sold\s?out/i) ?? null;
        return res;
      });
  }, {workerData, unavailabiltyTerms: AbstractScraper.unavailabiltyTerms})
  
  rawEvents = rawEvents.map(this.isMusicEventCorruptedMapper);
  
  this.saveBaseEventlist(workerData.family, rawEvents)
  const thisWorkersEvents = rawEvents.filter((eventEl, index) => index % workerData.workerCount === workerData.index)
  return await this.makeBaseEventListEnd({
    stopFunctie, rawEvents: thisWorkersEvents}
  );
};
//#endregion                          BASE EVENT LIST

// GET PAGE INFO

metropoolScraper.getPageInfo = async function ({ page, event}) {

  const {stopFunctie} =  await this.getPageInfoStart()
  
  const pageInfo = await page.evaluate(({months, event}) => {
    const res = {
      pageInfo: `<a class='page-info' href='${location.href}'>${event.title}</a>`,
      errors: [],
    };

    res.priceTextcontent = 
      document.querySelector(".doorPrice")?.textContent.trim() ?? '';

    res.shortText = event.shortText + ' ' + document.querySelector('.title-wrap-medium .text-support')?.textContent.trim()



    const startDateRauwMatch = document
      .querySelector(".event-title-wrap")
      ?.innerHTML.match(
        /(\d{1,2})\s*(jan|feb|mrt|apr|mei|jun|jul|aug|sep|okt|nov|dec)\s*(\d{4})/
      );

    if (!Array.isArray(startDateRauwMatch) || !startDateRauwMatch.length) {
      res.errors.push({
        remarks: `geen match startDate ${res.pageInfo}`,
        toDebug: {
          text: document
            .querySelector(".event-title-wrap")
            ?.innerHTML,
          res
        }
      })
      return res;
    } 

    const day = startDateRauwMatch[1];
    const month = months[startDateRauwMatch[2]];
    const year = startDateRauwMatch[3];
    const startDate = `${year}-${month}-${day}`;

    try {
      const startTimeMatch = document
        .querySelector(".beginTime")
        ?.innerHTML.match(/\d\d:\d\d/);
      if (startTimeMatch && startTimeMatch.length) {
        res.startDateTime = new Date(
          `${startDate}:${startTimeMatch[0]}`
        ).toISOString();
      } else {
        res.errors.push({
          remarks: `wel datum, geen starttijd ${res.pageInfo}`,
          toDebug: {
            text: document
              .querySelector(".beginTime")
              ?.innerHTML,
            res
          }
        })
        return res;
      }
      const doorTimeMatch = document
        .querySelector(".doorOpen")
        ?.innerHTML.match(/\d\d:\d\d/);
      if (doorTimeMatch && doorTimeMatch.length) {
        res.doorOpenDateTime = new Date(
          `${startDate}:${doorTimeMatch[0]}`
        ).toISOString();
      }
    } catch (caughtError) {
      res.errors.push({
        error: caughtError,
        remarks: `start deurtijd match en of dateconversie ${res.pageInfo}`,
        toDebug: {
          event
        }
      });
    }

    const ofc = document.querySelector(".object-fit-cover");
    res.image = document.contains(ofc) && `https://metropool.nl/${ofc.srcset}`;
    if (!res.image){
      res.errors.push({
        remarks: `image missing ${res.pageInfo}`
      })
    }   

    return res;
  }, {months: this.months, event});

  const longTextRes = await longTextSocialsIframes(page)
  for (let i in longTextRes){
    pageInfo[i] = longTextRes[i]
  }

  return await this.getPageInfoEnd({pageInfo, stopFunctie, page, event})
  
};

// #region [rgba(60, 0, 0, 0.5)]     LONG HTML
async function longTextSocialsIframes(page){

  return await page.evaluate(()=>{
    const res = {}


    const textSelector = '.event-title-wrap + div';
    const mediaSelector = [".video-container iframe, .spotify iframe"].join(", ");
    const removeEmptyHTMLFrom = textSelector;
    const socialSelector = [
      ".button--rsvp[href*='facebook']"
    ].join(", ");
    const removeSelectors = [
      "[class*='icon-']",
      "[class*='fa-']",
      ".fa",
      `${textSelector} script`,
      `${textSelector} img`,
      `${textSelector} .video-container`
    ].join(", ");

    const attributesToRemove = [
      "style",
      "hidden",
      "_target",
      "frameborder",
      "onclick",
      "aria-hidden",
      "allow",
      "allowfullscreen",
      "data-deferlazy",
      "width",
      "height",
    ];
    const attributesToRemoveSecondRound = ["class", "id"];
    const removeHTMLWithStrings = [];

    // eerst onzin attributes wegslopen
    const socAttrRemSelAdd = `${
      socialSelector.length ? `, ${socialSelector}` : ""
    }`;
    const mediaAttrRemSelAdd = `${
      mediaSelector.length ? `, ${mediaSelector} *, ${mediaSelector}` : ""
    }`;      
    document
      .querySelectorAll(`${textSelector} *${socAttrRemSelAdd}${mediaAttrRemSelAdd}`)
      .forEach((elToStrip) => {
        attributesToRemove.forEach((attr) => {
          if (elToStrip.hasAttribute(attr)) {
            elToStrip.removeAttribute(attr);
          }
        });
      });

   
    //media obj maken voordat HTML verdwijnt
    res.mediaForHTML = !mediaSelector.length ? '' : Array.from(
      document.querySelectorAll(mediaSelector)
    ).map((bron) => {
      bron.className = "";
        
      
      if (bron.hasAttribute('src') && bron.getAttribute('src').includes('youtube')) {
        return {
          outer: bron.outerHTML,
          src: bron.src,
          id: null,
          type: "youtube",
        };
      } 
        

      // terugval???? nog niet bekend met alle opties.
      return {
        outer: bron.outerHTML,
        src: bron.src,
        id: null,
        type: bron.src.includes("spotify")
          ? "spotify"
          : bron.src.includes("youtube")
            ? "youtube"
            : "bandcamp",
      };
    });

    //socials obj maken voordat HTML verdwijnt
    res.socialsForHTML = !socialSelector
      ? ""
      : Array.from(document.querySelectorAll(socialSelector)).map((el) => {
        el.querySelectorAll("i, svg, img").forEach((rm) =>
          rm.parentNode.removeChild(rm)
        );

        if (!el.textContent.trim().length) {
          if (el.href.includes("facebook")) {
            el.textContent = "Facebook";
          } else if (el.href.includes("twitter")) {
            el.textContent = "Tweet";
          } else {
            el.textContent = "Onbekende social";
          }
        }
        el.className = "";
        el.target = "_blank";
        return el.outerHTML;
      });

    // stript HTML tbv text
    removeSelectors.length &&
        document
          .querySelectorAll(removeSelectors)
          .forEach((toRemove) => toRemove.parentNode.removeChild(toRemove));

    // verwijder ongewenste paragrafen over bv restaurants
    Array.from(
      document.querySelectorAll(
        `${textSelector} p, ${textSelector} span, ${textSelector} a`
      )
    ).forEach((verwijder) => {
      const heeftEvilString = !!removeHTMLWithStrings.find((evilString) =>
        verwijder.textContent.includes(evilString)
      );
      if (heeftEvilString) {
        verwijder.parentNode.removeChild(verwijder);
      }
    });

    // lege HTML eruit cq HTML zonder tekst of getallen
    document
      .querySelectorAll(`${removeEmptyHTMLFrom} > *`)
      .forEach((checkForEmpty) => {
        const leegMatch = checkForEmpty.innerHTML
          .replace("&nbsp;", "")
          .match(/[\w\d]/g);
        if (!Array.isArray(leegMatch)) {
          checkForEmpty.parentNode.removeChild(checkForEmpty);
        }
      });

    // laatste attributen eruit.
    document.querySelectorAll(`${textSelector} *`).forEach((elToStrip) => {
      attributesToRemoveSecondRound.forEach((attr) => {
        if (elToStrip.hasAttribute(attr)) {
          elToStrip.removeAttribute(attr);
        }
      });
    });

    // tekst.
    res.textForHTML = Array.from(document.querySelectorAll(textSelector))
      .map((el) => el.innerHTML)
      .join("");


    return res;
  })
  
}
// #endregion                        LONG HTML