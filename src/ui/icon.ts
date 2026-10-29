/**
 * Ícone do SuFlow: um suflê em pixel art 16×16, no espírito do Mega Drive.
 * Cada caractere da grade é um pixel; "." é transparente.
 */
const PALETTE: Record<string, string> = {
  o: '#2b1b17', // contorno
  y: '#fff3b0', // brilho
  L: '#f7c84a', // massa dourada
  C: '#e08a2c', // crosta
  D: '#a5521b', // crosta tostada
  W: '#f4f4f4', // ramequim
  S: '#b8c2d6', // sombra das ranhuras
};

const GRID = [
  '................',
  '.....oooooo.....',
  '...ooLLLLLLoo...',
  '..oLLLyyLLLLLo..',
  '.oLLyyLLLLLLLLo.',
  '.oLLLLLLLLLCCLo.',
  '.oCLLLLLLLCCCCo.',
  'oCCCCLLCCCCCDDCo',
  'oooooooooooooooo',
  'oWWSWWSWWSWWSWWo',
  'oWWSWWSWWSWWSWWo',
  'oWWSWWSWWSWWSWWo',
  '.oWSWWSWWSWWSWo.',
  '.oWSWWSWWSWWSWo.',
  '..oooooooooooo..',
  '................',
];

export function souffleSvg(size = 64): string {
  const rects: string[] = [];
  GRID.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const fill = PALETTE[ch];
      if (fill) rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`);
    });
  });
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${size}" height="${size}" ` +
    `shape-rendering="crispEdges" role="img" aria-label="Suflê">${rects.join('')}</svg>`
  );
}
