import fs from 'fs';

export class Location {
  constructor(config) {
    this.name = config.name;
    this.city = config.city;
  }

  static makeLocationSlug(rawName) {
    if (rawName === '013') {
      return '013';
    }
    return rawName.replace(/\s/g, '-').replace(/\W/g, '').toLowerCase();
  }
}

export function printLocationsToPublic() {
  fs.writeFile(
    '../public/locations.json',
    JSON.stringify(locations),
    'utf-8',
    () => { },
  );
}

const locations = {
  ab: new Location({
    name: 'Ab',
    city: 'Brussel',
  }),
  afaslive: new Location({ name: 'Afas Live', city: 'Amsterdam' }),
  ahoy: new Location({ name: 'Ahoy', city: 'Rotterdam' }),
  amphitheater: new Location({ name: 'Amphitheater', city: 'Gelsenkirchen' }),
  anciennebelgique: new Location({
    name: 'Ancienne Belgique',
    city: 'Brussel',
  }),
  annakerk: new Location({ name: 'Annakerk', city: 'Amstelveen' }),
  baroeg: new Location({ name: 'Baroeg', city: 'Rotterdam' }),
  bastardclub: new Location({ name: 'Bastardclub', city: 'Osnabrueck' }),
  bibelot: new Location({ name: 'Bibelot', city: 'Dordrecht' }),
  biebob: new Location({ name: 'Biebob', city: 'Vosselaar' }),
  boerderij: new Location({ name: 'Boerderij', city: 'Zoetemeer' }),
  bolwerk: new Location({ name: 'Bolwerk', city: 'Sneek' }),
  debosuil:  new Location({ name: 'De Bosuil', city: 'Weert' }),
  botanique: new Location({ name: 'Botanique', city: 'Brussel' }),
  brabanthallen: new Location({ name: 'Brabanthallen', city: 'Den Bosch' }),
  cacaofabriek: new Location({ name: 'Cacaofabriek', city: 'Helmond' }),
  carlswerkvictoria: new Location({
    name: 'Carlswerk Victoria',
    city: 'Keulen',
  }),
  dbs: new Location({ name: 'dBs', city: 'Utrecht' }),
  dedreef: new Location({ name: 'De Dreef', city: 'Vorselaar' }),
  dehelling: new Location({ name: 'De Helling', city: 'Utrecht' }),
  deklinker: new Location({ name: 'De Klinker', city: 'Winschoten' }),
  delangemunte: new Location({ name: 'De Lange Munte', city: 'Kortrijk' }),
  depeppel: new Location({ name: 'De Peppel', city: 'Zeist' }),
  depul: new Location({ name: 'De Pul', city: 'Uden' }),
  deflux: new Location({ name: 'De Flux', city: 'Zaandam' }),
  deverlichtegeest: new Location({
    name: 'De Verlichte Geest',
    city: 'Roeselare',
  }),
  doornroosje: new Location({ name: 'Doornroosje', city: 'Nijmegen' }),
  dvgclub: new Location({ name: 'De Verlichte Geest', city: 'Kortrijk' }),
  dynamo: new Location({ name: 'Dynamo', city: 'Eindhoven' }),
  cpunt: new Location({ name: 'Cpunt', city: 'Hoofddorp' }),
  effenaar: new Location({ name: 'Effenaar', city: 'Eindhoven' }),
  entrepot: new Location({ name: 'Entrepot', city: 'Eindhoven' }),
  eilandbuitenvest: new Location({ name: 'Eiland buiten vest', city: 'Hulst' }),
  essigfabrik: new Location({ name: 'Essigfabrik', city: 'Keulen' }),
  feesttentpesse: new Location({ name: 'Feesttent', city: 'Pesse' }),
  foxfarm: new Location({ name: 'Foxfarm', city: 'Tilburg' }),
  gebouwt: new Location({ name: 'Gebouw T', city: 'Bergen op Zoom' }),
  gebrdenobel: new Location({ name: 'Gebr. De Nobel', city: 'Leiden' }),
  gelredome: new Location({ name: 'Gelredome', city: 'Arnhem' }),
  goffertpark: new Location({ name: 'Goffertpark', city: 'Nijmegen' }),
  groeneengel: new Location({ name: 'Groene Engel', city: 'Oss' }),
  groeneheuvels: new Location({ name: 'Groene Heuvels', city: 'Beuningen' }),
  grotekerk: new Location({ name: 'Grote Kerk', city: 'Zwolle' }),
  hal015: new Location({ name: 'Hal 015', city: 'Delft' }),
  halloffame: new Location({ name: 'Hall of fame', city: 'Tilburg' }),
  hedon: new Location({ name: 'Hedon', city: 'Zwolle' }),
  helios37: new Location({ name: 'Helios37', city: 'Keulen' }),
  hell: new Location({ name: 'Hell', city: 'Diest' }),
  hetdepot: new Location({ name: 'Het Depot', city: 'Leuven' }),
  iduna: new Location({ name: 'iduna', city: 'Drachten' }),
  innocent: new Location({ name: 'Innocent', city: 'Hengelo' }),
  johancruijffarena: new Location({ name: 'Johan Cruijff Arena', city: 'Amsterdam' }),
  ijssportcentrum: new Location({ name: 'Ijssportcentrum', city: 'Eindhoven' }),
  kantine: new Location({ name: 'Kantine', city: 'Keulen' }),
  kavka: new Location({ name: 'Kavka', city: 'Antwerpen' }),
  klokgebouw: new Location({ name: 'Klokgebouw', city: 'Eindhoven' }),
  koningboudewijnstadion: new Location({ name: 'Koning Boudewijn Stadion', city: 'Brussel' }),
  kulttempel: new Location({ name: 'Kulttempel', city: 'Oberhausen' }),
  langemunte: new Location({ name: 'Lange munte', city: 'Kortrijk' }),
  littledevil: new Location({ name: 'Littledevil', city: 'Tilburg' }),
  liveinhoorn: new Location({ name: 'Live in Hoorn', city: 'Hoorn' }),
  lottoarena: new Location({ name: 'Lotto Arena', city: 'Antwerpen' }),
  luxorlive: new Location({ name: 'Luxor Live', city: 'Arnhem' }),
  maassilo: new Location({ name: 'Maassilo', city: 'Rotterdam' }),
  mainstage: new Location({ name: 'Mainstage', city: 'Den Bosch' }),
  megaland: new Location({ name: 'Megaland', city: 'Landgraad' }),
  melkweg: new Location({ name: 'Melkweg', city: 'Amsterdam' }),
  merleyn: new Location({ name: 'Merleyn', city: 'Nijmegen' }),
  mezz: new Location({ name: 'Mezz', city: 'Breda' }),
  metropool: new Location({ name: 'Metropool', city: 'Hengelo' }),
  mfc: new Location({ name: 'Metal Front Coevorden', city: 'Coevorden' }),
  musicon: new Location({ name: 'Musicon', city: 'Den Haag' }),
  muziekgieterij: new Location({ name: 'Muziekgieterij', city: 'Maastricht' }),

  nederlanddrie: new Location({ name: 'Nederland drie', city: 'Wateringen' }),
  neushoorn: new Location({ name: 'Neushoorn', city: 'Leeuwarden' }),
  noorderkerk: new Location({ name: 'Noorderkerk', city: 'Sneek' }),
  nieuwenor: new Location({ name: 'Nieuwe Nor', city: 'Heerlen' }),
  '013': new Location({ name: '013', city: 'Tilburg' }),
  occii: new Location({ name: 'Occii', city: 'Amsterdam' }),
  oefenbunker: new Location({ name: 'Oefenbunker', city: 'Landgraaf' }),
  oldehoofsterkerkhof: new Location({
    name: 'Oldehoofsterkerkhof',
    city: 'Leeuwarden',
  }),
  oosterpoort: new Location({
    name: 'Oosterpoort',
    city: 'Groningen',
  }),
  openluchttheatercaprera: new Location({ name: 'Openlucht theater Caprera', city: 'Haarlem' }),
  orangerie: new Location({ name: 'Orangerie', city: 'Den Bosch' }),
  paleis12: new Location({ name: 'Paleis12', city: 'Brussel' }),
  palladium: new Location({ name: 'Palladium', city: 'Keulen' }),
  paradiso: new Location({ name: 'Paradiso', city: 'Amsterdam' }),
  paterskerk: new Location({ name: 'Paterskerk', city: 'Eindhoven' }),
  patronaat: new Location({ name: 'Patronaat', city: 'Haarlem' }),
  p60: new Location({ name: 'P60', city: 'Amstelveen' }),
  qfactory: new Location({ name: 'Qfactory', city: 'Amsterdam' }),
  ragnarok: new Location({ name: 'Ragnarok', city: 'Bree' }),
  redbox: new Location({ name: 'Redbox', city: 'Moenchengladbach' }),
  resonanzwerk: new Location({ name: 'Resonanzwerk', city: 'Oberhausen' }),
  rtmstage: new Location({ name: 'RTM Stage', city: 'Rotterdam' }),
  rotown: new Location({ name: 'Rotown', city: 'Rotterdam' }),
  simplon: new Location({ name: 'Simplon', city: 'Groningen' }),
  sintannazaal: new Location({ name: 'Sint Anna zaal', city: 'Aalst' }),
  spiritof66: new Location({ name: 'Spirit of 66', city: 'Verviers' }),
  stadspark: new Location({ name: 'Stadspark', city: 'Groningen' }),
  sportpaleis: new Location({ name: 'Sportpaleis', city: 'Antwerpen' }),
  spotdeoosterpoort: new Location({ name: 'Spot de Oostpoort', city: 'Antwerpen' }),
  stevenskerk: new Location({ name: 'Stevenskerk', city: 'Nijmegen' }),
  stroomhuis: new Location({ name: 'Stroomhuis', city: 'Eindhoven' }),
  dinkel: new Location({ name: 'Summer Breeze', city: 'Beieren' }),
  tivolivredenburg: new Location({
    name: 'Tivoli Vredenburg',
    city: 'Utrecht',
  }),
  tolhuistuin: new Location({ name: 'Tolhuistuin', city: 'Amsterdam' }),
  trix: new Location({ name: 'Trix', city: 'Antwerpen' }),
  turbinenhalle: new Location({ name: 'Turbinenhalle', city: 'Oberhausen' }),
  turock: new Location({ name: 'Turock', city: 'Essen' }),
  vera: new Location({ name: 'Vera', city: 'Groningen' }),
  victorie: new Location({ name: 'Victorie', city: 'Alkmaar' }),
  v11: new Location({ name: 'V11', city: 'Rotterdam' }),
  volt: new Location({ name: 'Volt', city: 'Sittard' }),

  vorstnationaal: new Location({ name: 'Vorst Nationaal', city: 'Brussel' }),
  weertnoord: new Location({ name: 'Weert Noord', city: 'Weert' }),
  wacken: new Location({
    name: 'Wacken Open Air',
    city: 'Duitsland',
  }),
  wieleman: new Location({ name: 'Wieleman', city: 'Westervoort' }),
  willemeen: new Location({ name: 'Willemeen', city: 'Arnhem' }),
  willemtwee: new Location({ name: 'Willemtwee', city: 'Den Bosch' }),
  zappa: new Location({ name: 'Zappa', city: 'Antwerpen' }),
  ziggodome: new Location({ name: 'Ziggodome', city: 'Amsterdam' }),
  zuiderpark: new Location({ name: 'Zuiderpark', city: 'Den Haag' }),
  zag: new Location({ name: 'Zag Arena', city: 'Hannover' }),
};
export default locations;
