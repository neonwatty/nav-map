import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NavMapErrorBoundary } from './NavMapErrorBoundary';

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('test crash');
  return <div>healthy child</div>;
}

describe('NavMapErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error', () => {
    render(
      <NavMapErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </NavMapErrorBoundary>
    );
    expect(screen.getByText('healthy child')).toBeTruthy();
  });

  it('renders fallback UI when child throws', () => {
    render(
      <NavMapErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </NavMapErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeTruthy();
    expect(screen.queryByText('healthy child')).toBeNull();
  });

  it('shows the error message in the fallback', () => {
    render(
      <NavMapErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </NavMapErrorBoundary>
    );
    expect(screen.getByText(/test crash/i)).toBeTruthy();
  });

  it('calls onError when child rendering fails', () => {
    const onError = vi.fn();

    render(
      <NavMapErrorBoundary onError={onError}>
        <ThrowingChild shouldThrow={true} />
      </NavMapErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'test crash' }),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });
});
