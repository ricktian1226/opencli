import { cli, Strategy } from '../../registry.js';
import { extractPostsFromFeed, normalizeInstagramUsername } from './helpers.js';

cli({
  site: 'instagram',
  name: 'user-posts',
  description: 'List recent Instagram posts from a profile',
  domain: 'www.instagram.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'username', type: 'string', required: true, positional: true, help: 'Instagram username or profile URL' },
    { name: 'limit', type: 'int', default: 12, help: 'Maximum number of posts to return' },
  ],
  columns: ['shortcode', 'type', 'caption', 'url', 'thumbnail'],
  func: async (page, kwargs) => {
    const username = normalizeInstagramUsername(String(kwargs.username));
    const limit = Math.max(1, Number(kwargs.limit ?? 12));
    if (!username) throw new Error('Instagram username is required');

    await page.goto(`https://www.instagram.com/${username}/`);
    await page.wait(4);

    const payload = await page.evaluate(`
      (async () => {
        const headers = {
          'x-ig-app-id': '936619743392459',
          'x-requested-with': 'XMLHttpRequest',
        };

        let feed = null;
        let apiError = '';
        try {
          const resp = await fetch('/api/v1/feed/user/${username}/username/?count=${limit}', {
            credentials: 'include',
            headers,
          });
          if (resp.ok) {
            feed = await resp.json();
          } else {
            apiError = 'HTTP ' + resp.status;
          }
        } catch (error) {
          apiError = error instanceof Error ? error.message : String(error);
        }

        if (!feed) {
          try {
            const altResp = await fetch('/api/v1/users/web_profile_info/?username=${username}', {
              credentials: 'include',
              headers,
            });
            if (altResp.ok) {
              const altData = await altResp.json();
              const timeline = altData?.data?.user?.edge_owner_to_timeline_media?.edges;
              if (Array.isArray(timeline) && timeline.length > 0) {
                feed = {
                  items: timeline.map((edge) => {
                    const node = edge?.node || {};
                    const mediaType = node?.__typename === 'GraphVideo'
                      ? 2
                      : (node?.__typename === 'GraphSidecar' ? 8 : 1);
                    return {
                      code: node.shortcode || '',
                      media_type: mediaType,
                      caption: { text: node?.edge_media_to_caption?.edges?.[0]?.node?.text || '' },
                      image_versions2: { candidates: [{ url: node.display_url || '' }] },
                      thumbnail_url: node.thumbnail_src || node.display_url || '',
                      comment_count: Number(node?.edge_media_to_comment?.count || 0),
                      like_count: Number(node?.edge_liked_by?.count || node?.edge_media_preview_like?.count || 0),
                      taken_at: Number(node?.taken_at_timestamp || 0),
                      is_video: !!node?.is_video,
                      video_url: '',
                    };
                  }),
                };
              }
            } else if (!apiError) {
              apiError = 'profile HTTP ' + altResp.status;
            }
          } catch (error) {
            if (!apiError) {
              apiError = error instanceof Error ? error.message : String(error);
            }
          }
        }

        const anchors = Array.from(document.querySelectorAll('a[href^="/p/"], a[href^="/reel/"]'));
        const seen = new Set();
        const domPosts = [];
        for (const a of anchors) {
          const href = (a.getAttribute('href') || '').split('?')[0];
          if (!href || seen.has(href)) continue;
          seen.add(href);

          const img = a.querySelector('img');
          const shortcode = href.split('/').filter(Boolean)[1] || '';
          domPosts.push({
            shortcode,
            type: href.startsWith('/reel/') ? 'reel' : 'post',
            caption: (img?.getAttribute('alt') || '').trim(),
            url: 'https://www.instagram.com' + href,
            thumbnail: img?.getAttribute('src') || '',
          });
        }

        return {
          feed,
          domPosts,
          apiError,
          privateHint: document.body.innerText.includes('This account is private'),
        };
      })()
    `);

    const apiPosts = extractPostsFromFeed((payload as any)?.feed);
    if (apiPosts.length > 0) {
      return apiPosts.slice(0, limit);
    }

    const domPosts = Array.isArray((payload as any)?.domPosts) ? (payload as any).domPosts : [];
    if (domPosts.length > 0) {
      return domPosts.slice(0, limit);
    }

    if ((payload as any)?.privateHint) {
      throw new Error('Instagram account is private. Log in with a permitted account and retry.');
    }

    throw new Error((payload as any)?.apiError || 'No Instagram posts found. You may need to log in or Instagram may be blocking this profile.');
  },
});
