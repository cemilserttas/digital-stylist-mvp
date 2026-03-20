import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '@/components/ErrorBoundary';

// Component that throws on demand
function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
    if (shouldThrow) throw new Error('Test error');
    return <div>OK</div>;
}

// Suppress console.error for expected throws
beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('ErrorBoundary', () => {
    it('renders children when no error', () => {
        render(
            <ErrorBoundary>
                <div>content</div>
            </ErrorBoundary>
        );
        expect(screen.getByText('content')).toBeInTheDocument();
    });

    it('shows fallback UI on error', () => {
        render(
            <ErrorBoundary label="Suggestions">
                <Bomb shouldThrow={true} />
            </ErrorBoundary>
        );
        expect(screen.getByText('Une erreur est survenue')).toBeInTheDocument();
        expect(screen.getByText(/Suggestions/)).toBeInTheDocument();
    });

    it('shows custom fallback when provided', () => {
        render(
            <ErrorBoundary fallback={<div>custom fallback</div>}>
                <Bomb shouldThrow={true} />
            </ErrorBoundary>
        );
        expect(screen.getByText('custom fallback')).toBeInTheDocument();
    });

    it('recovers after clicking Réessayer', () => {
        // Closure-controlled flag: change to false before clicking so next render doesn't throw
        let shouldThrow = true;
        function MaybeThrow() {
            if (shouldThrow) throw new Error('test');
            return <div>OK</div>;
        }

        render(<ErrorBoundary><MaybeThrow /></ErrorBoundary>);
        expect(screen.getByText('Une erreur est survenue')).toBeInTheDocument();

        shouldThrow = false;
        fireEvent.click(screen.getByText('Réessayer'));

        expect(screen.getByText('OK')).toBeInTheDocument();
    });
});
