import { describe, expect, it } from 'vitest';
import { decodeHtmlEntities, extractPostDetailFromMedia, extractPostsFromFeed, parseCount, parseInstagramPostRef } from './helpers.js';

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

describe('parseInstagramPostRef', () => {
  it('parses reel urls', () => {
    expect(parseInstagramPostRef('https://www.instagram.com/reel/DWHkBs6EtV-/')).toEqual({
      kind: 'reel',
      shortcode: 'DWHkBs6EtV-',
    });
  });

  it('parses plain shortcodes as posts', () => {
    expect(parseInstagramPostRef('DWHkBs6EtV-')).toEqual({
      kind: 'p',
      shortcode: 'DWHkBs6EtV-',
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

describe('extractPostDetailFromMedia', () => {
  it('maps a single media item into post detail fields', () => {
    const detail = extractPostDetailFromMedia({
      code: 'REEL99',
      media_type: 2,
      user: { username: 'instagram' },
      caption: { text: 'watch this' },
      image_versions2: { candidates: [{ url: 'https://example.com/reel.jpg' }] },
      video_versions: [{ url: 'https://example.com/reel.mp4' }],
      like_count: 123,
      comment_count: 9,
      taken_at: 1700000000,
    }, 'https://www.instagram.com/reel/REEL99/');

    expect(detail).toMatchObject({
      shortcode: 'REEL99',
      type: 'reel',
      author: 'instagram',
      caption: 'watch this',
      likes: 123,
      comments: 9,
      url: 'https://www.instagram.com/reel/REEL99/',
      image_urls: ['https://example.com/reel.jpg'],
      video_urls: ['https://example.com/reel.mp4'],
      media_count: 2,
    });
    expect(detail?.taken_at).toBe('2023-11-14T22:13:20.000Z');
  });
});
