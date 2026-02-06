export const allLogos = [
  new URL("../static/logos/aether.svg", import.meta.url).href,
  new URL("../static/logos/athena.svg", import.meta.url).href,
  new URL("../static/logos/browser-comp.svg", import.meta.url).href,
  new URL("../static/logos/burlington.svg", import.meta.url).href,
  new URL("../static/logos/carhartt-wip.svg", import.meta.url).href,
  new URL("../static/logos/clerk.svg", import.meta.url).href,
  new URL("../static/logos/coda.svg", import.meta.url).href,
  new URL("../static/logos/commerce-ui.svg", import.meta.url).href,
  new URL("../static/logos/conductor.svg", import.meta.url).href,
  new URL("../static/logos/cursor.svg", import.meta.url).href,
  new URL("../static/logos/customer.io.svg", import.meta.url).href,
  new URL("../static/logos/dbt.svg", import.meta.url).href,
  new URL("../static/logos/dom-perignon.svg", import.meta.url).href,
  new URL("../static/logos/elemeno-health.svg", import.meta.url).href,
  new URL("../static/logos/eurostar.svg", import.meta.url).href,
  new URL("../static/logos/expedia.svg", import.meta.url).href,
  new URL("../static/logos/fanduel.svg", import.meta.url).href,
  new URL("../static/logos/fnatic.svg", import.meta.url).href,
  new URL("../static/logos/frame.svg", import.meta.url).href,
  new URL("../static/logos/frontier.svg", import.meta.url).href,
  new URL("../static/logos/gaga.svg", import.meta.url).href,
  new URL("../static/logos/gala-games.svg", import.meta.url).href,
  new URL("../static/logos/gfinity.svg", import.meta.url).href,
  new URL("../static/logos/good-american.svg", import.meta.url).href,
  new URL("../static/logos/hinge.svg", import.meta.url).href,
  new URL("../static/logos/hipp.svg", import.meta.url).href,
  new URL("../static/logos/hunter-douglas.svg", import.meta.url).href,
  new URL("../static/logos/kahoot.svg", import.meta.url).href,
  new URL("../static/logos/keystone.svg", import.meta.url).href,
  new URL("../static/logos/lift-foil.svg", import.meta.url).href,
  new URL("../static/logos/loveholidays.svg", import.meta.url).href,
  new URL("../static/logos/lvmh.svg", import.meta.url).href,
  new URL("../static/logos/mejuri.svg", import.meta.url).href,
  new URL("../static/logos/metacore.svg", import.meta.url).href,
  new URL("../static/logos/mr-marvis.svg", import.meta.url).href,
  new URL("../static/logos/new-day.svg", import.meta.url).href,
  new URL("../static/logos/nordstrom.svg", import.meta.url).href,
  new URL("../static/logos/nour-hammour.svg", import.meta.url).href,
  new URL("../static/logos/paytronix.svg", import.meta.url).href,
  new URL("../static/logos/pinecone.svg", import.meta.url).href,
  new URL("../static/logos/poc.svg", import.meta.url).href,
  new URL("../static/logos/powerhouse.svg", import.meta.url).href,
  new URL("../static/logos/primary-bid.svg", import.meta.url).href,
  new URL("../static/logos/rad-power-bikes.svg", import.meta.url).href,
  new URL("../static/logos/redis.svg", import.meta.url).href,
  new URL("../static/logos/reforge.svg", import.meta.url).href,
  new URL("../static/logos/render.svg", import.meta.url).href,
  new URL("../static/logos/replit.svg", import.meta.url).href,
  new URL("../static/logos/retool.svg", import.meta.url).href,
  new URL("../static/logos/rich-brilliant-lighting.svg", import.meta.url).href,
  new URL("../static/logos/rikstv.svg", import.meta.url).href,
  new URL("../static/logos/rona.svg", import.meta.url).href,
  new URL("../static/logos/samsung.svg", import.meta.url).href,
  new URL("../static/logos/scalapay.svg", import.meta.url).href,
  new URL("../static/logos/siemens.svg", import.meta.url).href,
  new URL("../static/logos/spanx.svg", import.meta.url).href,
  new URL("../static/logos/stereolabs.svg", import.meta.url).href,
  new URL("../static/logos/summersalt.svg", import.meta.url).href,
  new URL("../static/logos/supreme.svg", import.meta.url).href,
  new URL("../static/logos/too-good-to-go.svg", import.meta.url).href,
  new URL("../static/logos/tula.svg", import.meta.url).href,
  new URL("../static/logos/unity.svg", import.meta.url).href,
  new URL("../static/logos/wetransfer.svg", import.meta.url).href,
];

export function shuffleArray<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  let currentIndex = shuffled.length;
  let randomValue: number;

  const seededRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  while (currentIndex !== 0) {
    randomValue = Math.floor(seededRandom() * currentIndex);
    currentIndex--;
    [shuffled[currentIndex], shuffled[randomValue]] = [
      shuffled[randomValue],
      shuffled[currentIndex],
    ];
  }

  return shuffled;
}

export function useLogos(count: number, shuffleSeed: number): string[] {
  const shuffled = shuffleArray(allLogos, shuffleSeed);
  return shuffled.slice(0, count);
}
