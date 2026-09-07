import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PublicLayout from '@/app/(public)/layout';
import AuthenticatedLayout from '@/app/(auth)/layout';
import { QueryClientBoundary } from '@/lib/query-client';

describe('Application Layouts & Boundaries', () => {
  it('renders public layout with main container and children', () => {
    render(
      <PublicLayout>
        <div data-testid="public-content">Public Landing Screen</div>
      </PublicLayout>
    );

    expect(screen.getByTestId('public-content')).toBeDefined();
    expect(screen.getByText('Public Landing Screen')).toBeDefined();
  });

  it('renders authenticated layout with children', () => {
    render(
      <AuthenticatedLayout>
        <div data-testid="auth-content">Authenticated Dashboard Screen</div>
      </AuthenticatedLayout>
    );

    expect(screen.getByTestId('auth-content')).toBeDefined();
    expect(screen.getByText('Authenticated Dashboard Screen')).toBeDefined();
  });

  it('proves public and authenticated pages render their respective layout structures', () => {
    const { container: publicContainer } = render(
      <PublicLayout>
        <span>Public Content</span>
      </PublicLayout>
    );

    const { container: authContainer } = render(
      <AuthenticatedLayout>
        <span>Auth Content</span>
      </AuthenticatedLayout>
    );

    // Public layout wraps content in a main element
    expect(publicContainer.querySelector('main')).not.toBeNull();
    expect(authContainer.querySelector('main')).toBeNull();
  });

  it('renders children within QueryClientBoundary without error', () => {
    render(
      <QueryClientBoundary>
        <div data-testid="query-boundary-child">Query Client Ready</div>
      </QueryClientBoundary>
    );

    expect(screen.getByTestId('query-boundary-child')).toBeDefined();
  });
});
