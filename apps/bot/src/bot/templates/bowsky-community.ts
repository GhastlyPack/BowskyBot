import type { ServerTemplate } from '../services/channel-manager.js';

/**
 * Bowsky Community Server Template
 *
 * Designed around the two-tier ecosystem:
 * - Blueprint ($99/mo) — aspiring operators, implementation track
 * - Boardroom ($999-$2K/mo) — 7-8 figure operators, strategy + networking
 *
 * OG members (grandfathered) get Blueprint access.
 * Boardroom members see everything Blueprint sees + their exclusive areas.
 * Public areas are visible to everyone for social validation.
 */
export const bowskyCommunityTemplate: ServerTemplate = {
  name: 'Bowsky Community',
  categories: [
    // ===== PUBLIC (everyone sees) =====
    {
      name: '👋 WELCOME',
      tier: null,
      channels: [
        { name: 'rules', type: 'text', topic: 'Community rules and guidelines' },
        { name: 'announcements', type: 'announcement', topic: 'Official announcements from Bowsky' },
        { name: 'introductions', type: 'text', topic: 'Introduce yourself to the community' },
        { name: 'start-here', type: 'text', topic: 'New? Start here — how the community works' },
      ],
    },
    {
      name: '💬 GENERAL',
      tier: null,
      channels: [
        { name: 'general-chat', type: 'text', topic: 'Open conversation' },
        { name: 'wins', type: 'text', topic: 'Share your wins — big or small' },
        { name: 'memes', type: 'text', topic: 'Keep it fun' },
      ],
    },

    // ===== BLUEPRINT (paid $99/mo + OG members) =====
    {
      name: '📘 BLUEPRINT',
      tier: 'blueprint',
      channels: [
        { name: 'blueprint-chat', type: 'text', topic: 'Blueprint members discussion' },
        { name: 'implementation-track', type: 'text', topic: '12-month implementation track updates and discussion' },
        { name: 'monthly-drop', type: 'text', topic: 'Monthly framework/template drops' },
        { name: 'accountability', type: 'text', topic: 'Share your weekly goals and check in' },
        { name: 'resources', type: 'text', topic: 'Frameworks, templates, SOPs, scripts — hyperlinks to resources site' },
        { name: 'questions', type: 'text', topic: 'Ask questions, get answers from the community' },
      ],
    },
    {
      name: '📘 BLUEPRINT CALLS',
      tier: 'blueprint',
      channels: [
        { name: 'call-schedule', type: 'text', topic: 'Monthly group call schedule and links' },
        { name: 'call-recordings', type: 'text', topic: 'Past call recordings and notes' },
        { name: 'blueprint-voice', type: 'voice' },
        { name: 'blueprint-stage', type: 'stage' },
      ],
    },

    // ===== BOARDROOM (paid $999-$2K/mo) =====
    {
      name: '🏛️ BOARDROOM',
      tier: 'boardroom',
      channels: [
        { name: 'boardroom-chat', type: 'text', topic: 'Boardroom members discussion — operators only' },
        { name: 'deal-flow', type: 'text', topic: 'Opportunities, partnerships, and deals' },
        { name: 'hot-seats', type: 'text', topic: 'Hot seat submissions and follow-ups' },
        { name: 'strategy', type: 'text', topic: 'Tactical strategy discussions' },
        { name: 'member-directory', type: 'text', topic: 'Who\'s in the room — introductions and verticals' },
        { name: 'boardroom-resources', type: 'text', topic: 'Advanced frameworks and case studies' },
      ],
    },
    {
      name: '🏛️ BOARDROOM CALLS',
      tier: 'boardroom',
      channels: [
        { name: 'weekly-schedule', type: 'text', topic: 'Weekly call schedule — 4 calls per month' },
        { name: 'boardroom-recordings', type: 'text', topic: 'Call recordings and lesson notes' },
        { name: 'hot-seat-submissions', type: 'forum', topic: 'Submit your hot seat for upcoming calls' },
        { name: 'boardroom-voice', type: 'voice' },
        { name: 'boardroom-stage', type: 'stage' },
      ],
    },

    // ===== SUPPORT =====
    {
      name: '🛟 SUPPORT',
      tier: null,
      channels: [
        { name: 'support', type: 'text', topic: 'Need help? Ask here' },
        { name: 'feedback', type: 'text', topic: 'Community feedback and suggestions' },
      ],
    },

    // ===== STAFF =====
    {
      name: '🔒 STAFF',
      tier: null, // Will be manually locked to Management role
      channels: [
        { name: 'staff-chat', type: 'text', topic: 'Internal team discussion' },
        { name: 'mod-logs', type: 'text', topic: 'Moderation audit log' },
        { name: 'bot-commands', type: 'text', topic: 'Bot testing and commands' },
      ],
    },
  ],
};
