export const LogoSoupDemo = () => {
  // [name, naturalW, naturalH, normalizedW, normalizedH, translateY]
  // Values from the real library: createLogoSoup() with baseSize=48, scaleFactor=0.5, densityAware=true
  const data = [
    ["coda", 247, 82, 77, 26, -2.5],
    ["reforge", 420, 100, 112, 23, 0.5],
    ["kahoot", 294, 100, 82, 28, -1.0],
    ["cursor", 300, 71, 103, 24, -0.3],
    ["wetransfer", 371, 55, 116, 17, -0.9],
    ["redis", 170, 54, 78, 25, -2.1],
    ["expedia", 300, 67, 108, 22, -0.1],
    ["browser-comp", 274, 190, 78, 54, -1.4],
    ["hinge", 332, 126, 79, 30, 1.0],
    ["too-good-to-go", 250, 200, 64, 52, -1.4],
    ["unity", 305, 112, 80, 29, 0],
    ["keystone", 400, 80, 113, 23, 1.9],
    ["retool", 321, 63, 107, 21, -0.4],
    ["loveholidays", 357, 58, 130, 21, -1.5],
    ["rad-power-bikes", 427, 33, 164, 13, 0.6],
    ["stereolabs", 372, 50, 131, 18, -1.5],
    ["pinecone", 434, 90, 118, 24, -3.0],
    ["clerk", 317, 92, 89, 26, -1.1],
    ["samsung", 325, 50, 110, 17, 0],
    ["customer.io", 400, 54, 129, 18, -0.2],
  ];

  const base =
    "https://raw.githubusercontent.com/sanity-labs/logo-soup/main/static/logos";
  const uniformH = 28;
  const displayScale = 0.8;

  const [on, setOn] = useState(true);
  const [count, setCount] = useState(12);

  return (
    <div className="not-prose">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-900">
        <div className="flex items-center justify-center gap-7 flex-wrap px-6 py-8 min-h-[100px]">
          {data.slice(0, count).map(([name, nw, nh, dw, dh, ty]) => (
            <img
              key={name}
              src={`${base}/${name}.svg`}
              alt={name}
              draggable={false}
              className="dark:invert"
              style={{
                width: on
                  ? `${dw * displayScale}px`
                  : `${(nw / nh) * uniformH}px`,
                height: on ? `${dh * displayScale}px` : `${uniformH}px`,
                objectFit: "contain",
                transform:
                  on && ty ? `translateY(${ty * displayScale}px)` : "none",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          ))}
        </div>

        <div className="border-t border-zinc-200 dark:border-zinc-700 px-5 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setOn(!on)}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                on ? "bg-[#f36458]" : "bg-zinc-300 dark:bg-zinc-600"
              }`}
              role="switch"
              aria-checked={on}
              aria-label="Toggle Logo Soup"
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                  on ? "translate-x-[18px]" : "translate-x-[3px]"
                }`}
              />
            </button>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Logo Soup {on ? "on" : "off"}
            </span>
          </div>

          <label className="flex items-center gap-2.5">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Logos
            </span>
            <input
              type="range"
              min={3}
              max={data.length}
              step={1}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-24 h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #f36458 ${((count - 3) / (data.length - 3)) * 100}%, #e5e7eb ${((count - 3) / (data.length - 3)) * 100}%)`,
              }}
            />
            <span className="text-xs tabular-nums font-medium text-zinc-500 dark:text-zinc-400 w-5 text-right">
              {count}
            </span>
          </label>
        </div>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-3 text-center">
        Real values from <code className="text-xs">createLogoSoup()</code>
        {" · "}
        <a
          href="https://logo-soup.sanity.dev/?path=/story/logosoup--default"
          className="text-[#f36458] hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open playground →
        </a>
      </p>
    </div>
  );
};
