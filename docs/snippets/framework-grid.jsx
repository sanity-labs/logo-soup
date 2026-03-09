export const FrameworkGrid = () => {
  const svgl =
    "https://raw.githubusercontent.com/pheralb/svgl/main/static/library";

  const frameworks = [
    {
      name: "React",
      logo: `${svgl}/react_dark.svg`,
      href: "/frameworks/react",
      desc: "Component + hook",
    },
    {
      name: "Vue",
      logo: `${svgl}/vue.svg`,
      href: "/frameworks/vue",
      desc: "Composable",
    },
    {
      name: "Svelte",
      logo: `${svgl}/svelte.svg`,
      href: "/frameworks/svelte",
      desc: "Runes-compatible store",
    },
    {
      name: "Solid",
      logo: `${svgl}/solidjs.svg`,
      href: "/frameworks/solid",
      desc: "Reactive primitive",
    },
    {
      name: "Angular",
      logo: `${svgl}/angular.svg`,
      href: "/frameworks/angular",
      desc: "Injectable service",
    },
    {
      name: "jQuery",
      logo: `${svgl}/jquery.svg`,
      href: "/frameworks/jquery",
      desc: "$.fn plugin",
    },
    {
      name: "Vanilla JS",
      logo: `${svgl}/javascript.svg`,
      href: "/frameworks/vanilla",
      desc: "Core engine directly",
    },
    {
      name: "Your framework",
      logo: null,
      href: "/frameworks/custom",
      desc: "Build your own adapter",
    },
  ];

  return (
    <div className="not-prose grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
      {frameworks.map((fw) => (
        <a
          key={fw.name}
          href={fw.href}
          className="group flex flex-col items-center gap-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-5 transition-colors hover:border-zinc-400 dark:hover:border-zinc-500 no-underline"
        >
          {fw.logo ? (
            <img
              src={fw.logo}
              alt={fw.name}
              className="h-8 w-8"
              draggable={false}
            />
          ) : (
            <span className="flex items-center justify-center h-8 w-8 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 text-lg">
              +
            </span>
          )}
          <div className="text-center">
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {fw.name}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {fw.desc}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
};
