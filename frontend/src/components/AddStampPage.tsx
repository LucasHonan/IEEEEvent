import React, { useState } from 'react';

const API_BASE = 'http://localhost:8000';

const AddStampPage = () => {
  const [status, setStatus] = useState({ type: '', message: '' });
  // Holds the R2 URL after the image is uploaded, before the form is submitted
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Step 1: Upload the image file to R2 as soon as the user picks a file.
  // This calls POST /upload and stores the returned URL in state.
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setStatus({ type: '', message: '' });

    // FormData is how you send a file over HTTP — it's the same as a browser form submission
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setUploadedImageUrl(result.url); // Save the R2 URL for use on submit
      } else {
        setStatus({ type: 'error', message: 'Image upload failed. Check R2 settings.' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Could not reach server to upload image.' });
    } finally {
      setIsUploading(false);
    }
  };

  // Step 2: Submit the stamp record with the already-uploaded image URL
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus({ type: 'loading', message: 'Archiving stamp...' });

    const formData = new FormData(e.currentTarget);

    const data = {
      name: formData.get('name'),
      scott_number: formData.get('scott_number'),
      country: formData.get('country'),
      denomination: formData.get('denomination'),
      print_year: parseInt(formData.get('print_year') as string) || null,
      color: formData.get('color'),
      perforations: formData.get('perforations'),
      dimensions: formData.get('dimensions'),
      condition: formData.get('condition'),
      value: parseFloat(formData.get('value') as string) || 0,
      image_url: uploadedImageUrl, // Use the R2 URL from the upload step
      tags: (formData.get('tags') as string).split(',').map(tag => tag.trim()).filter(t => t !== ""),
    };

    try {
      const response = await fetch(`${API_BASE}/stamps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setStatus({ type: 'success', message: `Successfully added Scott #${data.scott_number}!` });
        setUploadedImageUrl('');
        (e.target as HTMLFormElement).reset();
      } else {
        const err = await response.json();
        setStatus({ type: 'error', message: `Error: ${err.detail || 'Failed to save'}` });
      }
    } catch {
      setStatus({ type: 'error', message: 'Server connection failed. Is Docker running?' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8 bg-white shadow-xl rounded-xl border border-gray-100">
      <header className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-blue-900">New Acquisition</h1>
        <p className="text-gray-500">Enter the technical details for the archive.</p>
      </header>
      
      {status.message && (
        <div className={`p-4 mb-6 rounded-lg font-medium ${
          status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : status.type === 'loading' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {status.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Group */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700">Stamp Name / Description</label>
            <input name="name" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2.5 border focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. Benjamin Franklin Z-Grill" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">Scott Number</label>
            <input name="scott_number" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2.5 border" placeholder="e.g. 138" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">Country</label>
            <input name="country" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2.5 border" placeholder="USA" />
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Technical Specs Group */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700">Year</label>
            <input name="print_year" type="number" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2.5 border" placeholder="1867" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">Denomination</label>
            <input name="denomination" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2.5 border" placeholder="1c" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">Color</label>
            <input name="color" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2.5 border" placeholder="Blue" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">Condition</label>
            <select name="condition" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2.5 border bg-white">
              <option>Mint Never Hinged</option>
              <option>Mint Hinged</option>
              <option>Used</option>
              <option>Unused</option>
              <option>On Cover</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">Perforations</label>
            <input name="perforations" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2.5 border" placeholder="11" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">Size (mm)</label>
            <input name="dimensions" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2.5 border" placeholder="20 x 24" />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-semibold text-gray-700">Market Value ($)</label>
            <input name="value" type="number" step="0.01" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2.5 border" placeholder="0.00" />
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Assets & Meta */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700">Stamp Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {/* Show upload status below the file picker */}
            {isUploading && <p className="mt-1 text-sm text-blue-600">Uploading to cloud...</p>}
            {uploadedImageUrl && <p className="mt-1 text-sm text-green-600">✓ Image uploaded successfully</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">Tags (comma separated)</label>
            <input name="tags" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2.5 border" placeholder="Rare, Grills, 19th Century" />
          </div>
        </div>

        <button type="submit" className="w-full bg-blue-700 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-800 transition-colors shadow-lg active:transform active:scale-95">
          Commit to Archive
        </button>
      </form>
    </div>
  );
};

export default AddStampPage;