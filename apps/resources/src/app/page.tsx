import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDiagramProject,
  faClipboardList,
  faFileLines,
  faBoxOpen,
  faMicrophone,
  faChartPie,
  faScrewdriverWrench,
  faCalendarCheck,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

const categories: { slug: string; title: string; description: string; count: number; icon: IconDefinition; tier: string }[] = [
  { slug: "frameworks", title: "Frameworks", description: "Mental models and strategic frameworks for building and scaling businesses", count: 0, icon: faDiagramProject, tier: "blueprint" },
  { slug: "templates", title: "Templates", description: "Ready-to-use templates for hiring, SOPs, processes, and operations", count: 0, icon: faClipboardList, tier: "blueprint" },
  { slug: "sops", title: "SOPs & Scripts", description: "Standard operating procedures, sales scripts, and communication playbooks", count: 0, icon: faFileLines, tier: "blueprint" },
  { slug: "monthly-drops", title: "Monthly Drops", description: "One implementable system per month — the core of the Blueprint track", count: 0, icon: faBoxOpen, tier: "blueprint" },
  { slug: "call-recordings", title: "Call Recordings", description: "Recordings and notes from Blueprint and Boardroom calls", count: 0, icon: faMicrophone, tier: "all" },
  { slug: "case-studies", title: "Case Studies", description: "Real-world breakdowns from consulting and advisory work", count: 0, icon: faChartPie, tier: "boardroom" },
  { slug: "tools", title: "Tools & Software", description: "Recommended tools, software stack, and setup guides", count: 0, icon: faScrewdriverWrench, tier: "blueprint" },
  { slug: "events", title: "Event Materials", description: "Slides, handouts, and resources from live events and masterminds", count: 0, icon: faCalendarCheck, tier: "all" },
];

const tierColors: Record<string, string> = {
  blueprint: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  boardroom: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  all: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
};

const tierLabels: Record<string, string> = {
  blueprint: "Blueprint",
  boardroom: "Boardroom",
  all: "All Members",
};

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-800">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold tracking-tight">Bowsky&apos;s Resources</h1>
          <p className="text-neutral-400 mt-2">Frameworks, templates, SOPs, and tools for community members</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <Link key={cat.slug} href={`/${cat.slug}`} className="group block rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 hover:border-neutral-600 hover:bg-neutral-900 transition-all">
              <div className="flex items-start justify-between mb-4">
                <FontAwesomeIcon icon={cat.icon} className="w-6 h-6 text-neutral-400 group-hover:text-white transition-colors" />
                <span className={`text-xs px-2 py-1 rounded-full border ${tierColors[cat.tier]}`}>{tierLabels[cat.tier]}</span>
              </div>
              <h2 className="text-lg font-semibold group-hover:text-white transition-colors">{cat.title}</h2>
              <p className="text-sm text-neutral-400 mt-2 leading-relaxed">{cat.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-neutral-500">{cat.count > 0 ? `${cat.count} resources` : "Coming soon"}</span>
                <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3 text-neutral-500 group-hover:text-neutral-300 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t border-neutral-800 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <p className="text-sm text-neutral-500">Bowsky&apos;s Community &mdash; New resources are added regularly. Check the Discord for announcements.</p>
        </div>
      </footer>
    </div>
  );
}
