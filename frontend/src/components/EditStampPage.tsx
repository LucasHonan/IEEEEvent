import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

const API_BASE = 'http://localhost:8000';

const EditStampPage = () => {
  const { country, scott_number } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = `/?country=${encodeURIComponent(searchParams.get('country') ?? country ?? '')}&page=${searchParams.get('page') ?? '0'}`;
  const [formData, setFormData] = useState<any>(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const uploadForm = new FormData();
    uploadForm.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/upload`, { method: 'POST', body: uploadForm });
      if (response.ok) {
        const result = await response.json();
        // Update formData directly so the preview refreshes and the new URL gets saved on submit
        setFormData({ ...formData, image_url: result.url });
      } else {
        setStatus({ type: 'error', message: 'Image upload failed. Check R2 settings.' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Could not reach server to upload image.' });
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    console.log(`Fetching data for stamp: ${country} - ${scott_number}`);
    fetch(`http://localhost:8000/stamps/${country}/${scott_number}`)
      .then(res => res.json())
      .then(data => setFormData({ ...data, value: data.value != null ? Number(data.value).toFixed(2) : '' }))
      .catch(() => setStatus({ type: 'error', message: 'Could not load stamp data.' }));
  }, [country, scott_number]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'value' ? value : type === 'number' ? parseFloat(value) : value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: 'loading', message: 'Updating archive...' });

    try {
      const response = await fetch(`http://localhost:8000/stamps/${country}/${scott_number}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setStatus({ type: 'success', message: 'Stamp updated successfully!' });
        setTimeout(() => navigate(returnUrl), 1500);
      } else {
        setStatus({ type: 'error', message: 'Failed to update. Check server logs.' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Server error connection failed.' });
    }
  };

  if (!formData) return <div className="p-10 text-center">Loading stamp details...</div>;

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white shadow-xl rounded-2xl my-10">
      <h1 className="text-3xl font-bold mb-6 text-blue-900 border-b pb-4">Edit Stamp: {scott_number}</h1>
      
      {status.message && (
        <div className={`p-4 mb-6 rounded-lg font-semibold ${status.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {status.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Basic Information */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">Stamp Name / Description</label>
            <input name="name" value={formData.name || ''} onChange={handleChange} className="w-full border-2 p-3 rounded-lg focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">Year</label>
            <input type="number" name="print_year" value={formData.print_year || ''} onChange={handleChange} className="w-full border-2 p-3 rounded-lg focus:border-blue-500 outline-none" />
          </div>
        </section>

        {/* Section 2: Philatelic Details */}
        <section className="bg-gray-50 p-6 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-600">Scott Number</label>
            <input name="scott_number" value={formData.scott_number || ''} onChange={handleChange} className="w-full border p-2 rounded bg-white" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-600">Denomination</label>
            <input name="denomination" value={formData.denomination || ''} onChange={handleChange} placeholder="e.g. 5c or 1s" className="w-full border p-2 rounded bg-white" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-600">Condition</label>
            <select name="condition" value={formData.condition || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2.5 border bg-white">
              <option>Mint Never Hinged</option>
              <option>Mint Hinged</option>
              <option>Used</option>
              <option>Unused</option>
              <option>On Cover</option>
            </select>
          </div>
        </section>

        {/* Section 3: Physical & Value */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="font-bold text-blue-800">Physical Attributes</h3>
            <div className="grid grid-cols-2 gap-4">
              <input name="color" placeholder="Color" value={formData.color || ''} onChange={handleChange} className="border p-2 rounded w-full" />
              <input name="perforations" placeholder="Perforations" value={formData.perforations || ''} onChange={handleChange} className="border p-2 rounded w-full" />
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-bold text-blue-800">Market Value</h3>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">$</span>
              <input type="text" name="value" value={formData.value ?? ''} onChange={handleChange} className="border p-2 rounded w-full" />
            </div>
          </div>
        </section>

        {/* Section 4: Image Management */}
        <section className="border-t pt-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">Stamp Image</label>
          <div className="flex gap-4 items-center">
            <div className="flex-1 space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {isUploading && <p className="text-sm text-blue-600">Uploading to cloud...</p>}
              {!isUploading && formData.image_url && <p className="text-sm text-green-600">✓ Image ready</p>}
            </div>
            {formData.image_url && (
              <div className="w-16 h-16 border rounded overflow-hidden bg-gray-100 shrink-0">
                <img
                  src={formData.image_url?.startsWith('http') ? formData.image_url : `${API_BASE}/images/${formData.image_url}`}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </section>

        <div className="flex gap-4">
          <button type="button" onClick={() => navigate(returnUrl)} className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl font-bold hover:bg-gray-50 transition-all">
            Cancel
          </button>
          <button type="submit" className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 hover:shadow-blue-200 transition-all">
            Save Changes to Archive
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditStampPage;