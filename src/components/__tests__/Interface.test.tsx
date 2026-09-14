import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { DialogOverlay } from '../ui/DialogOverlay';
import { DialogProvider } from '../ui/DialogProvider';
import { useDialogs } from '../ui/DialogContext';
import { FormatPicker } from '../ui/FormatPicker';
import { ExportModal } from '../modals/ExportModal';
import { EmptyWorkspace } from '../EmptyWorkspace';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('shared interface system', () => {
  it('closes only the topmost dialog on Escape', () => {
    const outer = vi.fn(),
      inner = vi.fn();
    const { rerender } = render(
      <DialogOverlay label='Outer' onClose={outer}>
        <div>Outer</div>
      </DialogOverlay>
    );
    rerender(
      <DialogOverlay label='Outer' onClose={outer}>
        <div>
          Outer
          <DialogOverlay label='Inner' onClose={inner}>
            <div>Inner</div>
          </DialogOverlay>
        </div>
      </DialogOverlay>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(inner).toHaveBeenCalledOnce();
    expect(outer).not.toHaveBeenCalled();
  });
  it('does not close when clicking inside the panel', () => {
    const close = vi.fn();
    render(
      <DialogOverlay label='Dialog' onClose={close}>
        <div>
          <button>Inside</button>
        </div>
      </DialogOverlay>
    );
    fireEvent.mouseDown(screen.getByText('Inside'));
    expect(close).not.toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByRole('dialog'));
    expect(close).toHaveBeenCalledOnce();
  });
  it('restores scroll lock when closed', () => {
    const { unmount } = render(
      <DialogOverlay label='Dialog' onClose={() => {}}>
        <div />
      </DialogOverlay>
    );
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });
  it('supports keyboard selection of export formats', async () => {
    function Picker() {
      const [value, setValue] = useState<'txt' | 'json'>('txt');
      return <FormatPicker value={value} onChange={setValue} />;
    }
    render(<Picker />);
    const txt = screen.getByRole('radio', { name: /Text/ });
    txt.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: /JSON/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /JSON/ })).toHaveFocus();
  });
  it('keeps export busy until the actual promise resolves', async () => {
    let resolve!: () => void;
    const onExport = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        })
    );
    const close = vi.fn();
    render(<ExportModal isOpen onClose={close} onExport={onExport} t={(key) => key} />);
    await userEvent.click(screen.getByRole('button', { name: 'uiDownload' }));
    expect(screen.getByRole('button', { name: 'uiExporting' })).toBeDisabled();
    expect(close).not.toHaveBeenCalled();
    resolve();
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
  });
  it('shows export errors inside the dialog', async () => {
    render(
      <ExportModal
        isOpen
        onClose={() => {}}
        onExport={async () => {
          throw new Error('Failed');
        }}
        t={(key) => key}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'uiDownload' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('exportFailed');
  });
  it('offers filter reset rather than misleading import advice', async () => {
    const reset = vi.fn();
    render(<EmptyWorkspace filtered onReset={reset} onImport={() => {}} onCreate={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'uiResetFilters' }));
    expect(reset).toHaveBeenCalledOnce();
    expect(screen.queryByText('uiDropHint')).not.toBeInTheDocument();
  });
  it('resolves an in-app confirmation without native browser dialogs', async () => {
    const resolved = vi.fn();
    function Launcher() {
      const { confirm } = useDialogs();
      return <button onClick={async () => resolved(await confirm('Delete?'))}>Open</button>;
    }
    render(
      <DialogProvider>
        <Launcher />
      </DialogProvider>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await userEvent.click(screen.getByRole('button', { name: 'uiConfirm' }));
    await waitFor(() => expect(resolved).toHaveBeenCalledWith(true));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('returns null when an in-app prompt is cancelled', async () => {
    const resolved = vi.fn();
    function Launcher() {
      const { prompt } = useDialogs();
      return <button onClick={async () => resolved(await prompt('Name?', 'Preset'))}>Open</button>;
    }
    render(
      <DialogProvider>
        <Launcher />
      </DialogProvider>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await userEvent.click(screen.getByRole('button', { name: 'cancel' }));
    await waitFor(() => expect(resolved).toHaveBeenCalledWith(null));
  });
});
