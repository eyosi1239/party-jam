/**
 * Tests for JoinCodeModal — covers Fix #5 (join code error feedback)
 * and verifies the modal's existing error display and success path.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JoinCodeModal } from '../app/components/JoinCodeModal';

function setup(onJoin: (code: string) => Promise<void> = vi.fn().mockResolvedValue(undefined)) {
  const onClose = vi.fn();
  render(<JoinCodeModal isOpen onClose={onClose} onJoin={onJoin} />);
  return { onClose, onJoin };
}

describe('JoinCodeModal', () => {
  it('renders when isOpen=true', () => {
    setup();
    expect(screen.getByPlaceholderText('ABC123')).toBeInTheDocument();
  });

  it('does not render when isOpen=false', () => {
    render(<JoinCodeModal isOpen={false} onClose={vi.fn()} onJoin={vi.fn()} />);
    expect(screen.queryByPlaceholderText('ABC123')).not.toBeInTheDocument();
  });

  it('shows error when code is fewer than 6 chars', async () => {
    setup();
    const input = screen.getByPlaceholderText('ABC123');
    await userEvent.type(input, 'AB');
    await userEvent.click(screen.getByRole('button', { name: /join/i }));
    expect(await screen.findByText(/6 characters/i)).toBeInTheDocument();
  });

  it('calls onJoin with uppercased trimmed code', async () => {
    const onJoin = vi.fn().mockResolvedValue(undefined);
    setup(onJoin);
    await userEvent.type(screen.getByPlaceholderText('ABC123'), 'abc123');
    await userEvent.click(screen.getByRole('button', { name: /join/i }));
    await waitFor(() => expect(onJoin).toHaveBeenCalledWith('ABC123'));
  });

  it('displays error message from onJoin rejection (Fix #5)', async () => {
    const onJoin = vi.fn().mockRejectedValue(new Error('Invalid join code. Please check the code and try again.'));
    setup(onJoin);
    await userEvent.type(screen.getByPlaceholderText('ABC123'), 'ZZZZZZ');
    await userEvent.click(screen.getByRole('button', { name: /join/i }));
    expect(await screen.findByText(/Invalid join code/i)).toBeInTheDocument();
  });

  it('falls back to generic error message when rejection has no message', async () => {
    const onJoin = vi.fn().mockRejectedValue({});
    setup(onJoin);
    await userEvent.type(screen.getByPlaceholderText('ABC123'), 'AAAAAA');
    await userEvent.click(screen.getByRole('button', { name: /join/i }));
    expect(await screen.findByText(/Invalid code/i)).toBeInTheDocument();
  });

  it('calls onClose after successful join', async () => {
    const { onClose } = setup(vi.fn().mockResolvedValue(undefined));
    await userEvent.type(screen.getByPlaceholderText('ABC123'), 'VALID1');
    await userEvent.click(screen.getByRole('button', { name: /join/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('does NOT call onClose when join fails', async () => {
    const { onClose } = setup(vi.fn().mockRejectedValue(new Error('bad code')));
    await userEvent.type(screen.getByPlaceholderText('ABC123'), 'BADCOD');
    await userEvent.click(screen.getByRole('button', { name: /join/i }));
    await waitFor(() => screen.getByText(/bad code/i));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('submits on Enter key', async () => {
    const onJoin = vi.fn().mockResolvedValue(undefined);
    setup(onJoin);
    const input = screen.getByPlaceholderText('ABC123');
    await userEvent.type(input, 'ENTERR');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(onJoin).toHaveBeenCalledWith('ENTERR'));
  });
});
