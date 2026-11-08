'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  /** Raw source shown if rendering fails, so the reader never loses the content. */
  source: string;
  label: string;
  children: ReactNode;
}

/** Isolates failures of one diagram or equation so a syntax error never takes down the whole page. */
export class RenderBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn(`[RenderBoundary] ${this.props.label} failed`, error.message, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="rounded-lg border border-noise-line bg-noise-soft/40 p-3">
        <p className="mb-2 font-mono text-xs text-noise">
          Could not render {this.props.label} — showing source.
        </p>
        <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs text-ink/90">
          {this.props.source}
        </pre>
      </div>
    );
  }
}
