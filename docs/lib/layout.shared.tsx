import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, discordUrl, gitConfig } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/bytebot_transparent_logo_dark.svg"
            alt={appName}
            className="h-5 w-auto dark:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/bytebot_transparent_logo_white.svg"
            alt={appName}
            className="hidden h-5 w-auto dark:block"
          />
        </>
      ),
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
    links: [
      {
        text: 'Discord',
        url: discordUrl,
        external: true,
      },
      {
        text: 'Blog',
        url: 'https://bytebot.ai/blog',
        external: true,
      },
    ],
  };
}
