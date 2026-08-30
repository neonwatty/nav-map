// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { workflowCanvasV1Fixture } from './fixtures';
import { WorkflowCanvas } from './WorkflowCanvas';
import type { WorkflowCanvasV1 } from './types';

function fixture(): WorkflowCanvasV1 {
  return structuredClone(workflowCanvasV1Fixture);
}

describe('WorkflowCanvas', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders focused visual, semantic, decision, evidence, finding, and comparison content', () => {
    const { container } = render(
      <WorkflowCanvas document={fixture()} defaultSelectedNodeId="profile" />
    );
    expect(screen.getByRole('heading', { name: 'Privacy-safe onboarding review' })).toBeTruthy();
    expect(screen.getByText('Review incomplete')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Workflow steps' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Inspect Profile details' }));
    expect(screen.getByRole('heading', { name: 'Profile details' })).toBeTruthy();
    expect(screen.getAllByText('Mobile contrast').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Profile resolution review').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('Producer-supplied finding region').length).toBeGreaterThan(0);
    expect(container.querySelector('.workflow-canvas-graph')?.getAttribute('aria-hidden')).toBe(
      'true'
    );
    expect(container.querySelector('.workflow-canvas-graph button')).toBeNull();
    expect(
      [...container.querySelectorAll('.workflow-canvas-graph__connector')].map(element => [
        element.getAttribute('data-from-node-id'),
        element.getAttribute('data-to-node-id'),
      ])
    ).toEqual([
      ['welcome', 'profile'],
      ['profile', 'confirmation'],
    ]);
    expect(screen.queryByText('Route health')).toBeNull();
    expect(screen.queryByText('Export')).toBeNull();
  });

  it('shares uncontrolled selection between semantic steps and focused details', () => {
    const onChange = vi.fn();
    render(
      <WorkflowCanvas
        document={fixture()}
        defaultSelectedNodeId="welcome"
        onSelectedNodeChange={onChange}
      />
    );
    const steps = screen.getByRole('heading', { name: 'Workflow steps' }).closest('section')!;
    const profileStep = steps.querySelector<HTMLButtonElement>(
      '.workflow-canvas-step-button[data-node-id="profile"]'
    )!;
    fireEvent.click(profileStep);
    expect(onChange).toHaveBeenCalledWith('profile');
    expect(profileStep.getAttribute('aria-current')).toBe('step');
    expect(profileStep.getAttribute('aria-expanded')).toBe('true');
    expect(
      document.getElementById(profileStep.getAttribute('aria-controls')!)?.hasAttribute('hidden')
    ).toBe(false);
  });

  it('honors controlled selection without mutating it', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <WorkflowCanvas
        document={fixture()}
        selectedNodeId="welcome"
        onSelectedNodeChange={onChange}
      />
    );
    const steps = screen.getByRole('heading', { name: 'Workflow steps' }).closest('section')!;
    fireEvent.click(
      steps.querySelector<HTMLButtonElement>(
        '.workflow-canvas-step-button[data-node-id="confirmation"]'
      )!
    );
    expect(onChange).toHaveBeenCalledWith('confirmation');
    expect(
      steps
        .querySelector('.workflow-canvas-step-button[data-node-id="welcome"]')
        ?.getAttribute('aria-current')
    ).toBe('step');
    rerender(
      <WorkflowCanvas
        document={fixture()}
        selectedNodeId="confirmation"
        onSelectedNodeChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Inspect Confirmation' }));
    expect(screen.getByRole('heading', { name: 'Confirmation' })).toBeTruthy();
    expect(
      screen.getByText('The exact run ended before this checkpoint was captured.')
    ).toBeTruthy();
  });

  it('renders accessible structural errors and reports them', async () => {
    const onValidationError = vi.fn();
    const value = fixture();
    value.edges[0].toNodeId = 'unknown';
    render(<WorkflowCanvas document={value} onValidationError={onValidationError} />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Canvas unavailable' })).toBeTruthy();
    await waitFor(() => expect(onValidationError).toHaveBeenCalled());
  });

  it('rejects illegal controlled and uncontrolled selection props', async () => {
    const onValidationError = vi.fn();
    render(
      <WorkflowCanvas
        document={fixture()}
        selectedNodeId="welcome"
        defaultSelectedNodeId="profile"
        onSelectedNodeChange={vi.fn()}
        onValidationError={onValidationError}
      />
    );
    expect(screen.getByRole('heading', { name: 'Canvas unavailable' })).toBeTruthy();
    await waitFor(() =>
      expect(onValidationError).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ code: 'selection-mode' })])
      )
    );
  });

  it('keeps actions as anchors and allows interception', () => {
    const onAction = vi.fn((_action, event) => event.preventDefault());
    render(
      <WorkflowCanvas document={fixture()} defaultSelectedNodeId="profile" onAction={onAction} />
    );
    const workflowAction = screen.getByRole('link', { name: 'Review supplied findings' });
    expect(workflowAction.tagName).toBe('A');
    expect(workflowAction.getAttribute('href')).toBe('/workflow-review/open-findings');
    fireEvent.click(screen.getByRole('button', { name: 'Inspect Profile details' }));
    const link = screen.getByRole('link', { name: 'Inspect finding' });
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('/workflow-review/finding-demo-1');
    fireEvent.click(link);
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'finding-demo-1' }),
      expect.anything()
    );
  });

  it('renders supplied strings as plain text', () => {
    const value = fixture();
    value.nodes[0].label = '<img src=x onerror=alert(1)>';
    const { container } = render(
      <WorkflowCanvas document={value} defaultSelectedNodeId="welcome" />
    );
    expect(screen.getAllByText('<img src=x onerror=alert(1)>').length).toBeGreaterThan(0);
    expect(container.querySelector('img[src="x"]')).toBeNull();
  });

  it('traverses producer order, announces selection, inspects, closes, and returns focus', async () => {
    render(<WorkflowCanvas document={fixture()} defaultSelectedNodeId="welcome" />);
    const welcome = document.querySelector<HTMLButtonElement>(
      '.workflow-canvas-step-button[data-node-id="welcome"]'
    )!;
    welcome.focus();
    fireEvent.keyDown(welcome, { key: 'ArrowDown' });
    const profile = document.querySelector<HTMLButtonElement>(
      '.workflow-canvas-step-button[data-node-id="profile"]'
    )!;
    expect(document.activeElement).toBe(profile);
    expect(screen.getByText(/Selected step 2 of 3: Profile details/)).toBeTruthy();
    fireEvent.keyDown(profile, { key: ' ' });
    expect(screen.getByRole('complementary', { name: 'Profile details' })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close details' }));
    fireEvent.keyDown(screen.getByRole('complementary'), { key: 'Escape' });
    await waitFor(() => expect(document.activeElement).toBe(profile));
  });

  it('does not steal focus on mount and contains focus in a narrow modal', async () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private callback: ResizeObserverCallback) {}
        observe() {
          this.callback(
            [{ contentRect: { width: 393 } } as ResizeObserverEntry],
            this as unknown as ResizeObserver
          );
        }
        disconnect() {}
        unobserve() {}
      }
    );
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    render(<WorkflowCanvas document={fixture()} defaultSelectedNodeId="welcome" />);
    expect(document.activeElement).toBe(outside);
    const inspect = screen.getByRole('button', { name: 'Inspect Welcome' });
    fireEvent.click(inspect);
    const dialog = await screen.findByRole('dialog', { name: 'Welcome' });
    const close = screen.getByRole('button', { name: 'Close details' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).not.toBe(outside);
    fireEvent.click(close);
    await waitFor(() => expect(document.activeElement).toBe(inspect));
    outside.remove();
  });

  it('exposes complete semantic evidence, finding, and comparison truth with lazy images', () => {
    const { container } = render(
      <WorkflowCanvas document={fixture()} defaultSelectedNodeId="profile" />
    );
    expect(screen.getByText(/reference: Profile reference; availability stale/)).toBeTruthy();
    expect(screen.getByText(/Finding — Open:/)).toBeTruthy();
    expect(
      screen.getByText(/Left: Observation \(observation\). Right: Resolution \(resolution\)./)
    ).toBeTruthy();
    expect(
      [...container.querySelectorAll('img')].every(
        image =>
          image.getAttribute('loading') === 'lazy' && image.getAttribute('decoding') === 'async'
      )
    ).toBe(true);
  });

  it.each(['missing', 'unavailable', 'corrupt', 'disconnected'] as const)(
    'renders supplied %s evidence conservatively',
    availability => {
      const value = fixture();
      value.evidence[5].availability = availability;
      value.evidence[5].availabilityReason = `Producer supplied ${availability}.`;
      delete value.evidence[5].asset;
      render(<WorkflowCanvas document={value} defaultSelectedNodeId="confirmation" />);
      fireEvent.click(screen.getByRole('button', { name: 'Inspect Confirmation' }));
      expect(screen.getAllByText(`Producer supplied ${availability}.`).length).toBeGreaterThan(0);
      if (availability === 'corrupt')
        expect(screen.getByText('Corrupt evidence bytes are not rendered.')).toBeTruthy();
    }
  );
});
