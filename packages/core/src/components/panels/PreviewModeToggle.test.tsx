import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PreviewModeToggle } from './PreviewModeToggle';

describe('PreviewModeToggle', () => {
  it('changes to live mode on click activation', () => {
    const onChange = vi.fn();

    render(<PreviewModeToggle value="screenshots" isDark={false} onChange={onChange} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Render live app or mockup previews where available' })
    );

    expect(onChange).toHaveBeenCalledWith('live');
  });

  it('changes back to screenshots mode on click activation', () => {
    const onChange = vi.fn();

    render(<PreviewModeToggle value="live" isDark={false} onChange={onChange} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Render saved screenshots and static surface images' })
    );

    expect(onChange).toHaveBeenCalledWith('screenshots');
  });

  it('does not re-emit the active mode', () => {
    const onChange = vi.fn();

    render(<PreviewModeToggle value="live" isDark={false} onChange={onChange} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Render live app or mockup previews where available' })
    );

    expect(onChange).not.toHaveBeenCalled();
  });

  it('labels the control as a preview render mode selector', () => {
    render(<PreviewModeToggle value="screenshots" isDark={false} onChange={() => {}} />);

    expect(screen.getByRole('group', { name: 'Preview render mode' })).toBeTruthy();
    expect(screen.getByText('Render')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Render saved screenshots and static surface images' })
    ).toBeTruthy();
  });
});
