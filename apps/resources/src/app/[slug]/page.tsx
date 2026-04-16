import Link from "next/link";
import { notFound } from "next/navigation";
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
  faArrowLeft,
  faLock,
  faEye,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

const categoryData: Record<string, { title: string; description: string; icon: IconDefinition; items: { title: string; description: string; status: "available" | "coming-soon" }[] }> = {
  frameworks: {
    title: "Frameworks",
    icon: faDiagramProject,
    description: "Mental models and strategic frameworks for building and scaling businesses",
    items: [
      { title: "The Business Engine Map", description: "Diagram any business through Attention > Lead > Conversion > Delivery > Retention > Cash", status: "coming-soon" },
      { title: "The Readiness Checklist", description: "Evaluate your readiness to go independent across offer clarity, acquisition plan, runway, and risk tolerance", status: "coming-soon" },
      { title: "The Personal Operating Model", description: "One-page document defining your business model, your role, growth plan, and 12-month targets", status: "coming-soon" },
    ],
  },
  templates: {
    title: "Templates",
    icon: faClipboardList,
    description: "Ready-to-use templates for hiring, SOPs, processes, and operations",
    items: [
      { title: "Hiring Decision Framework", description: "When to hire, what role first, role descriptions, and interview questions", status: "coming-soon" },
      { title: "Delegation Matrix", description: "What to delegate first, what to keep, how to transfer responsibility", status: "coming-soon" },
      { title: "Process Documentation Kit", description: "Turn any repeatable task into a documented system with standards and metrics", status: "coming-soon" },
    ],
  },
  sops: {
    title: "SOPs & Scripts",
    icon: faFileLines,
    description: "Standard operating procedures, sales scripts, and communication playbooks",
    items: [
      { title: "Training Transfer Template", description: "How to teach someone else to produce your results", status: "coming-soon" },
      { title: "Management Rhythm Template", description: "Daily/weekly/monthly cadence, metrics to track, how to prevent drift", status: "coming-soon" },
    ],
  },
  "monthly-drops": {
    title: "Monthly Drops",
    icon: faBoxOpen,
    description: "One implementable system per month — the core of the Blueprint track",
    items: [
      { title: "Month 1: Self-Assessment Scorecard", description: "Baseline assessment across 10 dimensions — reliability, skill level, financial literacy, network, and more", status: "coming-soon" },
      { title: "Month 2: Skill Audit Template", description: "What are you actually good at, what does the market value, where is the gap", status: "coming-soon" },
      { title: "Month 3: Business Engine Map", description: "Map your business through the lens of the full revenue engine", status: "coming-soon" },
    ],
  },
  "call-recordings": {
    title: "Call Recordings",
    icon: faMicrophone,
    description: "Recordings and notes from Blueprint and Boardroom calls",
    items: [],
  },
  "case-studies": {
    title: "Case Studies",
    icon: faChartPie,
    description: "Real-world breakdowns from consulting and advisory work",
    items: [
      { title: "Operator Breakdown Series", description: "Anonymized deep-dives into real scaling challenges and how they were solved", status: "coming-soon" },
    ],
  },
  tools: {
    title: "Tools & Software",
    icon: faScrewdriverWrench,
    description: "Recommended tools, software stack, and setup guides",
    items: [
      { title: "Recommended Tech Stack", description: "The tools we use and recommend for operations, finance, marketing, and communication", status: "coming-soon" },
    ],
  },
  events: {
    title: "Event Materials",
    icon: faCalendarCheck,
    description: "Slides, handouts, and resources from live events and masterminds",
    items: [],
  },
};

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = categoryData[slug];
  if (!category) notFound();

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-800">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
            <FontAwesomeIcon icon={faArrowLeft} className="w-3 h-3" />
            All Resources
          </Link>
          <div className="flex items-center gap-3 mt-4">
            <FontAwesomeIcon icon={category.icon} className="w-7 h-7 text-neutral-300" />
            <h1 className="text-3xl font-bold tracking-tight">{category.title}</h1>
          </div>
          <p className="text-neutral-400 mt-2">{category.description}</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {category.items.length === 0 ? (
          <div className="text-center py-20">
            <FontAwesomeIcon icon={faLock} className="w-8 h-8 text-neutral-700 mb-4" />
            <p className="text-neutral-500 text-lg">No resources yet</p>
            <p className="text-neutral-600 text-sm mt-2">Check back soon — new content is added regularly.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {category.items.map((item, i) => (
              <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-neutral-400 mt-1">{item.description}</p>
                </div>
                {item.status === "coming-soon" ? (
                  <span className="shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-neutral-800 text-neutral-500 border border-neutral-700">
                    <FontAwesomeIcon icon={faLock} className="w-2.5 h-2.5" />
                    Coming Soon
                  </span>
                ) : (
                  <span className="shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 cursor-pointer hover:bg-blue-500/20 transition-colors">
                    <FontAwesomeIcon icon={faEye} className="w-2.5 h-2.5" />
                    View
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
