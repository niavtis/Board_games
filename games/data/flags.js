// Simplified flags drawn as inline SVG (viewBox 30×20) so the quiz needs no image files.
// Emblems are reduced to basic shapes; colours and layouts follow the real flags.

const W = 30, H = 20;
const n = (x) => +x.toFixed(2);
const rect = (x, y, w, h, fill) => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${fill}"/>`;
const poly = (pts, fill) => `<polygon points="${pts.map(([x, y]) => `${n(x)},${n(y)}`).join(' ')}" fill="${fill}"/>`;
const circle = (cx, cy, r, fill) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;

function stripes(colors, weights, vertical) {
  const w = weights || colors.map(() => 1);
  const total = w.reduce((a, b) => a + b, 0);
  let at = 0;
  return colors.map((c, i) => {
    const size = ((vertical ? W : H) * w[i]) / total;
    const out = vertical ? rect(at, 0, size + 0.05, H, c) : rect(0, at, W, size + 0.05, c);
    at += size;
    return out;
  }).join('');
}
const hs = (colors, weights) => stripes(colors, weights, false);
const vs = (colors, weights) => stripes(colors, weights, true);

function star(cx, cy, r, fill, rot = 0, points = 5, inner = 0.382) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const a = ((-90 + rot + (i * 180) / points) * Math.PI) / 180;
    const rr = i % 2 ? r * inner : r;
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  return poly(pts, fill);
}

// Crescent = outer disc minus a disc shifted right by `off`, rotated by `rot` degrees.
function crescent(cx, cy, R, r, off, fill, rot = 0) {
  const x = (R * R - r * r + off * off) / (2 * off);
  const y = Math.sqrt(R * R - x * x);
  const big = off < x ? 1 : 0; // the inner circle's arc through its far side is the long one
  const d = `M${n(cx + x)},${n(cy - y)} A${R},${R} 0 1 0 ${n(cx + x)},${n(cy + y)} A${r},${r} 0 ${big} 1 ${n(cx + x)},${n(cy - y)}Z`;
  return `<path d="${d}" fill="${fill}" transform="rotate(${rot} ${cx} ${cy})"/>`;
}

const nordic = (bg, cross, inner) =>
  rect(0, 0, W, H, bg) + rect(8.5, 0, 4, H, cross) + rect(0, 8, W, 4, cross) +
  (inner ? rect(9.5, 0, 2, H, inner) + rect(0, 9, W, 2, inner) : '');

const union = (x, y, w, h) =>
  `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 60 30" preserveAspectRatio="none">` +
  '<rect width="60" height="30" fill="#012169"/>' +
  '<path d="M0,0L60,30M60,0L0,30" stroke="#fff" stroke-width="6"/>' +
  '<path d="M0,0L60,30M60,0L0,30" stroke="#C8102E" stroke-width="2"/>' +
  '<path d="M30,0v30M0,15h60" stroke="#fff" stroke-width="10"/>' +
  '<path d="M30,0v30M0,15h60" stroke="#C8102E" stroke-width="6"/></svg>';

const tri = (len, fill) => poly([[0, 0], [len, 10], [0, 20]], fill);

const MAPLE = 'M50,5L56,20L64,16L61,38L74,26L77,33L90,30L86,44L94,48L72,64L76,72L54,68L54,92L46,92L46,68L24,72L28,64L6,48L14,44L10,30L23,33L26,26L39,38L36,16L44,20Z';

const usa = () => {
  let s = '';
  for (let i = 0; i < 13; i++) s += rect(0, (i * H) / 13, W, H / 13 + 0.05, i % 2 ? '#fff' : '#B22234');
  s += rect(0, 0, 12, (7 * H) / 13, '#3C3B6E');
  for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) s += circle(n(1 + c * 2), n(1.1 + r * 2.1), 0.45, '#fff');
  return s;
};

const greece = () => {
  let s = '';
  for (let i = 0; i < 9; i++) s += rect(0, (i * H) / 9, W, H / 9 + 0.05, i % 2 ? '#fff' : '#0D5EAF');
  const k = (5 * H) / 9;
  return s + rect(0, 0, k, k, '#0D5EAF') + rect(0, (2 * H) / 9, k, H / 9, '#fff') + rect((2 * H) / 9, 0, H / 9, k, '#fff');
};

const georgia = () => {
  let s = rect(0, 0, W, H, '#fff') + rect(13.5, 0, 3, H, '#FF0000') + rect(0, 8.5, W, 3, '#FF0000');
  for (const [cx, cy] of [[6.75, 4.25], [23.25, 4.25], [6.75, 15.75], [23.25, 15.75]]) {
    s += rect(cx - 0.6, cy - 1.8, 1.2, 3.6, '#FF0000') + rect(cx - 1.8, cy - 0.6, 3.6, 1.2, '#FF0000');
  }
  return s;
};

const davidStar = (cx, cy, r, color) => {
  const t = (rot) => [0, 1, 2].map((i) => {
    const a = ((rot + i * 120) * Math.PI) / 180;
    return `${n(cx + r * Math.cos(a))},${n(cy + r * Math.sin(a))}`;
  }).join(' ');
  return `<g fill="none" stroke="${color}" stroke-width="0.9"><polygon points="${t(-90)}"/><polygon points="${t(90)}"/></g>`;
};

const pentagram = (cx, cy, r, color) => {
  const p = [0, 2, 4, 1, 3].map((i) => {
    const a = ((-90 + i * 72) * Math.PI) / 180;
    return `${n(cx + r * Math.cos(a))},${n(cy + r * Math.sin(a))}`;
  });
  return `<polygon points="${p.join(' ')}" fill="none" stroke="${color}" stroke-width="0.8" stroke-linejoin="round"/>`;
};

// name → SVG body
const FLAGS = {
  Latvia: hs(['#9E3039', '#fff', '#9E3039'], [2, 1, 2]),
  Lithuania: hs(['#FDB913', '#006A44', '#C1272D']),
  Estonia: hs(['#0072CE', '#000', '#fff']),
  Finland: nordic('#fff', '#003580'),
  Sweden: nordic('#006AA7', '#FECC00'),
  Norway: nordic('#BA0C2F', '#fff', '#00205B'),
  Denmark: nordic('#C8102E', '#fff'),
  Iceland: nordic('#02529C', '#fff', '#DC1E35'),
  Germany: hs(['#000', '#DD0000', '#FFCE00']),
  Netherlands: hs(['#AE1C28', '#fff', '#21468B']),
  Luxembourg: hs(['#ED2939', '#fff', '#00A1DE']),
  Russia: hs(['#fff', '#0039A6', '#D52B1E']),
  Hungary: hs(['#CE2939', '#fff', '#477050']),
  Bulgaria: hs(['#fff', '#00966E', '#D62612']),
  Austria: hs(['#ED2939', '#fff', '#ED2939']),
  Poland: hs(['#fff', '#DC143C']),
  Ukraine: hs(['#0057B7', '#FFD700']),
  Belarus: hs(['#C8313E', '#4AA657'], [2, 1]) + rect(0, 0, 3, H, '#fff') + [2, 6, 10, 14, 18].map((y) => poly([[1.5, y - 1.2], [2.6, y], [1.5, y + 1.2], [0.4, y]], '#C8313E')).join(''),
  France: vs(['#002395', '#fff', '#ED2939']),
  Italy: vs(['#009246', '#fff', '#CE2B37']),
  Ireland: vs(['#169B62', '#fff', '#FF883E']),
  Belgium: vs(['#000', '#FAE042', '#ED2939']),
  Romania: vs(['#002B7F', '#FCD116', '#CE1126']),
  Spain: hs(['#AA151B', '#F1BF00', '#AA151B'], [1, 2, 1]),
  Portugal: vs(['#006600', '#FF0000'], [2, 3]) + `<circle cx="12" cy="10" r="3.6" fill="none" stroke="#FFE000" stroke-width="1.1"/>` + rect(10.6, 8.3, 2.8, 3.4, '#fff') + rect(11.2, 8.9, 1.6, 2.2, '#D00'),
  Switzerland: rect(0, 0, W, H, '#DA291C') + rect(10.5, 8.5, 9, 3, '#fff') + rect(13.5, 5.5, 3, 9, '#fff'),
  Greece: greece(),
  Czechia: hs(['#fff', '#D7141A']) + tri(15, '#11457E'),
  Georgia: georgia(),
  Armenia: hs(['#D90012', '#0033A0', '#F2A800']),
  'United Kingdom': union(0, 0, W, H),
  'United States': usa(),
  Canada: vs(['#D80621', '#fff', '#D80621'], [1, 2, 1]) + `<svg x="9" y="4" width="12" height="12" viewBox="0 0 100 100"><path d="${MAPLE}" fill="#D80621"/></svg>`,
  Mexico: vs(['#006847', '#fff', '#CE1126']) + circle(15, 10, 2.3, '#8C5B2B') + circle(15, 10, 1.2, '#4E8A3A'),
  Brazil: rect(0, 0, W, H, '#009C3B') + poly([[15, 2], [28, 10], [15, 18], [2, 10]], '#FFDF00') + circle(15, 10, 3.6, '#002776'),
  Argentina: hs(['#74ACDF', '#fff', '#74ACDF']) + circle(15, 10, 2.2, '#F6B40E'),
  Colombia: hs(['#FCD116', '#003893', '#CE1126'], [2, 1, 1]),
  Peru: vs(['#D91023', '#fff', '#D91023']),
  Bolivia: hs(['#D52B1E', '#F9E300', '#007934']),
  Chile: rect(0, 0, W, 10, '#fff') + rect(0, 10, W, 10, '#D52B1E') + rect(0, 0, 10, 10, '#0039A6') + star(5, 5, 2.8, '#fff'),
  Cuba: hs(['#002A8F', '#fff', '#002A8F', '#fff', '#002A8F']) + tri(13, '#CF142B') + star(4.6, 10, 2.6, '#fff'),
  Panama: rect(0, 0, 15, 10, '#fff') + rect(15, 0, 15, 10, '#DA121A') + rect(0, 10, 15, 10, '#072357') + rect(15, 10, 15, 10, '#fff') + star(7.5, 5, 2.4, '#072357') + star(22.5, 15, 2.4, '#DA121A'),
  Jamaica: rect(0, 0, W, H, '#000') + poly([[0, 0], [W, 0], [15, 10]], '#009B3A') + poly([[0, H], [W, H], [15, 10]], '#009B3A') + '<path d="M0,0L30,20M30,0L0,20" stroke="#FED100" stroke-width="2.6"/>',
  Bahamas: hs(['#00778B', '#FFC72C', '#00778B']) + tri(13, '#000'),
  Japan: rect(0, 0, W, H, '#fff') + circle(15, 10, 6, '#BC002D'),
  Bangladesh: rect(0, 0, W, H, '#006A4E') + circle(13.5, 10, 6, '#F42A41'),
  Palau: rect(0, 0, W, H, '#4AADD6') + circle(13, 10, 5.5, '#FFDE00'),
  Laos: hs(['#CE1126', '#002868', '#CE1126'], [1, 2, 1]) + circle(15, 10, 4, '#fff'),
  Thailand: hs(['#A51931', '#F4F5F8', '#2D2A4A', '#F4F5F8', '#A51931'], [1, 1, 2, 1, 1]),
  Indonesia: hs(['#FF0000', '#fff']),
  Philippines: hs(['#0038A8', '#CE1126']) + tri(17, '#fff') + star(5.6, 10, 2.3, '#FCD116', 0, 8, 0.45),
  Vietnam: rect(0, 0, W, H, '#DA251D') + star(15, 10, 6, '#FFFF00'),
  China: rect(0, 0, W, H, '#DE2910') + star(5, 5, 3, '#FFDE00') + star(10, 2, 1, '#FFDE00', 20) + star(12, 4, 1, '#FFDE00', 40) + star(12, 7, 1, '#FFDE00', 0) + star(10, 9, 1, '#FFDE00', 20),
  India: hs(['#FF9933', '#fff', '#138808']) + `<circle cx="15" cy="10" r="2.3" fill="none" stroke="#000080" stroke-width="0.45"/>` + circle(15, 10, 0.5, '#000080'),
  Pakistan: rect(0, 0, 7.5, H, '#fff') + rect(7.5, 0, 22.5, H, '#01411C') + crescent(18.75, 10, 5.5, 4.6, 1.8, '#fff', -40) + star(21.6, 7.4, 1.7, '#fff', 15),
  Myanmar: hs(['#FECB00', '#34B233', '#EA2839']) + star(15, 10.8, 7.2, '#fff'),
  Kazakhstan: rect(0, 0, W, H, '#00AFCA') + circle(15, 9, 3.6, '#FEC50C') + rect(1.6, 0, 1.4, H, '#FEC50C'),
  Turkey: rect(0, 0, W, H, '#E30A17') + crescent(11, 10, 5, 4, 1.25, '#fff') + star(16.6, 10, 2.1, '#fff', -90),
  Israel: rect(0, 0, W, H, '#fff') + rect(0, 1.8, W, 3, '#0038B8') + rect(0, 15.2, W, 3, '#0038B8') + davidStar(15, 10, 3.6, '#0038B8'),
  Syria: hs(['#CE1126', '#fff', '#000']) + star(10.5, 10, 2, '#007A3D') + star(19.5, 10, 2, '#007A3D'),
  Yemen: hs(['#CE1126', '#fff', '#000']),
  'United Arab Emirates': hs(['#00732F', '#fff', '#000']) + rect(0, 0, 7.5, H, '#FF0000'),
  Sudan: hs(['#D21034', '#fff', '#000']) + tri(10, '#007229'),
  Tunisia: rect(0, 0, W, H, '#E70013') + circle(15, 10, 5, '#fff') + crescent(14.6, 10, 3.8, 3.1, 1, '#E70013') + star(16.3, 10, 1.8, '#E70013', -90),
  Algeria: vs(['#006233', '#fff']) + crescent(14.4, 10, 5, 4, 1.3, '#D21034') + star(17.6, 10, 2, '#D21034', -90),
  Morocco: rect(0, 0, W, H, '#C1272D') + pentagram(15, 10.4, 5, '#006233'),
  Nigeria: vs(['#008751', '#fff', '#008751']),
  Ghana: hs(['#CE1126', '#FCD116', '#006B3F']) + star(15, 10, 3.2, '#000'),
  Mali: vs(['#14B53A', '#FCD116', '#CE1126']),
  Guinea: vs(['#CE1126', '#FCD116', '#009460']),
  "Côte d'Ivoire": vs(['#F77F00', '#fff', '#009E60']),
  Senegal: vs(['#00853F', '#FDEF42', '#E31B23']) + star(15, 10, 2.8, '#00853F'),
  Cameroon: vs(['#007A5E', '#CE1126', '#FCD116']) + star(15, 10, 2.8, '#FCD116'),
  'Burkina Faso': hs(['#EF2B2D', '#009E49']) + star(15, 10, 3.2, '#FCD116'),
  Somalia: rect(0, 0, W, H, '#4189DD') + star(15, 10, 5, '#fff'),
  'Sierra Leone': hs(['#1EB53A', '#fff', '#0072C6']),
  Gabon: hs(['#009E60', '#FCD116', '#3A75C4']),
  Gambia: hs(['#CE1126', '#fff', '#0C1C8C', '#fff', '#3A7728'], [6, 1, 4, 1, 6]),
  Botswana: hs(['#75AADB', '#fff', '#000', '#fff', '#75AADB'], [9, 1, 4, 1, 9]),
  Mauritius: hs(['#EA2839', '#1A206D', '#FFD500', '#00A551']),
  Benin: rect(0, 0, W, 10, '#FCD116') + rect(0, 10, W, 10, '#E8112D') + rect(0, 0, 12, H, '#008751'),
  Madagascar: rect(0, 0, W, 10, '#FC3D32') + rect(0, 10, W, 10, '#007E3A') + rect(0, 0, 10, H, '#fff'),
  'Republic of the Congo': rect(0, 0, W, H, '#DC241F') + poly([[0, 0], [20, 0], [0, 20]], '#009543') + poly([[20, 0], [30, 0], [10, 20], [0, 20]], '#FBDE4A'),
  'South Africa': rect(0, 0, W, 10, '#E03C31') + rect(0, 10, W, 10, '#001489') +
    '<path d="M0,0L12,10L30,10M0,20L12,10" fill="none" stroke="#fff" stroke-width="6.6"/>' +
    '<path d="M0,0L12,10L30,10M0,20L12,10" fill="none" stroke="#007749" stroke-width="4"/>' +
    poly([[0, 2.2], [9.4, 10], [0, 17.8]], '#FFB612') + poly([[0, 4], [7.3, 10], [0, 16]], '#000'),
  Australia: rect(0, 0, W, H, '#012169') + union(0, 0, 15, 10) + star(7.5, 15, 2.6, '#fff', 0, 7, 0.45) +
    star(22.5, 16.5, 1.3, '#fff', 0, 7, 0.45) + star(18.5, 9, 1.3, '#fff', 0, 7, 0.45) + star(22.5, 3.5, 1.3, '#fff', 0, 7, 0.45) + star(26, 7.8, 1.3, '#fff', 0, 7, 0.45) + star(24.2, 11, 0.7, '#fff'),
  'New Zealand': rect(0, 0, W, H, '#012169') + union(0, 0, 15, 10) +
    [[22, 16.5, 1.5], [18.8, 8.8, 1.3], [22, 3.6, 1.2], [25.8, 7.6, 1.2]].map(([x, y, r]) => star(x, y, r + 0.45, '#fff') + star(x, y, r, '#CC142B')).join(''),
};

const flagSvg = (name) => (FLAGS[name] ? `<svg viewBox="0 0 30 20" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">${FLAGS[name]}</svg>` : null);

module.exports = { FLAGS, FLAG_NAMES: Object.keys(FLAGS), flagSvg };
