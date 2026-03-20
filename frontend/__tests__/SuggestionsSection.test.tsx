import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SuggestionsSection from '@/components/SuggestionsSection';
import type { Suggestion } from '@/lib/types';

const mockSuggestions: Suggestion[] = [
    {
        titre: 'Look Casual',
        description: 'Parfait pour le week-end',
        occasion: 'Week-end',
        pieces: [
            { type: 'Jean', marque: 'Levi\'s', prix: 89.99, lien_recherche: 'jean slim levis' },
            { type: 'T-shirt', marque: 'Uniqlo', prix: 19.99, lien_recherche: 'tshirt uniqlo' },
        ],
    },
];

describe('SuggestionsSection', () => {
    it('shows loading spinner when loading and no suggestions', () => {
        render(
            <SuggestionsSection
                suggestions={[]}
                loading={true}
                onRefresh={vi.fn()}
                onProductClick={vi.fn()}
            />
        );
        expect(screen.getByText(/styliste IA prépare/)).toBeInTheDocument();
    });

    it('renders suggestions correctly', () => {
        render(
            <SuggestionsSection
                suggestions={mockSuggestions}
                loading={false}
                onRefresh={vi.fn()}
                onProductClick={vi.fn()}
            />
        );
        expect(screen.getByText('Look Casual')).toBeInTheDocument();
        expect(screen.getByText('Jean')).toBeInTheDocument();
        expect(screen.getByText("Levi's")).toBeInTheDocument();
        expect(screen.getByText('89.99€')).toBeInTheDocument();
    });

    it('computes correct total', () => {
        render(
            <SuggestionsSection
                suggestions={mockSuggestions}
                loading={false}
                onRefresh={vi.fn()}
                onProductClick={vi.fn()}
            />
        );
        expect(screen.getByText('109.98€')).toBeInTheDocument();
    });

    it('calls onRefresh when button clicked', () => {
        const onRefresh = vi.fn();
        render(
            <SuggestionsSection
                suggestions={[]}
                loading={false}
                onRefresh={onRefresh}
                onProductClick={vi.fn()}
            />
        );
        fireEvent.click(screen.getByText('Nouvelles suggestions'));
        expect(onRefresh).toHaveBeenCalledOnce();
    });

    it('calls onProductClick when Acheter clicked', () => {
        const onProductClick = vi.fn();
        render(
            <SuggestionsSection
                suggestions={mockSuggestions}
                loading={false}
                onRefresh={vi.fn()}
                onProductClick={onProductClick}
            />
        );
        fireEvent.click(screen.getAllByText('Acheter')[0]);
        expect(onProductClick).toHaveBeenCalledWith(mockSuggestions[0].pieces[0]);
    });

    it('disables refresh button when loading', () => {
        render(
            <SuggestionsSection
                suggestions={mockSuggestions}
                loading={true}
                onRefresh={vi.fn()}
                onProductClick={vi.fn()}
            />
        );
        expect(screen.getByText('Nouvelles suggestions').closest('button')).toBeDisabled();
    });
});
