import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PublicLayout from '@/app/(public)/layout';
import AuthenticatedLayout from '@/app/(auth)/layout';
import { QueryClientBoundary } from '@/lib/query-client';

describe('Application Layouts & Boundaries', () => {
  it('renders public layout with public navigation header and footer', () => {
    render(
      <PublicLayout>
        <div data-testid="public-content">Public Landing Screen</div>
      </PublicLayout>
    );

    expect(screen.getByTestId('public-content')).toBeDefined();
    expect(screen.getByText('VirtuJudge')).toBeDefined();
    expect(screen.getByLabelText('Public Navigation')).toBeDefined();
    expect(screen.getByRole('contentinfo')).toBeDefined();
  });

  it('renders authenticated layout with sidebar navigation and workspace context', () => {
    render(
      <AuthenticatedLayout>
        <div data-testid="auth-content">Authenticated Dashboard Screen</div>
      </AuthenticatedLayout>
    );

    expect(screen.getByTestId('auth-content')).toBeDefined();
    expect(screen.getByLabelText('Application Navigation')).toBeDefined();
    expect(screen.getByText('Workspace')).toBeDefined();
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('Teams')).toBeDefined();
    expect(screen.getByText('Projects')).toBeDefined();
  });

  it('proves public and authenticated pages have separate distinct layouts', () => {
    const { container: publicContainer } = render(
      <PublicLayout>
        <span>Content</span>
      </PublicLayout>
    );

    const { container: authContainer } = render(
      <AuthenticatedLayout>
        <span>Content</span>
      </AuthenticatedLayout>
    );

    // Public layout includes a header and footer
    expect(publicContainer.querySelector('header')).not.toBeNull();
    expect(publicContainer.querySelector('footer')).not.toBeNull();
    expect(publicContainer.querySelector('aside')).toBeNull();

    // Authenticated layout includes a sidebar aside
    expect(authContainer.querySelector('aside')).not.toBeNull();
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
