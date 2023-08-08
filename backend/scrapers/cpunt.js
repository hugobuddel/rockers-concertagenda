import { workerData } from 'worker_threads';
import * as _t from '../mods/tools.js';
import AbstractScraper from './gedeeld/abstract-scraper.js';
import makeScraperConfig from './gedeeld/scraper-config.js';

// #region [rgba(0, 60, 0, 0.1)]       SCRAPER CONFIG
const cpuntScraper = new AbstractScraper(makeScraperConfig({
  workerData: { ...workerData },

  puppeteerConfig: {
    mainPage: {
      timeout: 20014,
      waitUntil: 'load',
    },
    singlePage: {
      timeout: 20012,
    },
    app: {
      mainPage: {
        url: 'https://www.cpunt.nl/agenda?q=&genre=metalpunkheavy&StartDate=&EndDate=#filter',
        requiredProperties: ['venueEventUrl', 'title'],
      },
      singlePage: {
        requiredProperties: ['venueEventUrl', 'title', 'price', 'start'],
      },
    },
  },
}));
// #endregion                          SCRAPER CONFIG

cpuntScraper.listenToMasterThread();

// #region [rgba(0, 120, 0, 0.1)]      MAIN PAGE EVENT CHECK
cpuntScraper.mainPageAsyncCheck = async function (event) {
  const workingTitle = this.cleanupEventTitle(event.title);

  const isRefused = await this.rockRefuseListCheck(event, workingTitle);
  if (isRefused.success) {
    isRefused.success = false;
    return isRefused;
  }

  const isAllowed = await this.rockAllowListCheck(event, workingTitle);
  if (isAllowed.success) return isAllowed;

  const goodTermsRes = await this.hasGoodTerms(event);
  if (goodTermsRes.success) {
    this.saveAllowedTitle(workingTitle);
    return goodTermsRes;
  }

  const hasForbiddenTerms = await this.hasForbiddenTerms(event);
  if (hasForbiddenTerms.success) {
    this.saveRefusedTitle(workingTitle);
    hasForbiddenTerms.success = false;
    return hasForbiddenTerms;
  }

  this.saveAllowedTitle(workingTitle);

  return {
    workingTitle,
    event,
    success: true,
    reason: [isRefused.reason, isAllowed.reason, hasForbiddenTerms.reason].join(';'),
  };
};
// #endregion                          MAIN PAGE EVENT CHECK

// #region [rgba(0, 180, 0, 0.1)]      SINGLE PAGE EVENT CHECK
// #endregion                          SINGLE PAGE EVENT CHECK

// #region [rgba(0, 240, 0, 0.1)]      MAIN PAGE
cpuntScraper.mainPage = async function () {
  const availableBaseEvents = await this.checkBaseEventAvailable(workerData.family);
  if (availableBaseEvents) {
    const thisWorkersEvents = availableBaseEvents.filter((eventEl, index) => index % workerData.workerCount === workerData.index);
    return await this.mainPageEnd({ stopFunctie: null, rawEvents: thisWorkersEvents });
  }

  const { stopFunctie, page } = await this.mainPageStart();

  if (!await page.waitForSelector('#filter .article-wrapper', {
    timeout: 2000,
  }).catch((caughtError) => {
    _t.handleError(caughtError, workerData, 'Timeout wachten op #filter .article-wrapper Main page', 'close-thread', null);
  })) {
    return await this.mainPageEnd({ stopFunctie, page, rawEvents: [] });
  }

  await _t.waitTime(50);

  let rawEvents = await page.evaluate(
    ({ workerData, unavailabiltyTerms }) => Array.from(
      document.querySelectorAll('#filter .article-wrapper'),
    ).map((rawEvent) => {
      const title =          rawEvent.querySelector('.article-title')?.textContent ?? null;
      const res = {
        pageInfo: `<a class='page-info' href='${location.href}'>${workerData.family} - main - ${title}</a>`,
        errors: [],
      };

      res.title = title;
      const anchor = rawEvent.querySelector('.absolute-link') ?? null;
      res.venueEventUrl = anchor?.href ?? null;

      const parpar = rawEvent.parentNode.parentNode;
      res.startDate = parpar.hasAttribute('data-last-date') ? parpar.getAttribute('data-last-date').split('-').reverse().join('-') : null;
      const artInfoText = rawEvent.querySelector('.article-info')?.textContent.toLowerCase() ?? '';
      const uaRex = new RegExp(unavailabiltyTerms.join('|'), 'gi');
      res.unavailable = !!rawEvent.textContent.match(uaRex);
      res.soldOut = !!artInfoText.match(/wachtlijst|uitverkocht/i);
      res.shortText = '';
      return res;
    }),
    { workerData, unavailabiltyTerms: AbstractScraper.unavailabiltyTerms },
  );
  rawEvents = rawEvents.map(this.isMusicEventCorruptedMapper);

  this.saveBaseEventlist(workerData.family, rawEvents);
  const thisWorkersEvents = rawEvents.filter((eventEl, index) => index % workerData.workerCount === workerData.index);
  return await this.mainPageEnd({ stopFunctie, rawEvents: thisWorkersEvents });
};
// #endregion                          MAIN PAGE

// #region [rgba(120, 0, 0, 0.1)]     SINGLE PAGE
cpuntScraper.singlePage = async function ({ page, event }) {
  const { stopFunctie } =  await this.singlePageStart();

  if (!await page.waitForSelector('#main .content-blocks', {
    timeout: 7500,
  }).catch((caughtError) => {
    _t.handleError(caughtError, workerData, `Timeout wachten op #main .content-blocks ${event.title}`, 'close-thread', event);
  })) {
    return await this.singlePageEnd({
      pageInfo, stopFunctie, page, event,
    });
  }

  const pageInfo = await page.evaluate(({ months, event }) => {
    const contentSections = Array.from(document.querySelectorAll('.content-blocks section'));
    let indexOfTicketSection = 0;
    contentSections.forEach((section, sectionIndex) => {
      if (section.className.includes('Tickets')) {
        indexOfTicketSection = sectionIndex;
      }
    });
    const textSection = contentSections[indexOfTicketSection - 1];
    const ticketSection = contentSections[indexOfTicketSection];

    const res = {
      pageInfo: `<a class='page-info' href='${location.href}'>${document.title}</a>`,
      errors: [],
    };

    const [, shortDay, monthName, year] = ticketSection.querySelector('.article-date')?.textContent.match(/(\d+)\s+(\w+)\s+(\d\d\d\d)/) ?? [null, null, null, null];
    const day = shortDay.padStart(2, '0');
    const month = months[monthName.toLowerCase()];
    const startDate = `${year}-${month}-${day}`;

    let deurTijd; let
      startTijd;
    const tijdMatches = document.querySelector('.article-bottom .article-times')?.innerHTML.match(/(\d\d[:.]\d\d)/).map((strings) => strings.replace('.', ':')) ?? null;

    res.tijdMatches = tijdMatches;
    if (Array.isArray(tijdMatches) && tijdMatches.length) {
      if (tijdMatches.length >= 2) {
        startTijd = `${tijdMatches[1]}:00`;
        deurTijd = `${tijdMatches[0]}:00`;
      } else {
        startTijd = `${tijdMatches[0]}:00`;
      }
    } else {
      res.errors.push({
        remarks: 'geen startTijdMatch res.',
        toDebug: {
          html: document.querySelector('.article-bottom .article-times')?.innerHTML,
          match: tijdMatches,
        },
      });
    }

    if (deurTijd) {
      try {
        res.door = `${startDate}T${deurTijd}`;
      } catch (caughtError) {
        res.errors.push(
          {
            error: caughtError,
            remarks: `deurtijd door date error ${event.title} ${startDate}`,
            toDebug:
          {
            timeTried: `${startDate}T${deurTijd}`,
            event,
          },
          },
        );
      }
    }

    if (startTijd) {
      try {
        res.start = `${startDate}T${startTijd}`;
      } catch (caughtError) {
        res.errors.push(
          {
            error: caughtError,
            remarks: `starttijd door date error ${event.title} ${startDate}`,
            toDebug:
          {
            timeTried: `${startDate}T${startTijd}`,
            event,
          },
          },
        );
      }
    }

    return res;
  }, { months: this.months, event });

  const imageRes = await this.getImage({
    page, event, pageInfo, selectors: [".bg-image[style*='background']"], mode: 'background-src',
  });

  pageInfo.errors = pageInfo.errors.concat(imageRes.errors);
  pageInfo.image = imageRes.image;

  const priceRes = await this.getPriceFromHTML({
    page, event, pageInfo, selectors: ['.article-price'],
  });
  pageInfo.errors = pageInfo.errors.concat(priceRes.errors);
  pageInfo.price = priceRes.price;

  const longTextRes = await longTextSocialsIframes(page, event, pageInfo);
  for (const i in longTextRes) {
    pageInfo[i] = longTextRes[i];
  }

  return await this.singlePageEnd({
    pageInfo, stopFunctie, page, event,
  });
};
// #endregion                         SINGLE PAGE

// #region [rgba(60, 0, 0, 0.3)]     LONG HTML
async function longTextSocialsIframes(page, event, pageInfo) {
  return await page.evaluate(({ event }) => {
    const res = {};
    const mediaSelector = ['.contentblock-Video iframe',
    ].join(', ');
    const textSelector = '.contentblock-TextOneColumn .text';
    const removeEmptyHTMLFrom = textSelector;
    const socialSelector = [

    ].join(', ');
    const removeSelectors = [
      `${textSelector} [class*='icon-']`,
      `${textSelector} [class*='fa-']`,
      `${textSelector} .fa`,
      `${textSelector} script`,
      `${textSelector} noscript`,
      `${textSelector} style`,
      `${textSelector} meta`,
      `${textSelector} svg`,
      `${textSelector} form`,
      `${textSelector} img`,
    ].join(', ');

    const attributesToRemove = ['style', 'hidden', '_target', 'frameborder', 'onclick', 'aria-hidden'];
    const attributesToRemoveSecondRound = ['class', 'id'];
    const removeHTMLWithStrings = [];

    // eerst onzin attributes wegslopen
    const socAttrRemSelAdd = `${
      socialSelector.length ? `, ${socialSelector}` : ''
    }`;
    const mediaAttrRemSelAdd = `${
      mediaSelector.length ? `, ${mediaSelector} *, ${mediaSelector}` : ''
    }`;
    const textSocEnMedia = `${textSelector} *${socAttrRemSelAdd}${mediaAttrRemSelAdd}`;
    document
      .querySelectorAll(textSocEnMedia)
      .forEach((elToStrip) => {
        attributesToRemove.forEach((attr) => {
          if (elToStrip.hasAttribute(attr)) {
            elToStrip.removeAttribute(attr);
          }
        });
      });

    // media obj maken voordat HTML verdwijnt
    res.mediaForHTML = Array.from(document.querySelectorAll(mediaSelector))
      .map((bron) => {
        const src = bron?.src ? bron.src : '';
        return {
          outer: bron.outerHTML,
          src,
          id: null,
          type: src.includes('spotify')
            ? 'spotify'
            : src.includes('youtube')
              ? 'youtube'
              : 'bandcamp',
        };
      });

    // socials obj maken voordat HTML verdwijnt
    res.socialsForHTML = !socialSelector ? '' : Array.from(document.querySelectorAll(socialSelector))
      .map((el) => {
        el.querySelectorAll('i, svg, img').forEach((rm) => rm.parentNode.removeChild(rm));
        if (!el.textContent.trim().length) {
          if (el.href.includes('facebook') || el.href.includes('fb.me')) {
            if (el.href.includes('facebook.com/events')) {
              el.textContent = `FB event ${event.title}`;
            } else {
              el.textContent = 'Facebook';
            }
          } else if (el.href.includes('twitter')) {
            el.textContent = 'Tweet';
          } else if (el.href.includes('instagram')) {
            el.textContent = 'Insta';
          } else {
            el.textContent = 'Social';
          }
        }
        el.className = 'long-html__social-list-link';
        el.target = '_blank';
        return el.outerHTML;
      });

    // stript HTML tbv text
    removeSelectors.length && document.querySelectorAll(removeSelectors)
      .forEach((toRemove) => toRemove.parentNode.removeChild(toRemove));

    // verwijder ongewenste paragrafen over bv restaurants
    Array.from(document.querySelectorAll(`${textSelector} p, ${textSelector} span, ${textSelector} a`))
      .forEach((verwijder) => {
        const heeftEvilString = !!removeHTMLWithStrings.find((evilString) => verwijder.textContent.includes(evilString));
        if (heeftEvilString) {
          verwijder.parentNode.removeChild(verwijder);
        }
      });

    // lege HTML eruit cq HTML zonder tekst of getallen
    document.querySelectorAll(`${removeEmptyHTMLFrom} > *`)
      .forEach((checkForEmpty) => {
        const leegMatch = checkForEmpty.innerHTML.match(/[\w\d]/g);
        if (!Array.isArray(leegMatch)) {
          checkForEmpty.parentNode.removeChild(checkForEmpty);
        }
      });

    // laatste attributen eruit.
    document.querySelectorAll(textSocEnMedia)
      .forEach((elToStrip) => {
        attributesToRemoveSecondRound.forEach((attr) => {
          if (elToStrip.hasAttribute(attr)) {
            elToStrip.removeAttribute(attr);
          }
        });
      });

    // tekst.
    res.textForHTML = Array.from(document.querySelectorAll(textSelector))
      .map((el) => el.innerHTML)
      .join('');
    return res;
  }, { event });
}
// #endregion                        LONG HTML
