import { workerData } from "worker_threads";
import AbstractScraper from "./gedeeld/abstract-scraper.js";
import makeScraperConfig from "./gedeeld/scraper-config.js";

//#region [rgba(0, 60, 0, 0.3)]       SCRAPER CONFIG
const dynamoScraper = new AbstractScraper(makeScraperConfig({
  maxExecutionTime: 60059,
  workerData: Object.assign({}, workerData),
  puppeteerConfig: {
    mainPage: {
      timeout: 35060,
    },
    singlePage: {
      timeout: 25061
    },
    app: {
      mainPage: {
        url: "https://www.dynamo-eindhoven.nl/programma/?_sfm_fw%3Aopt%3Astyle=15",
        requiredProperties: ['venueEventUrl', 'title']
      },
      singlePage: {
        requiredProperties: ['venueEventUrl', 'title', 'price', 'start']
      }
    }
  }
}));
//#endregion                          SCRAPER CONFIG

dynamoScraper.listenToMasterThread();

//#region [rgba(0, 120, 0, 0.3)]      RAW EVENT CHECK
//#endregion                          RAW EVENT CHECK

//#region [rgba(0, 180, 0, 0.3)]      SINGLE EVENT CHECK
dynamoScraper.singleMergedEventCheck = async function(event){

  let workingTitle = this.cleanupEventTitle(event.title);

  const isRefused = await this.rockRefuseListCheck(event, workingTitle)
  if (isRefused.success) return {
    reason: isRefused.reason,
    event,
    success: false
  };

  const isAllowed = await this.rockAllowListCheck(event, workingTitle)
  if (isAllowed.success) return isAllowed;

  const hasGoodTermsRes = await this.hasGoodTerms(event);
  const hasForbiddenTermsRes = await this.hasForbiddenTerms(event);
  if (hasForbiddenTermsRes.success) {
    await this.saveRefusedTitle(workingTitle);
    return {
      event,
      reason: hasForbiddenTermsRes.success,
      success: false,
    }
  }
  
  if (hasGoodTermsRes.success) {
    await this.saveAllowedTitle(workingTitle);
    return hasGoodTermsRes;
  } 

  const isRockRes = await this.isRock(event, [workingTitle]);
  if (isRockRes.success) {
    await this.saveAllowedTitle(workingTitle);
    return isRockRes;
  } 
  await this.saveRefusedTitle(workingTitle);
  
  return {
    event,
    reason: isRockRes.reason,
    success: false
  }
  
}
//#endregion                          SINGLE EVENT CHECK

//#region [rgba(0, 240, 0, 0.3)]      MAIN PAGE
dynamoScraper.mainPage = async function () {

  const availableBaseEvents = await this.checkBaseEventAvailable(workerData.family);
  if (availableBaseEvents){
    const thisWorkersEvents = availableBaseEvents.filter((eventEl, index) => index % workerData.workerCount === workerData.index)
    return await this.mainPageEnd({
      stopFunctie: null, rawEvents: thisWorkersEvents}
    );    
  }    

  const {stopFunctie, page} = await this.mainPageStart()

  let rawEvents = await page.evaluate(
    ({workerData}) => {
      return Array.from(
        document.querySelectorAll(".search-filter-results .timeline-article")
      )
        .map((baseEvent) => {

          const title = baseEvent.querySelector("h4")?.textContent ?? "";
          const res = {
            pageInfo: `<a class='page-info' href='${location.href}'>${workerData.family} main - ${title}</a>`,
            errors: [],          
            title
          }

          res.venueEventUrl = baseEvent.querySelector("a")?.href ?? "";
          
          const timelineInfoContainerEl = baseEvent.querySelector(
            ".timeline-info-container"
          );
          res.shortText = timelineInfoContainerEl?.querySelector("p")?.textContent ?? '';

          res.soldOut = !!(baseEvent.querySelector(".sold-out") ?? null)
          return res;
        });
    },
    {workerData}
  )
  
  rawEvents = rawEvents.map(this.isMusicEventCorruptedMapper);

  this.saveBaseEventlist(workerData.family, rawEvents)
  const thisWorkersEvents = rawEvents.filter((eventEl, index) => index % workerData.workerCount === workerData.index)
  return await this.mainPageEnd({
    stopFunctie, rawEvents: thisWorkersEvents}
  );
};
//#endregion                          MAIN PAGE

//#region [rgba(120, 0, 0, 0.3)]     SINGLE PAGE
dynamoScraper.singlePage = async function ({ page, event}) {
  
  const {stopFunctie} =  await this.singlePageStart()
  
  const pageInfo = await page.evaluate(
    ({ months, event}) => {
      const res = {
        pageInfo: `<a class='page-info' href='${location.href}'>${document.title}</a>`,
        errors: [],
      };
      const agendaDatesEls = document.querySelectorAll(".agenda-date");
      let baseDate = null;
      if (agendaDatesEls && agendaDatesEls.length < 2) {

        if (location.href.includes('effenaar')){
          res.corrupted = `Dynamo mixed venue with ${event.venueEventUrl}`
          return res;
        } 

        res.errors.push({remarks: `Te weinig 'agendaDataEls' ${res.pageInfo}`, 
          toDebug: {
            event,
            agendaDatesEls
          },})
        res.corrupted = `Te weinig 'agendaDataEls'`
      }
      try {
        const dateMatch = document
          .querySelector(".event-content")
          ?.textContent.toLowerCase()
          .match(/(\d+)\s+\/\s+(\w+)\s+\/\s+(\d+)/);
        if (Array.isArray(dateMatch) && dateMatch.length === 4) {
          baseDate = `${dateMatch[3]}-${months[dateMatch[2]]}-${
            dateMatch[1]
          }`;
        }
        if (!baseDate){throw Error('geen base date')}
      } catch (caughtError) {
        res.errors.push({
          error: caughtError,
          remarks: `datum match faal ${res.pageInfo}`, 
          toDebug:event
        });
        return res;
      }

      if (agendaDatesEls) {
        const agendaTimeContext = agendaDatesEls[0].textContent.toLowerCase();
        res.startTimeMatch = agendaTimeContext.match(
          /(aanvang\sshow|aanvang|start\sshow|show)\W?\s+(\d\d:\d\d)/
        );
        res.doorTimeMatch = agendaTimeContext.match(
          /(doors|deuren|zaal\sopen)\W?\s+(\d\d:\d\d)/
        );
        res.endTimeMatch = agendaTimeContext.match(
          /(end|eind|einde|curfew)\W?\s+(\d\d:\d\d)/
        );
      }

      try {
        if (
          Array.isArray(res.doorTimeMatch) &&
            res.doorTimeMatch.length === 3
        ) {
          res.door = new Date(
            `${baseDate}T${res.doorTimeMatch[2]}:00`
          ).toISOString();
        }
        if (
          Array.isArray(res.startTimeMatch) &&
            res.startTimeMatch.length === 3
        ) {
          res.start = new Date(
            `${baseDate}T${res.startTimeMatch[2]}:00`
          ).toISOString();
        } else if (res.door) {
          res.start = res.door;
          res.door = "";
        }
        if (
          Array.isArray(res.endTimeMatch) &&
            res.endTimeMatch.length === 3
        ) {
          res.end = new Date(
            `${baseDate}T${res.endTimeMatch[2]}:00`
          ).toISOString();
        }
      } catch (caughtError) {
        res.errors.push({
          error: caughtError,
          remarks: `tijd matches samen met tijden voegen ${res.pageInfo}`,
          toDebug: res,
        });
      }


      res.image =
        document
          .querySelector(".dynamic-background-color#intro .color-pick")
          ?.style.backgroundImage.match(/https.*.jpg|https.*.jpeg|https.*.png|https.*.webp/)
          ?.at(0)
          .replace("-500x500x", "") ?? "";
      if (!res.image){
        res.errors.push({
          remarks: `image missing ${res.pageInfo}`
        })
      }


      return res;
    },
    { months: this.months, event }
  );

  const priceRes = await this.getPriceFromHTML({page, event, pageInfo, selectors: ['.agenda-date'], });
  pageInfo.errors = pageInfo.errors.concat(priceRes.errors);
  pageInfo.price = priceRes.price;  

  try {
    const longTextRes = await longTextSocialsIframes(page)
    for (let i in longTextRes){
      pageInfo[i] = longTextRes[i]
    }    
  } catch (longTextHTMLErr) {
    pageInfo.errors.push({
      error: longTextHTMLErr,
      remarks: `longText ${pageInfo.pageInfo}`
    })
  }

  return await this.singlePageEnd({pageInfo, stopFunctie, page, event})
  
};
//#endregion                         SINGLE PAGE

// #region [rgba(60, 0, 0, 0.5)]     LONG HTML
async function longTextSocialsIframes(page){

  return await page.evaluate(()=>{
    const res = {}

    const textSelector = '.article-block.text-block';
    const mediaSelector = [`.sidebar iframe, .article-block iframe` 
    ].join(', ');
    const removeEmptyHTMLFrom = textSelector
    const socialSelector = [
      ".event-content .fb-event a",
      ".article-block a[href*='facebook']",
      ".article-block a[href*='instagram']"
    ].join(', ');
    const removeSelectors = [
      "[class*='icon-']",
      "[class*='fa-']",
      ".fa",
      ".iframe-wrapper-tijdelijk",
      ".article-block a[href*='facebook']",
      ".article-block a[href*='instagram']",
      `${textSelector} img`
    ].join(', ')

    const attributesToRemove = ['style', 'hidden', '_target', "frameborder", 'onclick', 'aria-hidden', 'allow', 'allowfullscreen', 'data-deferlazy','width', 'height'];
    const attributesToRemoveSecondRound = ['class', 'id' ];
    const removeHTMLWithStrings = [];

    //custom dynamo
    document.querySelectorAll('.article-block iframe').forEach(
      iframe=> iframe.parentNode.classList.add('iframe-wrapper-tijdelijk')
    )
    //end custom dynamo

    // eerst onzin attributes wegslopen
    const socAttrRemSelAdd = `${socialSelector ? `, ${socialSelector} *` : ''}`
    document.querySelectorAll(`${textSelector} *${socAttrRemSelAdd}, iframe`)
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

        if (bron.hasAttribute('data-src-cmplz')){
          bron.src = bron.getAttribute('data-src-cmplz')
        }
        const src = bron?.src ? bron.src : '';
        if (bron.hasAttribute('data-cmplz-target')) bron.removeAttribute('data-cmplz-target')
        if (bron.hasAttribute('data-src-cmplz')) bron.removeAttribute('data-src-cmplz')
        if (bron.hasAttribute('loading')) bron.removeAttribute('loading')
        bron.className = ''
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
        el.className = ''
        el.target = '_blank';
        return el.outerHTML
      })

    // stript HTML tbv text
    removeSelectors.length && document.querySelectorAll(removeSelectors)
      .forEach(toRemove => toRemove.parentNode.removeChild(toRemove))

    // dynamo custom
    const textBlokken = Array.from(document.querySelectorAll('.article-block.text-block'));
    if (textBlokken.length){
      const laatsteBlok = textBlokken[textBlokken.length - 1];
      if (laatsteBlok.textContent.includes('voorverkoop') 
      || laatsteBlok.textContent.includes('sale')
      || laatsteBlok.querySelector('h6')?.textContent.toLowerCase().includes('info')){
        laatsteBlok.parentNode.removeChild(laatsteBlok)
      }
    }
    // eind dynamo custom

    // verwijder ongewenste paragrafen over bv restaurants
    Array.from(document.querySelectorAll(`${textSelector} p, ${textSelector} span, ${textSelector} a`))
      .forEach(verwijder => {
        const heeftEvilString = !!removeHTMLWithStrings.find(evilString => verwijder?.textContent.includes(evilString))
        if (heeftEvilString) {
          verwijder.parentNode.removeChild(verwijder)
        }
      });

    // lege HTML eruit cq HTML zonder tekst of getallen
    document.querySelectorAll(`${removeEmptyHTMLFrom} > *`)
      .forEach(checkForEmpty => {
        const leegMatch = checkForEmpty.innerHTML.replace('&nbsp;','').match(/[\w\d]/g);
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


    return res;
  })
  
}
// #endregion                        LONG HTML