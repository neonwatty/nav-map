import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PreviewModeToggle } from './PreviewModeToggle';

describe('PreviewModeToggle', () => {
  it('changes to live mode on click activation', () => {
    const onChange = vi.fn();

    render(<PreviewModeToggle value="screenshots" isDark={false} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Use live previews where available' }));

    expect(onChange).toHaveBeenCalledWith('live');
  });

  it('changes to live mode on pointer activation without double firing click', () => {
    const onChange = vi.fn();
    const liveButtonName = 'Use live previews where available';

    render(<PreviewModeToggle value="screenshots" isDark={false} onChange={onChange} />);

    const liveButton = screen.getByRole('button', { name: liveButtonName });
    fireEvent.pointerDown(liveButton, { button: 0 });
    fireEvent.click(liveButton);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('live');
  });

  it('accepts pointer activation when the event omits a button value', () => {
    const onChange = vi.fn();

    render(<PreviewModeToggle value="screenshots" isDark={false} onChange={onChange} />);

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Use live previews where available' })
    );

    expect(onChange).toHaveBeenCalledWith('live');
  });

  it('changes to live mode on mouse activation', () => {
    const onChange = vi.fn();

    render(<PreviewModeToggle value="screenshots" isDark={false} onChange={onChange} />);

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Use live previews where available' }), {
      button: 0,
    });

    expect(onChange).toHaveBeenCalledWith('live');
  });

  it('does not re-emit the active mode', () => {
    const onChange = vi.fn();

    render(<PreviewModeToggle value="live" isDark={false} onChange={onChange} />);

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Use live previews where available' }),
      {
        button: 0,
      }
    );

    expect(onChange).not.toHaveBeenCalled();
  });
});
