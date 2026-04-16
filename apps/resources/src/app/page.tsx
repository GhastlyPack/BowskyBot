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
  faLock,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { auth, signIn } from "@/lib/auth";
import { getUserTier, canAccessTier, type UserTier } from "@/lib/roles";

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

const tierDisplayNames: Record<UserTier, string> = {
  management: "Management",
  boardroom: "Boardroom",
  blueprint: "Blueprint",
  og: "OG Member",
  none: "",
};

export default async function Home() {
  const session = await auth();

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold mb-2">Bowsky&apos;s Resources</h1>
          <p className="text-neutral-400 mb-8">Sign in with Discord to access member resources.</p>
          <form action={async () => { "use server"; await signIn("discord"); }}>
            <button type="submit" className="px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-neutral-200 transition-colors">
              Sign in with Discord
            </button>
          </form>
        </div>
      </div>
    );
  }

  const discordId = (session as any).discordId;
  const userTier = discordId ? await getUserTier(discordId) : 'none' as UserTier;

  if (userTier === 'none') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <FontAwesomeIcon icon={faLock} className="w-10 h-10 text-neutral-600 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-neutral-400 mb-4">You need an active membership to view resources.</p>
          <p className="text-neutral-500 text-sm">Join the BOWSKY Discord server and verify your purchase to get access.</p>
        </div>
      </div>
    );
  }

  const accessibleCategories = categories.filter(cat => canAccessTier(userTier, cat.tier));
  const lockedCategories = categories.filter(cat => !canAccessTier(userTier, cat.tier));

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-800">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bowsky&apos;s Resources</h1>
            <p className="text-neutral-400 mt-2">Frameworks, templates, SOPs, and tools for community members</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-neutral-400">{session.user?.name}</p>
            <span className={`text-xs px-2 py-1 rounded-full border ${
              userTier === 'boardroom' || userTier === 'management' ? tierColors.boardroom : tierColors.blueprint
            }`}>
              {tierDisplayNames[userTier]}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accessibleCategories.map((cat) => (
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

          {lockedCategories.map((cat) => (
            <div key={cat.slug} className="block rounded-xl border border-neutral-800/50 bg-neutral-900/20 p-6 opacity-50">
              <div className="flex items-start justify-between mb-4">
                <FontAwesomeIcon icon={cat.icon} className="w-6 h-6 text-neutral-600" />
                <span className={`text-xs px-2 py-1 rounded-full border ${tierColors[cat.tier]}`}>{tierLabels[cat.tier]}</span>
              </div>
              <h2 className="text-lg font-semibold text-neutral-500">{cat.title}</h2>
              <p className="text-sm text-neutral-600 mt-2 leading-relaxed">{cat.description}</p>
              <div className="mt-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faLock} className="w-3 h-3 text-neutral-600" />
                <span className="text-xs text-neutral-600">Requires {tierLabels[cat.tier]}</span>
              </div>
            </div>
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
