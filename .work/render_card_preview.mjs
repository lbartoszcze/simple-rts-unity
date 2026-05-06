import { writeFileSync } from 'fs';
globalThis.window = { CARD_ART_BASE: 'file:///Users/lukaszbartoszcze/work/simple-rts-unity/web/art/cards' };
const { cardArtSvg } = await import('../web/art/card-art.js');

const SAMPLES = [
  { race: 'humans',    cards: [
    { id: 'h_iron',   kind: 'armor',    tier: 'common', name: 'Iron Plate' },
    { id: 'h_blade',  kind: 'weapon',   tier: 'common', name: 'Sharp Blade' },
    { id: 'h_holy',   kind: 'spell',    tier: 'rare',   name: 'Holy Light' },
    { id: 'h_tower',  kind: 'building', tier: 'rare',   name: 'Watchtower' },
    { id: 'h_banner', kind: 'spell',    tier: 'combo',  name: 'Royal Banner' },
    { id: 'h_knight', kind: 'recruit',  tier: 'rare',   name: 'Knight Order' },
  ]},
  { race: 'dwarves',   cards: [
    { id: 'd_forge',  kind: 'building', tier: 'rare',   name: 'Forge' },
    { id: 'd_hammer', kind: 'weapon',   tier: 'combo',  name: 'Hammer' },
    { id: 'd_axe',    kind: 'weapon',   tier: 'common', name: 'Battle Axe' },
    { id: 'd_mount',  kind: 'armor',    tier: 'combo',  name: 'Mountain Stance' },
    { id: 'd_clan',   kind: 'recruit',  tier: 'common', name: 'Clan Muster' },
    { id: 'd_mine',   kind: 'building', tier: 'rare',   name: 'Mine' },
  ]},
  { race: 'elves',     cards: [
    { id: 'e_bow',    kind: 'weapon',   tier: 'common', name: 'Longbow' },
    { id: 'e_cloak',  kind: 'armor',    tier: 'common', name: 'Forest Cloak' },
    { id: 'e_moon',   kind: 'armor',    tier: 'combo',  name: 'Moonweave' },
    { id: 'e_spring', kind: 'spell',    tier: 'rare',   name: 'Healing Spring' },
    { id: 'e_grove',  kind: 'building', tier: 'rare',   name: 'Grove' },
    { id: 'e_pact',   kind: 'recruit',  tier: 'common', name: 'Sylvan Pact' },
  ]},
  { race: 'skeletons', cards: [
    { id: 's_raise',  kind: 'recruit',  tier: 'common', name: 'Raise Dead' },
    { id: 's_spear',  kind: 'weapon',   tier: 'common', name: 'Bone Spear' },
    { id: 's_wave',   kind: 'spell',    tier: 'rare',   name: 'Death Wave' },
    { id: 's_yard',   kind: 'building', tier: 'rare',   name: 'Boneyard' },
    { id: 's_crypt',  kind: 'building', tier: 'rare',   name: 'Crypt' },
    { id: 's_cursed', kind: 'weapon',   tier: 'combo',  name: 'Cursed Steel' },
  ]},
];

const TIER_COL = { common: '#bdbdbd', combo: '#6cd6ff', rare: '#b88dff' };
const RACE_LABEL = { humans: 'HUMANS', dwarves: 'DWARVES', elves: 'ELVES', skeletons: 'SKELETONS' };

const COLS = 6, CW = 130, CH = 175, PAD = 18, HEADER = 36;
const W = COLS * CW + PAD * 2;
const H = SAMPLES.length * (CH + HEADER) + PAD * 2;

const cells = [];
SAMPLES.forEach((row, ri) => {
  const ry = PAD + ri * (CH + HEADER);
  cells.push(`<text x="${PAD}" y="${ry + 22}" font-family="Inter, sans-serif" font-size="15" font-weight="700" fill="#f3c259" letter-spacing="2">${RACE_LABEL[row.race]}</text>`);
  row.cards.forEach((c, ci) => {
    const cx = PAD + ci * CW;
    const cy = ry + HEADER;
    const art = cardArtSvg(c, row.race);
    const inner = art.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    cells.push(`<g transform="translate(${cx + 14},${cy})"><svg width="100" height="100" viewBox="0 0 100 100">${inner}</svg></g>`);
    cells.push(`<text x="${cx + 64}" y="${cy + 116}" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" fill="${TIER_COL[c.tier]}" letter-spacing="1.4">${c.kind.toUpperCase()} · ${c.tier.toUpperCase()}</text>`);
    cells.push(`<text x="${cx + 64}" y="${cy + 134}" text-anchor="middle" font-family="Inter, sans-serif" font-size="13" font-weight="700" fill="#ffffff">${c.name}</text>`);
  });
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0c0f1a"/>
  <text x="${W/2}" y="26" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" font-weight="700" fill="#f3c259" letter-spacing="3">CARD ARTWORK PREVIEW</text>
  ${cells.join('\n  ')}
</svg>`;

writeFileSync('./.work/card_preview.svg', svg);
console.log(`wrote ./.work/card_preview.svg  ${W}x${H}  ${SAMPLES.length} races x ${SAMPLES[0].cards.length} cards`);
