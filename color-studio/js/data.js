// Static catalog: seasons, palettes per category, and the item variants (hijab styles,
// clothing types, lens colors/shapes, metals). Season palettes are a starting guide;
// the studio scores every color against the user's own profile.

export const SEASONS = {
  spring: {
    id: 'spring', name: 'Spring', tag: 'Warm & Bright',
    blurb: 'Hangat, cerah, dan segar. Warna jernih dengan dasar kuning keemasan membuat wajahmu tampak hidup.',
    // prototype position on the three axes used by the analysis (-1..1)
    proto: { warmth: 0.9, depth: -0.5, clarity: 0.6 },
    accent: '#F2766B',
    clothes: ['#F4C6A5', '#F2766B', '#F5A15B', '#F9DD8C', '#A9BE6E', '#7FC4A8', '#FFF3DC', '#E9A23B', '#4FB0C6', '#E0533F', '#D6B48A', '#6A8FD0'],
    lips: ['#F08A73', '#F2A08A', '#E5604C', '#E3806E', '#FF7F6B', '#D96B57'],
    blush: ['#F4A58A', '#F7B59C', '#F28C7A', '#F5A3A0'],
    shadow: ['#E8B97A', '#C99A6B', '#A8B36A', '#E7A98B', '#B8865A'],
    hair: ['#B07A3F', '#D4A15F', '#A0522D', '#8A5A33'],
    metals: ['gold', 'rosegold'],
    lenses: ['peach', 'yellow', 'pink', 'green', 'brown'],
  },
  summer: {
    id: 'summer', name: 'Summer', tag: 'Cool & Soft',
    blurb: 'Sejuk, lembut, dan elegan. Warna pastel berdasar biru keabuan menyatu halus dengan kulitmu.',
    proto: { warmth: -0.9, depth: -0.4, clarity: -0.6 },
    accent: '#CC93AE',
    clothes: ['#F1E4EA', '#E3BACB', '#CC93AE', '#C3A6D6', '#8FB1D9', '#4C7299', '#F4F4F6', '#A3ACB8', '#93A8A0', '#B05C7B', '#7D6A92', '#3E4E6B'],
    lips: ['#D88AA0', '#C0657F', '#E3A3B5', '#B5677E', '#A95473', '#CF7E95'],
    blush: ['#E8A6B8', '#D99AAE', '#E0B2C6', '#D78FA6'],
    shadow: ['#B7A3C8', '#9EA9B8', '#C6A0AE', '#8C8FA6', '#A7B4C2'],
    hair: ['#7B6655', '#A89480', '#3B3433', '#5E4B42'],
    metals: ['silver', 'rosegold'],
    lenses: ['purple', 'pink', 'blue', 'gray', 'clear'],
  },
  autumn: {
    id: 'autumn', name: 'Autumn', tag: 'Warm & Deep',
    blurb: 'Hangat, dalam, dan kaya. Warna bumi seperti karamel, bata, dan zaitun membuat wajahmu tampak hangat dan matang.',
    proto: { warmth: 0.9, depth: 0.55, clarity: -0.55 },
    accent: '#A8541D',
    clothes: ['#B97A4B', '#8A4A2E', '#C99872', '#A8541D', '#C9B66A', '#3F6B4A', '#E8D6B5', '#6E4426', '#D4A23C', '#8C2F2A', '#3F6764', '#6B6B2E'],
    lips: ['#A4523A', '#B5634A', '#8E3B2B', '#9C5A47', '#C2704F', '#7E3A2C'],
    blush: ['#C98463', '#B8755A', '#D19773', '#C27560'],
    shadow: ['#8A5A3B', '#A97A3E', '#6C6B3A', '#9B5B3A', '#5E4430'],
    hair: ['#6B3A22', '#8B3A1E', '#4A2C1D', '#7A4B2A'],
    metals: ['gold'],
    lenses: ['brown', 'yellow', 'green', 'peach'],
  },
  winter: {
    id: 'winter', name: 'Winter', tag: 'Cool & Deep',
    blurb: 'Sejuk, tegas, dan kontras. Warna murni dan pekat seperti merah, fuchsia, dan biru royal mempertegas wajahmu.',
    proto: { warmth: -0.85, depth: 0.5, clarity: 0.8 },
    accent: '#C8173C',
    clothes: ['#C8173C', '#E57FB4', '#3B2C8F', '#00797E', '#0F1E46', '#151515', '#FFFFFF', '#9A1B5D', '#1E57A8', '#0B6B4F', '#BFD0E0', '#5E616B'],
    lips: ['#B4123B', '#8E1550', '#C2185B', '#6E0E2F', '#D6336C', '#9B1B30'],
    blush: ['#D9668A', '#C24C7B', '#E58DAA', '#CC5C7C'],
    shadow: ['#5A4F7A', '#3A3A48', '#6E4A6E', '#2E4A6B', '#7A7C88'],
    hair: ['#0E0D12', '#2B1A17', '#3E1222', '#1C1A22'],
    metals: ['silver', 'platinum'],
    lenses: ['gray', 'black', 'blue', 'purple', 'clear'],
  },
};

export const SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter'];

export const HIJAB_STYLES = [
  { id: 'pashmina', name: 'Pashmina' },
  { id: 'segi-empat', name: 'Segi Empat' },
  { id: 'instant', name: 'Instant' },
  { id: 'shawl', name: 'Shawl' },
  { id: 'turban', name: 'Turban' },
  { id: 'bergo', name: 'Bergo' },
  { id: 'khimar', name: 'Khimar' },
  { id: 'sport', name: 'Sport Hijab' },
];

export const CLOTH_TYPES = [
  { id: 'blouse', name: 'Blouse' },
  { id: 'kemeja', name: 'Kemeja' },
  { id: 'sweater', name: 'Sweater' },
  { id: 'tshirt', name: 'T-shirt' },
  { id: 'outer', name: 'Outer' },
  { id: 'dress', name: 'Dress' },
  { id: 'setelan', name: 'Setelan' },
  { id: 'kardigan', name: 'Kardigan' },
  { id: 'tanktop', name: 'Tank Top' },
  { id: 'croptop', name: 'Crop Top' },
];

export const LENS_COLORS = [
  { id: 'clear', name: 'Clear', hex: '#DCE6EC', alpha: 0.18 },
  { id: 'pink', name: 'Pink', hex: '#F2A2BE', alpha: 0.5 },
  { id: 'peach', name: 'Peach', hex: '#F6AE88', alpha: 0.5 },
  { id: 'yellow', name: 'Yellow', hex: '#F2CF5B', alpha: 0.5 },
  { id: 'green', name: 'Green', hex: '#86BF95', alpha: 0.5 },
  { id: 'blue', name: 'Blue', hex: '#86B2DE', alpha: 0.5 },
  { id: 'purple', name: 'Purple', hex: '#AE8FD6', alpha: 0.52 },
  { id: 'brown', name: 'Brown', hex: '#9A6A45', alpha: 0.58 },
  { id: 'gray', name: 'Gray', hex: '#7E8288', alpha: 0.58 },
  { id: 'black', name: 'Black', hex: '#25262A', alpha: 0.72 },
];

export const LENS_SHAPES = [
  { id: 'oval', name: 'Oval' },
  { id: 'round', name: 'Round' },
  { id: 'square', name: 'Square' },
  { id: 'cateye', name: 'Cat Eye' },
  { id: 'hexagon', name: 'Hexagon' },
];

export const METALS = [
  { id: 'gold', name: 'Gold', hex: '#D4AF37', temp: 'warm' },
  { id: 'rosegold', name: 'Rose Gold', hex: '#DFA08C', temp: 'neutral' },
  { id: 'silver', name: 'Silver', hex: '#BFC4CB', temp: 'cool' },
  { id: 'platinum', name: 'Platinum', hex: '#E4E4E2', temp: 'cool' },
  { id: 'black', name: 'Matte Black', hex: '#222222', temp: 'neutral' },
  { id: 'clear', name: 'Transparan', hex: '#E9EEF2', temp: 'neutral' },
];

// Skin presets for "explore without a photo" (Indonesian skin range, light → deep)
export const SKIN_PRESETS = [
  { hex: '#F3D6C1', name: 'Porselen' },
  { hex: '#EBC6A6', name: 'Terang' },
  { hex: '#E0B48F', name: 'Kuning langsat' },
  { hex: '#D4A27C', name: 'Sawo terang' },
  { hex: '#C08A63', name: 'Sawo matang' },
  { hex: '#A9734F', name: 'Cokelat' },
  { hex: '#8C5A3C', name: 'Cokelat gelap' },
  { hex: '#6B4330', name: 'Gelap' },
];

export const NEUTRAL_GRAY = '#9B9A97';
