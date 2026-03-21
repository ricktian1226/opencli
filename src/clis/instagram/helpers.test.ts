import { describe, expect, it } from 'vitest';
import { decodeHtmlEntities, extractPostsFromFeed, extractProfileFromMeta, parseCount } from './helpers.js';

describe('parseCount', () => {
  it('parses suffixed counts', () => {
    expect(parseCount('701M Followers')).toBe(701_000_000);
  });

  it('parses comma separated counts', () => {
    expect(parseCount('8,376 Posts')).toBe(8376);
  });
});

describe('decodeHtmlEntities', () => {
  it('decodes numeric and named entities', () => {
    expect(decodeHtmlEntities('Instagram (&#064;instagram) &#x2022; &quot;Hi&quot;')).toBe('Instagram (@instagram) • "Hi"');
  });
});

describe('extractProfileFromMeta', () => {
  it('extracts profile fields from instagram meta tags', () => {
    const profile = extractProfileFromMeta({
      ogTitle: 'Instagram (&#064;instagram) &#x2022; Instagram photos and videos',
      ogDescription: '701M Followers, 225 Following, 8,376 Posts - See Instagram photos and videos from Instagram (&#064;instagram)',
      description: "701M Followers, 225 Following, 8,376 Posts - Instagram (&#064;instagram) on Instagram: &quot;Discover what's new on Instagram&quot;",
      canonicalUrl: 'https://www.instagram.com/instagram/',
      ogImage: 'https://example.com/avatar.jpg',
    });

    expect(profile).toMatchObject({
      username: 'instagram',
      name: 'Instagram',
      bio: "Discover what's new on Instagram",
      followers: 701_000_000,
      following: 225,
      posts: 8376,
      profile_url: 'https://www.instagram.com/instagram/',
      avatar: 'https://example.com/avatar.jpg',
    });
  });
});

describe('extractPostsFromFeed', () => {
  it('maps instagram feed items into cli rows', () => {
    const posts = extractPostsFromFeed({
      items: [
        {
          code: 'ABC123',
          media_type: 1,
          caption: { text: 'hello world' },
          image_versions2: { candidates: [{ url: 'https://example.com/image.jpg' }] },
          like_count: 12,
          comment_count: 3,
          taken_at: 1700000000,
        },
        {
          code: 'REEL99',
          media_type: 2,
          caption: { text: 'watch this' },
          image_versions2: { candidates: [{ url: 'https://example.com/reel.jpg' }] },
          video_versions: [{ url: 'https://example.com/reel.mp4' }],
        },
      ],
    });

    expect(posts).toHaveLength(2);
    expect(posts[0]).toMatchObject({
      shortcode: 'ABC123',
      type: 'post',
      caption: 'hello world',
      url: 'https://www.instagram.com/p/ABC123/',
      thumbnail: 'https://example.com/image.jpg',
      likes: 12,
      comments: 3,
    });
    expect(posts[1]).toMatchObject({
      shortcode: 'REEL99',
      type: 'reel',
      url: 'https://www.instagram.com/reel/REEL99/',
      video_url: 'https://example.com/reel.mp4',
      is_video: true,
    });
  });
});
