import { workerData } from "worker_threads";
import AbstractScraper from "./gedeeld/abstract-scraper.js";
import makeScraperConfig from "./gedeeld/scraper-config.js";

// SCRAPER CONFIG

const bibelotScraper = new AbstractScraper(makeScraperConfig({
  maxExecutionTime: 30001,
  workerData: Object.assign({}, workerData),
  hasDecentCategorisation: true,
  puppeteerConfig: {
    mainPage: {
      timeout: 15002,
    },
    singlePage: {
      timeout: 20003
    },
    app: {
      mainPage: {
        url: "https://bibelot.net/",
        requiredProperties: ['venueEventUrl', 'title']
      },
      singlePage: {
        requiredProperties: ['venueEventUrl', 'title', 'startDateTime']
      }      
    }
  
  }
}));

bibelotScraper.listenToMasterThread();

bibelotScraper.singleRawEventCheck = async function(event){
  const hasForbiddenTermsRes = await bibelotScraper.hasForbiddenTerms(event);
  return {
    event,
    reason: hasForbiddenTermsRes.reason,
    success: !hasForbiddenTermsRes.success,
  }
  
}

// MAKE BASE EVENTS

bibelotScraper.makeBaseEventList = async function () {

  const availableBaseEvents = await this.checkBaseEventAvailable(workerData.family);
  if (availableBaseEvents){
    const thisWorkersEvents = availableBaseEvents.filter((eventEl, index) => index % workerData.workerCount === workerData.index)
    return await this.makeBaseEventListEnd({
      stopFunctie: null, rawEvents: thisWorkersEvents}
    );    
  }   

  const {stopFunctie, page} = await this.makeBaseEventListStart()

  let rawEvents = await page.evaluate(({workerData}) => {
    return Array.from(
      document.querySelectorAll(
        '.event[class*="metal"], .event[class*="punk"], .event[class*="rock"]'
      )
    ).map((eventEl) => {
      
      const title = eventEl.querySelector("h1")?.textContent.trim() ?? null;
      const res = {
        pageInfo: `<a class='page-info' href='${location.href}'>${workerData.family} main - ${title}</a>`,
        errors: [],
        title
      };

      const shortTextEl = eventEl.querySelector("h1")?.parentNode;
      const shortTextSplit = eventEl.contains(shortTextEl)
        ? shortTextEl.textContent.split(res.title)
        : [null, null];
      res.shortText = shortTextSplit[1];
      res.venueEventUrl = eventEl.querySelector(".link")?.href ?? null;
      res.soldOut = !!eventEl.querySelector('.ticket-button')?.textContent.match(/uitverkocht|sold\s?out/i) ?? null;
      return res;
    });
  }, {workerData})
  rawEvents = rawEvents.map(this.isMusicEventCorruptedMapper);

  this.saveBaseEventlist(workerData.family, rawEvents)
  const thisWorkersEvents = rawEvents.filter((eventEl, index) => index % workerData.workerCount === workerData.index)
  return await this.makeBaseEventListEnd({
    stopFunctie, page, rawEvents: thisWorkersEvents}
  );
  
};

// GET PAGE INFO

bibelotScraper.getPageInfo = async function ({ page, event }) {
  
  const {stopFunctie} =  await this.getPageInfoStart(event)
  
  const pageInfo = await page.evaluate(
    ({ months , event}) => {
      const res = {
        pageInfo: `<a class='page-info' href='${location.href}'>${event.title}</a>`,
        errors: [],
      };

      const baseDateM = document
        .querySelector(".main-column h3")
        ?.textContent.match(/(\d+)\s(\w+)\s(\d{4})/) ?? null;

      res.baseDate = null;
      if (!Array.isArray(baseDateM) || baseDateM.length < 4) {
        return res;
      } else {
        res.baseDate = `${baseDateM[3]}-${
          months[baseDateM[2]]
        }-${baseDateM[1].padStart(2, "0")}`;
      }

      res.eventMetaColomText = 
          document
            .querySelector(".meta-colom")
            ?.textContent.toLowerCase()

      res.startTimeMatch = res.eventMetaColomText.match(
        /(aanvang\sshow|aanvang|start\sshow|show)\W?\s+(\d\d:\d\d)/
      );
      res.doorTimeMatch = res.eventMetaColomText.match(
        /(doors|deuren|zaal\sopen)\W?\s+(\d\d:\d\d)/
      );
      res.endTimeMatch = res.eventMetaColomText.match(
        /(end|eind|einde|curfew)\W?\s+(\d\d:\d\d)/
      );
     

      try {
        if (Array.isArray(res.doorTimeMatch) && res.doorTimeMatch.length > 2 && res.baseDate) {
          res.doorOpenDateTime = new Date(
            `${res.baseDate}T${res.doorTimeMatch[2]}:00`
          ).toISOString();
        }
      } catch (errorCaught) {
        res.errors.push({
          error: errorCaught,
          remarks: `doortime match met basedate ${res.pageInfo}`,
          toDebug: res
        });
      }
      try {
        if (
          Array.isArray(res.startTimeMatch) &&
          res.startTimeMatch.length > 2 &&
          res.baseDate
        ) {
          res.startDateTime = new Date(
            `${res.baseDate}T${res.startTimeMatch[2]}:00`
          ).toISOString();
        } else if (res.doorOpenDateTime) {
          res.startDateTime = res.doorOpenDateTime;
          res.doorOpenDateTime = "";
        }
      } catch (errorCaught) {
        res.errors.push({
          error: errorCaught,
          remarks: `startTime match met basedate ${res.pageInfo}`,
          toDebug: res          
        });
      }
      try {
        if (Array.isArray(res.endTimeMatch) && res.endTimeMatch.length > 2 && res.baseDate) {
          res.endDateTime = new Date(
            `${res.baseDate}T${res.endTimeMatch[2]}:00`
          ).toISOString();
        }
      } catch (errorCaught) {
        res.errors.push({
          error: errorCaught,
          remarks: `endtime match met basedate ${res.pageInfo}`,
          toDebug: res          
        });
      }

      const verkoopElAr = Array.from(
        document.querySelectorAll(".meta-info")
      ).filter((metaInfo) => {
        return metaInfo?.textContent.toLowerCase().includes("verkoop");
      });

      if (verkoopElAr && Array.isArray(verkoopElAr) && verkoopElAr.length) {
        res.priceTextcontent = verkoopElAr[0].textContent;
      }

      // #region longHTML

      const mediaSelector = ['.main-column iframe', 
      ].join(', ');
      const textSelector = '.main-column';
      const removeEmptyHTMLFrom = '.main-column'//textSelector;
      const socialSelector = [
        ".main-column p a[rel*='noreferrer noopener']"
      ].join(', ');
      const removeSelectors = [`.main-column > .content:first-child`, 
        '.main-column > .achtergrond-afbeelding:first-child',
        '.main-column > .content + .achtergrond-afbeelding', // onduidelijk welke
        ".main-column .wp-block-embed",
        ".main-column p a[rel*='noreferrer noopener']" // embed wrappers
      ].join(', ')
      
      const attributesToRemove = ['style', 'hidden', '_target', "frameborder", 'onclick', 'aria-hidden'];
      const attributesToRemoveSecondRound = ['class', 'id' ];
      const removeHTMLWithStrings = ['hapje en een drankje'];

      // eerst onzin attributes wegslopen
      const socAttrRemSelAdd = `${socialSelector ? `, ${socialSelector} *` : ''}`
      document.querySelectorAll(`${textSelector} *${socAttrRemSelAdd}`)
        .forEach(elToStrip => {
          attributesToRemove.forEach(attr => {
            if (elToStrip.hasAttribute(attr)){
              elToStrip.removeAttribute(attr)
            }
          })
        })

      // media obj maken voordat HTML verdwijnt
      res.mediaForHTML = Array.from(document.querySelectorAll(mediaSelector))
        .map(bron => {
          const src = bron?.src ? bron.src : '';
          return {
            outer: bron.outerHTML,
            src,
            id: null,
            type: src.includes('spotify') 
              ? 'spotify' 
              : src.includes('youtube') 
                ? 'youtube'
                : 'bandcamp'
          }
        })

      // socials obj maken voordat HTML verdwijnt
      res.socialsForHTML = !socialSelector ? '' : Array.from(document.querySelectorAll(socialSelector))
        .map(el => {

          el.querySelectorAll('i, svg, img').forEach(rm => rm.parentNode.removeChild(rm))

          if (!el.textContent.trim().length){
            if (el.href.includes('facebook')){
              el.textContent = 'Facebook';
            } else if(el.href.includes('twitter')) {
              el.textContent = 'Tweet';
            } else {
              el.textContent = 'Onbekende social';
            }
          }          
          el.className = 'long-html__social-list-link'
          el.target = '_blank'
          return el.outerHTML
        })

      // stript HTML tbv text
      removeSelectors.length && document.querySelectorAll(removeSelectors)
        .forEach(toRemove => toRemove.parentNode.removeChild(toRemove))

      // verwijder ongewenste paragrafen over bv restaurants
      Array.from(document.querySelectorAll(`${textSelector} p, ${textSelector} span, ${textSelector} a`))
        .forEach(verwijder => {
          const heeftEvilString = !!removeHTMLWithStrings.find(evilString => verwijder.textContent.includes(evilString))
          if (heeftEvilString) {
            verwijder.parentNode.removeChild(verwijder)
          }
        });

      // lege HTML eruit cq HTML zonder tekst of getallen
      document.querySelectorAll(`${removeEmptyHTMLFrom} > *`)
        .forEach(checkForEmpty => {
          const leegMatch = checkForEmpty.innerHTML.match(/[\w\d]/g);
          if (!Array.isArray(leegMatch)){
            checkForEmpty.parentNode.removeChild(checkForEmpty)
          }
        })

      // laatste attributen eruit.
      document.querySelectorAll(`${textSelector} *`)
        .forEach(elToStrip => {
          attributesToRemoveSecondRound.forEach(attr => {
            if (elToStrip.hasAttribute(attr)){
              elToStrip.removeAttribute(attr)
            }
          })
        })      

      // tekst.
      res.textForHTML = Array.from(document.querySelectorAll(textSelector))
        .map(el => el.innerHTML)
        .join('')

      // #endregion longHTML


      const imageMatch = document
        .querySelector(".achtergrond-afbeelding")
        ?.style.backgroundImage.match(/https.*.png|https.*.jpg|https.*.jpeg/);
      if (imageMatch && imageMatch.length) {
        res.image = imageMatch[0];
      }

      if (!res.image){
        res.errors.push({
          remarks: `image niet gevonden ${res.pageInfo}`,
          toDebug:{
            imageStyle: document
              .querySelector(".achtergrond-afbeelding")
              ?.style
          }
        })
      }

      return res;
    },
    { months: this.months, event }
  );

  return await this.getPageInfoEnd({pageInfo, stopFunctie, page, event})
  
}
