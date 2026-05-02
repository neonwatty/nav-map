import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToolbarMoreMenu } from './ToolbarMoreMenu';

describe('ToolbarMoreMenu', () => {
  it('exposes an accessible label for the icon-only trigger', () => {
    const onToggleOpen = vi.fn();
    render(
      <ToolbarMoreMenu
        isDark={false}
        refObject={createRef<HTMLDivElement>()}
        isOpen={false}
        hasAnalytics={false}
        showAnalytics={false}
        showRouteHealth={false}
        onToggleOpen={onToggleOpen}
        onClose={vi.fn()}
        onToggleAnalytics={vi.fn()}
        onToggleRouteHealth={vi.fn()}
        onHelp={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'More options' }));

    expect(onToggleOpen).toHaveBeenCalledOnce();
  });
});
