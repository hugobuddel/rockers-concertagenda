const unavailabilityTerms = [
  'uitgesteld',
  'verplaatst',
  'locatie gewijzigd',
  'besloten',
  'afgelast',
  'geannuleerd',
];

const forbiddenTerms = [
  'clubnacht',
  'VERBODENGENRE',
  'alternatieve rock',
  'dance,dance-alle-dance',
  'dance-punk',
  'global,pop',
  'funk-soul,pop',
  'americana',
  'americana',
  'countryrock',
  'dromerig',
  'workshop',
  'house',
  'fan event',
  'filmvertoning',
  'indie',
  'interactieve lezing',
  'karaoke',
  'london calling',
  'brass',
  'shoegaze',
  'art rock',
  'blaasrock',
  'dream pop',
  'Dream Punk',
  'uptempo',
  'experi-metal',
  'folkpunk',
  'jazz-core',
  'neofolk',
  'poetry',
  'pubquiz',
  'punk-hop',
  "quiz'm",
  'schaakinstuif',
  'afrobeats',
  'new wave',
];

const wikipediaGoodGenres = [
  '[href$=metal]',
  '[href$=metal_music]',
  '[href=Hard_rock]',
  '[href=Acid_rock]',
  '[href=Death_rock]',
  '[href=Experimental_rock]',
  '[href=Garage_rock]',
  '[href=Hard_rock]',
  '[href=Post-rock]',
  '[href=Punk_rock]',
  '[href=Stoner_rock]',
  '[href=Hardcore_punk]',
  '[href=Skate_punk]',
  '[href=Street_punk]',
  '[href=Ska_punk]',
  '[href=Avant-garde_metal]',
  '[href=Extreme_metal]',
  '[href=Black_metal]',
  '[href=Death_metal]',
  '[href=Doom_metal]',
  '[href=Speed_metal]',
  '[href=Thrash_metal]',
  '[href=Glam_metal]',
  '[href=Groove_metal]',
  '[href=Power_metal]',
  '[href=Symphonic_metal]',
  '[href=Funk_metal]',
  '[href=Rap_metal]',
  '[href=Nu_metal]',
  '[href=Drone_metal]',
  '[href=Folk_metal]',
  '[href=Gothic_metal]',
  '[href=Post-metal]',
  '[href=Industrial_metal]',
  '[href=Neoclassical_metal]',
  '[href=Progressive_metal]',
  '[href=Sludge_metal]',
  '[href=Viking_metal]',
];

const goodCategories = [
  'rock-alternative',
  'punk-emo-hardcore',
  'heavy rock',
  'death metal',
  'doom',
  'grindcore',
  'hard rock',
  'hardcore punk',
  'hardcore',
  'heavy metal',
  'heavy psych',
  "heavy rock 'n roll",
  'stoner',
  'garage',
  'industrial',
  'metal',
  'math rock',
  'metalcore',
  'neue deutsche haerte',
  'neue deutsche harte',
  'noise',
  'post-punk',
  'postpunk',
  'power metal',
  'psychobilly',
  'punk',
  'punx',
  'rockabilly, surf',
  'surfpunkabilly',
  'symphonic metal',
  'thrash',
];

export default {
  unavailability: unavailabilityTerms,
  forbidden: forbiddenTerms,
  wikipediaGoodGenres,
  goodCategories,
};
