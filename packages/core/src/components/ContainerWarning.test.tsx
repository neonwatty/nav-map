import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ContainerWarning } from './ContainerWarning';

describe('ContainerWarning', () => {
  it('shows warning when container has zero height', async () => {
    vi.stubGlobal(
      'ResizeObserver',
      vi.fn(function (this: unknown, cb: ResizeObserverCallback) {
        setTimeout(() =>
          cb(
            [{ contentRect: { width: 800, height: 0 } } as ResizeObserverEntry],
            {} as ResizeObserver
          )
        );
        return { observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() };
      })
    );

    render(
      <ContainerWarning>
        <div>child content</div>
      </ContainerWarning>
    );

    await waitFor(() => {
      expect(screen.getByText(/container has no height/i)).toBeTruthy();
    });
  });

  it('does not show warning when container has valid dimensions', async () => {
    vi.stubGlobal(
      'ResizeObserver',
      vi.fn(function (this: unknown, cb: ResizeObserverCallback) {
        setTimeout(() =>
          cb(
            [{ contentRect: { width: 800, height: 600 } } as ResizeObserverEntry],
            {} as ResizeObserver
          )
        );
        return { observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() };
      })
    );

    render(
      <ContainerWarning>
        <div>child content</div>
      </ContainerWarning>
    );

    await waitFor(() => {
      expect(screen.queryByText(/container has no height/i)).toBeNull();
    });
  });

  it('always renders children', () => {
    vi.stubGlobal(
      'ResizeObserver',
      vi.fn(function (this: unknown) {
        return { observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() };
      })
    );

    render(
      <ContainerWarning>
        <div>child content</div>
      </ContainerWarning>
    );

    expect(screen.getByText('child content')).toBeTruthy();
  });
});
