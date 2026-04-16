import NextAuth from 'next-auth';
import Discord from 'next-auth/providers/discord';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'identify guilds',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      if (profile) {
        token.discordId = (profile as any).id;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      (session as any).discordId = token.discordId;
      return session;
    },
  },
});
