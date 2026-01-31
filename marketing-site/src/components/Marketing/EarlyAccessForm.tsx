import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const COLORS = {
  blue: '#1E88E5',
  blueViolet: '#5E35B1',
};

interface EarlyAccessFormProps {
  onClose: () => void;
}

export function EarlyAccessForm({ onClose }: EarlyAccessFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    role: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // TODO: Replace with actual form submission (e.g., to Supabase, email service, etc.)
    console.log('Early access request:', formData);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    setSubmitted(true);
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="text-center">
            <div
              className="mx-auto mb-6 h-16 w-16 rounded-full flex items-center justify-center"
              style={{
                background: `linear-gradient(to right, ${COLORS.blue}, ${COLORS.blueViolet})`,
              }}
            >
              <svg
                className="h-8 w-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">You're on the list!</h2>
            <p className="text-gray-600">
              We'll be in touch soon with early access details and updates.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Early Access</h2>
        <p className="text-gray-600 mb-6">
          Be among the first to experience the future of warehouse management.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Work Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="john@company.com"
            />
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
              Company
            </label>
            <input
              type="text"
              id="company"
              name="company"
              required
              value={formData.company}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Acme Corp"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              id="role"
              name="role"
              required
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select your role</option>
              <option value="warehouse-manager">Warehouse Manager</option>
              <option value="operations">Operations</option>
              <option value="logistics">Logistics</option>
              <option value="it">IT/Technology</option>
              <option value="executive">Executive</option>
              <option value="other">Other</option>
            </select>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full text-white shadow-lg hover:opacity-90"
            style={{
              background: `linear-gradient(to right, ${COLORS.blue}, ${COLORS.blueViolet})`,
            }}
          >
            {loading ? 'Submitting...' : 'Request Access'}
          </Button>
        </form>
      </div>
    </div>
  );
}
