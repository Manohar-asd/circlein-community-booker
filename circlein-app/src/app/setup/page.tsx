'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Key, CheckCircle } from 'lucide-react';

export default function SetupPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [accessCodes, setAccessCodes] = useState<string[]>([]);
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/init-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Admin user created and database initialized successfully!');
        setAccessCodes(data.data.accessCodes);
      } else {
        setError(data.error || 'Setup failed');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Settings className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">CircleIn Setup</CardTitle>
          <CardDescription>
            Initialize your CircleIn system with an admin account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Admin Full Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Enter admin full name"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Admin Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter admin email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Admin Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Create admin password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                <Settings className="mr-2 h-4 w-4" />
                {isLoading ? 'Setting up...' : 'Initialize System'}
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-600 mb-2">
                  Setup Complete!
                </h3>
                <p className="text-gray-600">
                  Your CircleIn system has been initialized successfully.
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Admin Account Created</h4>
                <p className="text-sm text-blue-700">
                  Email: {formData.email}
                </p>
                <p className="text-sm text-blue-700">
                  You can now sign in with these credentials.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                  <Key className="h-4 w-4 mr-2" />
                  Generated Access Codes
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  Share these codes with residents for registration:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {accessCodes.map((code, index) => (
                    <div
                      key={index}
                      className="bg-white p-2 rounded border text-center font-mono text-sm"
                    >
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center">
                <Button onClick={() => router.push('/')}>
                  Go to Login
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}