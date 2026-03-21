import { describe, it, expect } from 'vitest';
import { buildShopUrl } from '@/lib/utils';

describe('buildShopUrl', () => {
    // Google fallback (unknown brand)
    it('unknown brand → Google search', () => {
        const url = buildShopUrl('veste cuir générique');
        expect(url).toMatch(/^https:\/\/www\.google\.com\/search/);
        expect(url).toContain('acheter');
    });

    it('encodes search terms correctly', () => {
        const url = buildShopUrl('jean slim noir');
        expect(() => new URL(url)).not.toThrow();
    });

    it('handles special characters without throwing', () => {
        const url = buildShopUrl('t-shirt "slim fit" 100%');
        expect(url).toBeTruthy();
        expect(() => new URL(url)).not.toThrow();
    });

    // Amazon routing
    it('nike → Amazon FR', () => {
        const url = buildShopUrl('baskets Nike Air Force');
        expect(url).toMatch(/^https:\/\/www\.amazon\.fr\/s/);
        expect(url).toContain('tag=');
        expect(url).toContain('utm_source=digitalstylist');
    });

    it('adidas → Amazon FR', () => {
        const url = buildShopUrl('chaussures Adidas Stan Smith');
        expect(url).toMatch(/^https:\/\/www\.amazon\.fr\/s/);
    });

    it('uniqlo → Amazon FR', () => {
        const url = buildShopUrl('pull Uniqlo col rond');
        expect(url).toMatch(/^https:\/\/www\.amazon\.fr\/s/);
    });

    // Zalando routing
    it('zara → Zalando', () => {
        const url = buildShopUrl('chemise Zara slim');
        expect(url).toMatch(/^https:\/\/www\.zalando\.fr\/catalog/);
        expect(url).toContain('utm_source=digitalstylist');
    });

    it('h&m → Zalando', () => {
        const url = buildShopUrl('robe H&M fleurie');
        expect(url).toMatch(/^https:\/\/www\.zalando\.fr\/catalog/);
    });

    it('mango → Zalando', () => {
        const url = buildShopUrl('blazer Mango ajusté');
        expect(url).toMatch(/^https:\/\/www\.zalando\.fr\/catalog/);
    });

    // ASOS routing
    it('asos → ASOS', () => {
        const url = buildShopUrl('pantalon ASOS Design');
        expect(url).toMatch(/^https:\/\/www\.asos\.com\/search/);
        expect(url).toContain('utm_source=digitalstylist');
    });

    // UTM params always present
    it('includes UTM campaign parameter in all URLs', () => {
        for (const terms of ['polo Ralph Lauren', 'jean Zara', 'robe ASOS', 'veste inconnue']) {
            const url = buildShopUrl(terms);
            expect(url).toContain('utm_source=digitalstylist');
            expect(url).toContain('utm_campaign=outfit_suggestion');
        }
    });
});
