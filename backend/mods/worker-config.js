import EventsList from "./events-list.js";
import { getShellArguments } from "./tools.js";
import fsDirections from "./fs-directions.js";

export const AbstractWorkerConfig = {
  
  CPUReq : 'normal',
  workerConcurrent : 2,
  index : null,
  path : null,
  name : null,
  family : null,
  workerCount : null,
  scraper : true, //TODO word dit gebruikt
}

export const workerConfig = {
  //"013" : {workerCount: 4 },
  // afaslive :{
  //   workerCount: 2,
  //   CPUReq: "high",
  //   workerConcurrent: 1,
  // },
  // baroeg: {workerCount: 4, workerConcurrent: 2 },
  //bibelot: { workerCount: 1 },
  //boerderij:{ workerCount: 1, CPUReq: "low" },
  //cpunt: { workerCount: 1 },
  // dbs: { workerCount: 4, workerConcurrent: 1 },
  // deflux: { workerCount: 1 },
  // dehelling :{ workerCount: 1, CPUReq: 'low' },
  // depul: { workerCount: 2 },
  // doornroosje :{ workerCount: 2, workerConcurrent: 1 },
  // dynamo: { workerCount: 2 },
  // effenaar:{ workerCount: 4 },
  // gebrdenobel: { workerCount: 1 },
  // groeneengel: { workerCount: 1 },
  //  iduna: { workerCount: 1 },
  // kavka :{
  //   workerCount: 1,
  //   workerConcurrent: 1,
  // },
  // melkweg :{
  //   workerCount: 4,
  //   CPUReq: "low",
  // },
  //metalfan: {workerCount: 1, CPUReq: "low" },
  // metropool :{ workerCount: 2 },
  // neushoorn: { workerCount: 2 },
  // occii :{
  //   workerCount: 2,
  //   workerConcurrent: 1,
  //   CPUReq: "high",
  // },
  //oosterpoort: { workerCount: 3, workerConcurrent: 3 },
  // p60 :{ workerCount: 1},  
  // paradiso: { workerCount: 6, workerConcurrent: 2 },
  // patronaat: { workerCount: 3, workerConcurrent: 3 },
  // tivolivredenburg:{ workerCount: 4 },
  ticketmaster :{
    workerCount: 5,CPUReq: 'high', workerConcurrent: 1
  },  
  // volt: { workerCount: 1 },
}


export const workerNames = Object.keys(workerConfig);

class WorkerListConf {
  data = []
  shellArguments = null
  static _self = null;
  constructor(){
    if (WorkerListConf._self instanceof WorkerListConf){
      return WorkerListConf._self;
    } else {
      this._self = this;
      this.shellArguments = getShellArguments(); 
      this.run();
    }
  }
  listCopy(){
    return [...this.data];
  }
  create (config){

    const forceArg = this.shellArguments?.force ?? "";
    const forced = forceArg.includes(config.family) || forceArg.includes("all");
    if (!EventsList.isOld(config.family, forced)) {
      return false;
    }

    const mergedConfig = {
      ...AbstractWorkerConfig,
      ...config
    }
    mergedConfig.path = fsDirections.scrapers[config.family];

    for (let i = 0; i < config.workerCount; i++){
      mergedConfig.index = i;
      mergedConfig.name = `${config.family}-${i}`;
      this.data.push({
        ...mergedConfig
      })
    }
  }
  get numberOfWorkers(){
    return this.data.length;
  }
  shuffleArray() {
    let currentIndex = this.numberOfWorkers, randomIndex;
    while (currentIndex != 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [this.data[currentIndex], this.data[randomIndex]] = [
        this.data[randomIndex], this.data[currentIndex]];
    }
    return this.data;
  }
  run(){

    Object.entries(workerConfig).forEach(([familyName, values]) => {
      this.create({family: familyName, ...values})
    });

    this.shuffleArray();
  }
  get hasWorkerConfigs(){
    return this.numberOfWorkers > 0
  }
  firstOneLast(thisConfig){
    this.data.push(thisConfig)
  }
  get(){
    const next = this.data.shift();
    return next;
  }
  backIntoLine(completeConfig){
    this.data.push(completeConfig)
  }
}

export default function getWorkerConfig(){
  return new WorkerListConf();
}