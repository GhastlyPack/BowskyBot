import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import type { BotCommand } from '../client.js';
import {
  createSchedule,
  getSchedules,
  deleteSchedule,
  getUpcoming,
  getAttendance,
} from '../services/scheduler.js';
import { logger } from '../../lib/logger.js';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const schedule: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('Manage call schedules')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Create a recurring call schedule')
        .addStringOption(opt => opt.setName('title').setDescription('Call title').setRequired(true))
        .addStringOption(opt =>
          opt.setName('tier').setDescription('Which tier')
            .addChoices(
              { name: 'Blueprint', value: 'blueprint' },
              { name: 'Boardroom', value: 'boardroom' },
              { name: 'All', value: 'all' },
            ).setRequired(true),
        )
        .addChannelOption(opt => opt.setName('channel').setDescription('Text channel for reminders').setRequired(true))
        .addStringOption(opt =>
          opt.setName('recurrence').setDescription('How often')
            .addChoices(
              { name: 'Weekly', value: 'weekly' },
              { name: 'Biweekly', value: 'biweekly' },
              { name: 'Monthly', value: 'monthly' },
            ).setRequired(true),
        )
        .addIntegerOption(opt => opt.setName('day').setDescription('Day of week (0=Sun, 1=Mon, ..., 6=Sat)').setMinValue(0).setMaxValue(6).setRequired(true))
        .addIntegerOption(opt => opt.setName('hour').setDescription('Hour UTC (0-23)').setMinValue(0).setMaxValue(23).setRequired(true))
        .addChannelOption(opt => opt.setName('vc').setDescription('Voice channel for the call').setRequired(false))
        .addIntegerOption(opt => opt.setName('minute').setDescription('Minute (0-59)').setMinValue(0).setMaxValue(59).setRequired(false))
        .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes').setMinValue(15).setMaxValue(480).setRequired(false)),
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all call schedules'),
    )
    .addSubcommand(sub =>
      sub.setName('upcoming')
        .setDescription('Show upcoming calls in the next 7 days'),
    )
    .addSubcommand(sub =>
      sub.setName('delete')
        .setDescription('Delete a schedule')
        .addStringOption(opt => opt.setName('id').setDescription('Schedule ID').setRequired(true)),
    )
    .addSubcommand(sub =>
      sub.setName('attendance')
        .setDescription('View attendance for a schedule')
        .addStringOption(opt => opt.setName('id').setDescription('Schedule ID').setRequired(true)),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'Server only.', flags: 64 });
      return;
    }

    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'create': {
        const title = interaction.options.getString('title', true);
        const tier = interaction.options.getString('tier', true) as 'blueprint' | 'boardroom' | 'all';
        const channel = interaction.options.getChannel('channel', true);
        const vc = interaction.options.getChannel('vc', false);
        const recurrence = interaction.options.getString('recurrence', true) as 'weekly' | 'biweekly' | 'monthly';
        const day = interaction.options.getInteger('day', true);
        const hour = interaction.options.getInteger('hour', true);
        const minute = interaction.options.getInteger('minute', false) ?? 0;
        const duration = interaction.options.getInteger('duration', false) ?? 60;

        const sched = createSchedule({
          serverId: interaction.guild.id,
          title,
          tier,
          channelId: channel.id,
          voiceChannelId: vc?.id,
          recurrence,
          dayOfWeek: day,
          hour,
          minute,
          durationMin: duration,
        });

        const embed = new EmbedBuilder()
          .setTitle('Schedule Created')
          .setColor(0x2ecc71)
          .addFields(
            { name: 'Title', value: sched.title, inline: true },
            { name: 'Tier', value: sched.tier, inline: true },
            { name: 'Recurrence', value: sched.recurrence, inline: true },
            { name: 'Day', value: DAY_NAMES[sched.dayOfWeek], inline: true },
            { name: 'Time (UTC)', value: `${String(sched.hour).padStart(2, '0')}:${String(sched.minute).padStart(2, '0')}`, inline: true },
            { name: 'Duration', value: `${sched.durationMin} min`, inline: true },
            { name: 'Reminders', value: `<#${sched.channelId}>`, inline: true },
            { name: 'Voice', value: sched.voiceChannelId ? `<#${sched.voiceChannelId}>` : 'None', inline: true },
            { name: 'ID', value: sched.id!, inline: true },
          );

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'list': {
        const scheds = getSchedules(interaction.guild.id);
        if (scheds.length === 0) {
          await interaction.reply({ content: 'No schedules configured.', flags: 64 });
          return;
        }

        const lines = scheds.map(s => {
          const time = `${String(s.hour).padStart(2, '0')}:${String(s.minute).padStart(2, '0')} UTC`;
          const active = s.isActive ? '' : ' (paused)';
          return `**${s.title}** [${s.tier}] — ${s.recurrence} ${DAY_NAMES[s.dayOfWeek]} at ${time}${active}\n  ID: \`${s.id}\` | Reminders: <#${s.channelId}>`;
        });

        const embed = new EmbedBuilder()
          .setTitle(`Call Schedules (${scheds.length})`)
          .setColor(0x3498db)
          .setDescription(lines.join('\n\n'));

        await interaction.reply({ embeds: [embed], flags: 64 });
        break;
      }

      case 'upcoming': {
        const upcoming = getUpcoming(interaction.guild.id);
        if (upcoming.length === 0) {
          await interaction.reply({ content: 'No upcoming calls in the next 7 days.', flags: 64 });
          return;
        }

        const lines = upcoming.map(u => {
          const ts = Math.floor(u.nextAt.getTime() / 1000);
          return `**${u.schedule.title}** [${u.schedule.tier}] — <t:${ts}:F> (<t:${ts}:R>)`;
        });

        const embed = new EmbedBuilder()
          .setTitle('Upcoming Calls')
          .setColor(0x9b59b6)
          .setDescription(lines.join('\n'));

        await interaction.reply({ embeds: [embed], flags: 64 });
        break;
      }

      case 'delete': {
        const id = interaction.options.getString('id', true);
        if (deleteSchedule(id)) {
          await interaction.reply({ content: `Deleted schedule \`${id}\``, flags: 64 });
        } else {
          await interaction.reply({ content: `Schedule \`${id}\` not found`, flags: 64 });
        }
        break;
      }

      case 'attendance': {
        const id = interaction.options.getString('id', true);
        const records = getAttendance(id);

        if (records.length === 0) {
          await interaction.reply({ content: 'No attendance recorded today for this schedule.', flags: 64 });
          return;
        }

        const lines = records.map(r => {
          const duration = r.leftAt
            ? `${Math.round((r.leftAt.getTime() - r.joinedAt.getTime()) / 60000)} min`
            : 'still in call';
          return `<@${r.memberId}> — joined <t:${Math.floor(r.joinedAt.getTime() / 1000)}:t> (${duration})`;
        });

        const embed = new EmbedBuilder()
          .setTitle(`Attendance (${records.length})`)
          .setColor(0x2ecc71)
          .setDescription(lines.join('\n'));

        await interaction.reply({ embeds: [embed], flags: 64 });
        break;
      }
    }
  },
};
