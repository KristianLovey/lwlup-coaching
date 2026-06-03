'use client'
import React from 'react'

interface Props { children: React.ReactNode; fallback?: React.ReactNode; label?: string }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false, error: null } }

  static getDerivedStateFromError(error: Error): State { return { hasError: true, error } }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? ` (${this.props.label})` : ''}]`, error, info.componentStack)
  }

  reset = () => this.setState({ hasError: false, error: null })

  render() {
    if (!this.state.hasError) return this.props.children
    if (this.props.fallback) return this.props.fallback
    return (
      <div style={{ padding: '24px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', textAlign: 'center' }}>
        <div style={{ fontSize: '0.72rem', color: '#f87171', fontFamily: 'var(--fm)', marginBottom: '8px', letterSpacing: '0.08em' }}>
          {this.props.label ? `Greška u: ${this.props.label}` : 'Nešto je pošlo po zlu'}
        </div>
        <button onClick={this.reset} style={{ padding: '6px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem', cursor: 'pointer', fontFamily: 'var(--fm)' }}>
          Pokušaj ponovo
        </button>
      </div>
    )
  }
}
