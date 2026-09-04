import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import axe from 'axe-core';
import PublicLayout from '@/app/(public)/layout';
import AuthenticatedLayout from '@/app/(auth)/layout';

describe('Automated Accessibility Checks', () => {
  it('public layout has no critical accessibility violations', async () => {
    const { container } = render(
      <PublicLayout>
        <h1>Public Landing</h1>
        <p>Accessible public content</p>
      </PublicLayout>
    );

    const results = await axe.run(container, {
      rules: {
        // In jsdom color-contrast cannot be reliably measured without full layout engine
        'color-contrast': { enabled: false },
      },
    });

    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toEqual([]);
  });

  it('authenticated layout has no critical accessibility violations', async () => {
    const { container } = render(
      <AuthenticatedLayout>
        <h1>Dashboard</h1>
        <p>Accessible workspace content</p>
      </AuthenticatedLayout>
    );

    const results = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false },
      },
    });

    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toEqual([]);
  });
});
