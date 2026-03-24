/* eslint-disable no-var */
declare var global: typeof globalThis;
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EditStampPage from '../components/EditStampPage';

const mockStamp = {
  name: 'Penny Black',
  scott_number: '1',
  country: 'Great Britain',
  denomination: '1d',
  print_year: 1840,
  color: 'Black',
  perforations: '',
  condition: 'Used',
  value: 0.30,
  image_url: 'https://example.com/penny-black.jpg',
  tags: ['classic', 'rare'],
};

const renderEditPage = () =>
  render(
    <MemoryRouter initialEntries={['/edit/Great Britain/1']}>
      <Routes>
        <Route path="/edit/:country/:scott_number" element={<EditStampPage />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => mockStamp,
  });
});

describe('EditStampPage - tag editing', () => {
  it('displays existing tags when the form loads', async () => {
    renderEditPage();
    await waitFor(() => expect(screen.getByText('classic')).toBeInTheDocument());
    expect(screen.getByText('rare')).toBeInTheDocument();
  });

  it('adds a new tag when the Add button is clicked', async () => {
    renderEditPage();
    await waitFor(() => screen.getByPlaceholderText('Add a tag...'));

    fireEvent.change(screen.getByPlaceholderText('Add a tag...'), { target: { value: 'victoria' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('victoria')).toBeInTheDocument();
  });

  it('adds a new tag when Enter is pressed', async () => {
    renderEditPage();
    await waitFor(() => screen.getByPlaceholderText('Add a tag...'));

    const input = screen.getByPlaceholderText('Add a tag...');
    fireEvent.change(input, { target: { value: 'penny' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByText('penny')).toBeInTheDocument();
  });

  it('does not add a duplicate tag', async () => {
    renderEditPage();
    await waitFor(() => screen.getByPlaceholderText('Add a tag...'));

    fireEvent.change(screen.getByPlaceholderText('Add a tag...'), { target: { value: 'classic' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getAllByText('classic')).toHaveLength(1);
  });

  it('does not add a blank tag', async () => {
    renderEditPage();
    await waitFor(() => screen.getByPlaceholderText('Add a tag...'));

    const tagsBefore = screen.getAllByText('×').length;
    fireEvent.change(screen.getByPlaceholderText('Add a tag...'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getAllByText('×')).toHaveLength(tagsBefore);
  });

  it('removes a tag when × is clicked', async () => {
    renderEditPage();
    await waitFor(() => screen.getByText('classic'));

    // Find the × button next to 'classic'
    const classicChip = screen.getByText('classic').closest('span')!;
    const removeButton = classicChip.querySelector('button')!;
    fireEvent.click(removeButton);

    expect(screen.queryByText('classic')).not.toBeInTheDocument();
    expect(screen.getByText('rare')).toBeInTheDocument(); // other tag untouched
  });

  it('clears the input after adding a tag', async () => {
    renderEditPage();
    await waitFor(() => screen.getByPlaceholderText('Add a tag...'));

    const input = screen.getByPlaceholderText('Add a tag...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'newTag' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(input.value).toBe('');
  });
});

describe('EditStampPage - image upload', () => {
  it('shows uploading message while the upload is in progress', async () => {
    // First call loads the stamp; second call (upload) is a promise we control
    let resolveUpload!: (value: unknown) => void;
    const uploadPromise = new Promise(resolve => { resolveUpload = resolve; });

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockStamp }) // stamp load
      .mockReturnValueOnce(uploadPromise); // upload — held open

    renderEditPage();
    await waitFor(() => screen.getByDisplayValue('Penny Black'));

    const file = new File(['image data'], 'stamp.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText('Uploading to cloud...')).toBeInTheDocument();

    // Resolve the upload so we don't leave dangling promises
    await act(async () => {
      resolveUpload({ ok: true, json: async () => ({ url: 'https://r2.example.com/stamp.jpg' }) });
      await uploadPromise;
    });
  });

  it('shows image ready message after a successful upload', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockStamp })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://r2.example.com/stamp.jpg' }) });

    renderEditPage();
    await waitFor(() => screen.getByDisplayValue('Penny Black'));

    const file = new File(['image data'], 'stamp.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText('✓ Image ready')).toBeInTheDocument();
  });

  it('updates the image preview with the new URL after upload', async () => {
    const newUrl = 'https://r2.example.com/new-stamp.jpg';
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockStamp })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ url: newUrl }) });

    renderEditPage();
    await waitFor(() => screen.getByDisplayValue('Penny Black'));

    const file = new File(['image data'], 'stamp.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      const img = screen.getByAltText('Preview') as HTMLImageElement;
      expect(img.src).toBe(newUrl);
    });
  });

  it('shows an error message when the upload fails', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockStamp })
      .mockResolvedValueOnce({ ok: false });

    renderEditPage();
    await waitFor(() => screen.getByDisplayValue('Penny Black'));

    const file = new File(['image data'], 'stamp.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText('Image upload failed. Check R2 settings.')).toBeInTheDocument();
  });
});

describe('EditStampPage - image upload edge cases', () => {
  it('shows an error message when the network request fails', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockStamp })
      .mockRejectedValueOnce(new Error('Network error'));

    renderEditPage();
    await waitFor(() => screen.getByDisplayValue('Penny Black'));

    const file = new File(['image data'], 'stamp.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText('Could not reach server to upload image.')).toBeInTheDocument();
  });
});

describe('EditStampPage - stamp with no tags', () => {
  it('loads without crashing when the stamp has no tags', async () => {
    const stampWithNoTags = { ...mockStamp, tags: undefined };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => stampWithNoTags });

    renderEditPage();
    await waitFor(() => screen.getByDisplayValue('Penny Black'));

    expect(screen.getByPlaceholderText('Add a tag...')).toBeInTheDocument();
    expect(document.querySelectorAll('.rounded-full')).toHaveLength(0);
  });

  it('can add a tag when the stamp starts with no tags', async () => {
    const stampWithNoTags = { ...mockStamp, tags: undefined };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => stampWithNoTags });

    renderEditPage();
    await waitFor(() => screen.getByPlaceholderText('Add a tag...'));

    fireEvent.change(screen.getByPlaceholderText('Add a tag...'), { target: { value: 'firsttag' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('firsttag')).toBeInTheDocument();
  });
});

describe('EditStampPage - form loading', () => {
  it('populates the condition dropdown with the saved value', async () => {
    renderEditPage();
    await waitFor(() => screen.getByDisplayValue('Used'));
    expect(screen.getByDisplayValue('Used')).toBeInTheDocument();
  });

  it('populates the stamp name field', async () => {
    renderEditPage();
    await waitFor(() => screen.getByDisplayValue('Penny Black'));
    expect(screen.getByDisplayValue('Penny Black')).toBeInTheDocument();
  });

  it('formats the value to 2 decimal places', async () => {
    renderEditPage();
    await waitFor(() => screen.getByDisplayValue('0.30'));
    expect(screen.getByDisplayValue('0.30')).toBeInTheDocument();
  });
});
