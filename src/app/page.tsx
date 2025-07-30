'use client';

import { useState } from 'react';
import { createClient } from '../../utils/supabase/client';

export default function AddNamePage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();

    const { data, error } = await supabase.from('names').insert([
      {
        first_name: firstName,
        last_name: lastName,
      },
    ]);

    if (error) {
      setMessage(`❌ Error: ${error.message}`);
    } else {
      setMessage('✅ Name added successfully!');
      setFirstName('');
      setLastName('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-xl shadow-md w-full max-w-sm">
        <h1 className="text-xl font-bold text-center">Add Your Name</h1>

        <input
          type="text"
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          className="w-full px-4 py-2 border rounded-md"
        />

        <input
          type="text"
          placeholder="Last Name (optional)"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="w-full px-4 py-2 border rounded-md"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          Submit
        </button>

        {message && <p className="text-sm text-center mt-2">{message}</p>}
      </form>
    </div>
  );
}
