'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    label?: string;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error(`[ErrorBoundary:${this.props.label ?? 'unknown'}]`, error, info.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;
            return (
                <div className="flex flex-col items-center justify-center gap-4 py-16 bg-white/5 border border-red-500/20 rounded-2xl text-center px-6">
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                    <div>
                        <p className="text-white font-bold">Une erreur est survenue</p>
                        <p className="text-gray-500 text-sm mt-1">
                            {this.props.label ? `Section : ${this.props.label}` : 'Quelque chose s\'est mal passé'}
                        </p>
                    </div>
                    <button
                        onClick={this.handleReset}
                        className="flex items-center gap-2 text-sm bg-white/10 hover:bg-white/15 px-4 py-2 rounded-full text-gray-300 transition-all"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Réessayer
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
