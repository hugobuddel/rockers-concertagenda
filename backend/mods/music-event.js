import EventsList from "./events-list.js";
import { handleError } from "./tools.js";

export default class MusicEvent {
  doorOpenDateTime = null;
  startDateTime = null;
  endDateTime = null;
  venueEventUrl = null;
  title = null;
  location = null;
  price = null;
  shortText = null;
  longText = null;
  image = null;
  constructor(init) {
    this.merge(init);
  }
  merge(conf) {
    for (let confKey in conf) {
      if (this.hasOwnProperty(confKey)) {
        this[confKey] = conf[confKey];
      }
    }
  }
  register() {
    EventsList.addEvent(this);
  }
  get isValid() {
    return (
      this.startDateTime &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(this.startDateTime)
    );
  }
  registerIfValid() {
    if (this.isValid) {
      this.register();
    } else {
      const err = new Error('invalid music event!')
      handleError(err, {
        name: 'inmusicevent',
        index: '1',
        family: 'oei'
      }, `
      
      title ${this.title}
      startDateTime ${this.startDateTime} 
      
      `)
    }
  }
}
