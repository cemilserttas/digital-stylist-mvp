import { describe, it, expect } from 'vitest';
import { buildShopUrl } from '@/lib/utils';

describe('buildShopUrl', () => {
    it('encodes search terms in the URL', () => {
        const url = buildShopUrl('jean slim noir');
        expect(url).toContain(encodeURIComponent('jean slim noir acheter'));
    });

    it('returns a Google search URL', () => {
        const url = buildShopUrl('veste cuir');
        expect(url).toMatch(/^https:\/\/www\.google\.com\/search/);
    });

    it('appends "acheter" to the search terms', () => {
        const url = buildShopUrl('pull cachemire');
        expect(url).toContain('acheter');
    });

    it('handles special characters', () => {
        const url = buildShopUrl("t-shirt & polo");
        expect(url).toBeTruthy();
        expect(() => new URL(url)).not.toThrow();
    });
});
