/* global document */
import { workerData } from 'worker_threads';
import axios from 'axios';
import AbstractScraper from './gedeeld/abstract-scraper.js';
import longTextSocialsIframes from './longtext/boerderij.js';

// #region [rgba(0, 60, 0, 0.1)]       SCRAPER CONFIG
const boerderijScraper = new AbstractScraper({
  workerData: { ...workerData },

  mainPage: {
    timeout: 30005,
    url: `https://poppodiumboerderij.nl/includes/ajax/events.php?filters=6,7,8&search=&limit=15&offset=${
      workerData.index * 15
    }&lang_id=1&rooms=&month=&year=`,
  },
  singlePage: {
    timeout: 20006,
  },
  app: {
    mainPage: {
      useCustomScraper: true,

      requiredProperties: ['venueEventUrl', 'title'],
    },
    singlePage: {
      requiredProperties: ['venueEventUrl', 'title', 'price', 'start'],
    },
  },
});
// #endregion                          SCRAPER CONFIG

boerderijScraper.listenToMasterThread();

// #region [rgba(0, 120, 0, 0.1)]      MAIN PAGE EVENT CHECK
boerderijScraper.mainPageAsyncCheck = async function (event) {
  const workingTitle = this.cleanupEventTitle(event.title);

  const isRefused = await this.rockRefuseListCheck(event, workingTitle);
  if (isRefused.success) {
    isRefused.success = false;
    return isRefused;
  }

  const isAllowed = await this.rockAllowListCheck(event, workingTitle);
  if (isAllowed.success) return isAllowed;

  const hasForbiddenTerms = await this.hasForbiddenTerms(event, ['title']);
  if (hasForbiddenTerms.success) {
    this.saveRefusedTitle(workingTitle);
    hasForbiddenTerms.success = false;
    return hasForbiddenTerms;
  }

  this.saveAllowedTitle(workingTitle);

  return {
    workingTitle,
    reason: [isRefused.reason, isAllowed.reason, hasForbiddenTerms.reason].join(';'),
    event,
    success: true,
  };
};
// #endregion                          MAIN PAGE EVENT CHECK

// #region [rgba(0, 180, 0, 0.1)]      SINGLE PAGE EVENT CHECK
// #endregion                          SINGLE PAGE EVENT CHECK

// #region [rgba(0, 240, 0, 0.1)]      MAIN PAGE
boerderijScraper.mainPage = async function () {
  const availableBaseEvents = await this.checkBaseEventAvailable(workerData.family);
  if (availableBaseEvents) {
    const thisWorkersEvents = availableBaseEvents.filter(
      (eventEl, index) => index % workerData.workerCount === workerData.index,
    );
    return await this.mainPageEnd({ stopFunctie: null, rawEvents: thisWorkersEvents });
  }

  const { stopFunctie } = await this.mainPageStart();

  let rawEvents = await axios.get(this._s.mainPage.url).then((response) => response.data);

  if (rawEvents.length) {
    rawEvents = rawEvents
      .map((event) => {
        event.venueEventUrl = `https://poppodiumboerderij.nl/programma/${event.seo_slug}`;
        event.shortText = event.subtitle;
        event.title += `&id=${event.id}`;
        return event;
      })
      .map(this.isMusicEventCorruptedMapper);
  }

  this.saveBaseEventlist(workerData.family, rawEvents);
  const thisWorkersEvents = rawEvents.filter(
    (eventEl, index) => index % workerData.workerCount === workerData.index,
  );
  return await this.mainPageEnd({ stopFunctie, rawEvents: thisWorkersEvents });
};
// #endregion                          MAIN PAGE

// #region [rgba(120, 0, 0, 0.1)]     SINGLE PAGE
boerderijScraper.singlePage = async function ({ event, page }) {
  const { stopFunctie } = await this.singlePageStart();

  const [realEventTitle, realEventId] = event.title.split('&id=');
  event.title = realEventTitle;

  const res = {
    pageInfo: `<a class='page-info' href='${this._s.mainPage.url}'>${event.title}</a>`,
    errors: [],
  };

  const url = `https://poppodiumboerderij.nl/includes/ajax.inc.php?id=${realEventId}&action=getEvent&lang_id=1`;
  const ajaxRes = await axios
    .get(url)
    .then((response) => response.data)
    .catch((caughtError) => {
      res.errors.push({
        error: caughtError,
        remarks: `ajax ${url} faal ${res.pageInfo}`,
        errorLevel: 'close-thread',
        toDebug: event,
      });
    });

  if (!ajaxRes) {
    res.corrupted += `ajax verzoek faalt naar ${url}`;
    return await this.singlePageEnd({ res, stopFunctie });
  }

  const imageRes = await this.getImage({
    page,
    event,
    res,
    selectors: ['.event-image'],
    mode: 'image-src',
  });
  res.errors = res.errors.concat(imageRes.errors);
  res.image = imageRes.image;

  res.boerderijID = ajaxRes.id;
  const priceRes = await this.boerderijCustomPrice(
    `${ajaxRes?.entrance_price ?? ''} ${ajaxRes?.ticket_price ?? ''}`,
    res.pageInfo,
    res.title,
  );
  res.errors = res.errors.concat(priceRes.errors);
  res.price = priceRes.price;

  try {
    res.start = `${ajaxRes.event_date}T${ajaxRes.event_start}:00`;
  } catch (catchedError) {
    res.errors.push({
      error: catchedError,
      remarks: `start samenvoeging ${res.pageInfo}`,
      toDebug: res,
    });
  }
  try {
    res.door = `${ajaxRes.event_date}T${ajaxRes.event_open}:00`;
  } catch (catchedError) {
    res.errors.push({
      error: catchedError,
      remarks: `door samenvoeging ${res.pageInfo}`,
      toDebug: res,
    });
  }

  const { mediaForHTML, socialsForHTML, textForHTML } = await longTextSocialsIframes(
    page,
    event,
    res,
  );
  res.mediaForHTML = mediaForHTML;
  res.socialsForHTML = socialsForHTML;
  res.textForHTML = textForHTML;

  res.soldOut = ajaxRes?.label?.title?.toLowerCase().includes('uitverkocht') ?? null;

  return await this.singlePageEnd({ pageInfo: res, stopFunctie });
};
// #endregion                         SINGLE PAGE

boerderijScraper.boerderijCustomPrice = async function (testText, pi, title) {
  const priceRes = {
    price: null,
    errors: [],
  };
  if (!testText) {
    priceRes.errors.push({
      remarks: 'geen testText',
    });
    return priceRes;
  }

  if (testText.match(/start/i)) {
    priceRes.price = null;
    this.debugPrice &&
      this.dirtyDebug({
        title,
        price: priceRes.price,
        type: 'NOG ONBEKEND',
      });
    return priceRes;
  }

  if (testText.match(/gratis|free/i)) {
    priceRes.price = 0;
    this.debugPrice &&
      this.dirtyDebug({
        title,
        price: priceRes.price,
        type: 'GRATIS',
      });
    return priceRes;
  }

  if (testText.match(/uitverkocht|sold\sout/i)) {
    priceRes.price = null;
    this.debugPrice &&
      this.dirtyDebug({
        title,
        price: priceRes.price,
        type: 'UITVERKOCHT',
      });
    return priceRes;
  }

  const priceMatch = testText
    .replaceAll(/[\s\r\t ]/g, '')
    .match(/(?<euros>\d+)(?<scheiding>[,.]?)(?<centen>\d\d|-)/);

  const priceMatchEuros = testText.replaceAll(/[\s\r\t ]/g, '').match(/\d+/);

  if (!Array.isArray(priceMatch) && !Array.isArray(priceMatchEuros)) {
    priceRes.errors.push({
      remarks: `geen match met ${pi}`,
    });
    return priceRes;
  }

  if (!Array.isArray(priceMatch) && Array.isArray(priceMatchEuros)) {
    priceRes.price = Number(priceMatchEuros[0]);
    this.checkIsNumber(priceRes, pi);
    this.debugPrice &&
      this.dirtyDebug({
        title,
        price: priceRes.price,
      });
    return priceRes;
  }

  if (priceMatch.groups?.centen && priceMatch.groups?.centen.includes('-')) {
    priceMatch.groups.centen = '00';
  }

  try {
    if (priceMatch.groups.scheiding) {
      if (priceMatch.groups.euros && priceMatch.groups.centen) {
        priceRes.price =
          (Number(priceMatch.groups.euros) * 100 + Number(priceMatch.groups.centen)) / 100;
      }
      if (priceMatch.groups.euros) {
        priceRes.price = Number(priceMatch.groups.euros);
      }
    } else {
      priceRes.price = Number(priceMatch.groups.euros);
    }
    this.checkIsNumber(priceRes, pi);
    this.debugPrice &&
      this.dirtyDebug({
        title,
        price: priceRes.price,
      });
    return priceRes;
  } catch (priceCalcErr) {
    priceRes.push({
      error: priceCalcErr,
      remarks: `price calc err ${pi}`,
      toDebug: { testText, priceMatch, priceRes },
    });
    return priceRes;
  }
};