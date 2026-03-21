import { cli, Strategy } from '../../registry.js';
import { extractProfileFromMeta, normalizeInstagramUsername } from './helpers.js';

cli({
  site: 'instagram',
  name: 'profile',
  description: 'Read an Instagram profile summary',
  domain: 'www.instagram.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'username', type: 'string', required: true, positional: true, help: 'Instagram username or profile URL' },
  ],
  columns: ['username', 'name', 'bio', 'followers', 'following', 'posts', 'verified', 'private', 'profile_url'],
  func: async (page, kwargs) => {
    const username = normalizeInstagramUsername(String(kwargs.username));
    if (!username) throw new Error('Instagram username is required');

    await page.goto(`https://www.instagram.com/${username}/`);
    await page.wait(2);

    const result = await page.evaluate(`
      (async () => {
        const pickMeta = (selector) => document.querySelector(selector)?.getAttribute('content') || '';
        const header = document.querySelector('header');

        const meta = {
          ogTitle: pickMeta('meta[property="og:title"]'),
          ogDescription: pickMeta('meta[property="og:description"]'),
          description: pickMeta('meta[name="description"]'),
          canonicalUrl: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
          ogImage: pickMeta('meta[property="og:image"]'),
        };

        let apiProfile = null;
        let apiError = '';
        try {
          const resp = await fetch('/api/v1/users/web_profile_info/?username=${username}', {
            credentials: 'include',
            headers: {
              'x-ig-app-id': '936619743392459',
              'x-requested-with': 'XMLHttpRequest',
            },
          });
          if (resp.ok) {
            const data = await resp.json();
            const user = data?.data?.user;
            if (user) {
              const followers = Number(
                user.follower_count
                ?? user.edge_followed_by?.count
                ?? user.followers
                ?? 0
              );
              const following = Number(
                user.following_count
                ?? user.edge_follow?.count
                ?? user.following
                ?? 0
              );
              const posts = Number(
                user.media_count
                ?? user.edge_owner_to_timeline_media?.count
                ?? user.edge_felix_video_timeline?.count
                ?? user.posts_count
                ?? 0
              );

              apiProfile = {
                username: user.username || '${username}',
                name: user.full_name || '',
                bio: user.biography || '',
                followers,
                following,
                posts,
                verified: !!user.is_verified,
                private: !!user.is_private,
                profile_url: window.location.href,
                avatar: user.profile_pic_url_hd || user.profile_pic_url || '',
              };
            }
          } else {
            apiError = 'HTTP ' + resp.status;
          }
        } catch (error) {
          apiError = error instanceof Error ? error.message : String(error);
        }

        let domBio = '';
        if (header) {
          const bioCandidates = Array.from(header.querySelectorAll('section span, section div, div span, div div'))
            .map((el) => (el.textContent || '').trim())
            .filter(Boolean)
            .filter((text) => text !== '${username}')
            .filter((text) => text !== 'Verified')
            .filter((text) => !/posts|followers|following/i.test(text))
            .filter((text) => text.length > 2);
          domBio = bioCandidates.slice(0, 4).join('\\n');
        }

        const buttonsText = Array.from((header || document).querySelectorAll('button'))
          .map((el) => (el.textContent || '').trim())
          .filter(Boolean);

        return {
          meta,
          apiProfile,
          domBio,
          privateHint: document.body.innerText.includes('This account is private')
            || buttonsText.some((text) => text.toLowerCase().includes('follow')),
          verifiedHint: !!document.querySelector('svg[aria-label*="Verified"], svg[title*="Verified"]'),
          apiError,
          url: window.location.href,
        };
      })()
    `);

    if (!result || typeof result !== 'object') {
      throw new Error('Failed to read Instagram profile');
    }

    const fallback = extractProfileFromMeta((result as any).meta || {}, username);
    const preferNumber = (primary: unknown, secondary: number) => {
      const value = Number(primary);
      return Number.isFinite(value) && value > 0 ? value : secondary;
    };
    const profile = (result as any).apiProfile
      ? {
          ...fallback,
          ...(result as any).apiProfile,
          bio: (result as any).apiProfile.bio || (result as any).domBio || fallback.bio,
          followers: preferNumber((result as any).apiProfile.followers, fallback.followers),
          following: preferNumber((result as any).apiProfile.following, fallback.following),
          posts: preferNumber((result as any).apiProfile.posts, fallback.posts),
          verified: Boolean((result as any).apiProfile.verified ?? (result as any).verifiedHint ?? fallback.verified),
          private: Boolean((result as any).apiProfile.private ?? (result as any).privateHint ?? fallback.private),
          profile_url: (result as any).apiProfile.profile_url || (result as any).url || fallback.profile_url,
        }
      : {
          ...fallback,
          bio: (result as any).domBio || fallback.bio,
          verified: Boolean((result as any).verifiedHint ?? fallback.verified),
          private: Boolean((result as any).privateHint ?? fallback.private),
          profile_url: (result as any).url || fallback.profile_url,
        };

    if (!profile.username) {
      throw new Error((result as any).apiError || 'Instagram profile not found or could not be parsed');
    }

    return [profile];
  },
});
