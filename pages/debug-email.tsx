import { useState } from 'react';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';

export default function DebugEmailPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testDirectEmail = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      setResult(data);
      console.log('Test email result:', data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
      console.error('Test email error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testInviteFlow = async () => {
    setLoading(true);
    try {
      // First, create a test access grant
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: grant, error: grantError } = await supabase
        .from('access_grants')
        .insert({
          resource_type: 'artist',
          resource_id: 'test-artist-id',
          email: email,
          access_level: 'view',
          granted_by: user?.id,
          user_id: null,
          granted_at: new Date().toISOString(),
          invited_at: new Date().toISOString(),
          is_active: true
        })
        .select()
        .single();

      if (grantError) {
        throw grantError;
      }

      console.log('Created test grant:', grant);

      // Now test the send-invite API
      const response = await fetch('/api/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessGrantId: grant.id,
          resourceType: 'artist',
          resourceId: 'test-artist-id',
          resourceName: 'Test Artist',
          resourceDescription: 'Test artist for debugging',
          inviterEmail: user?.email,
        }),
      });

      const data = await response.json();
      setResult(data);
      console.log('Send invite result:', data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
      console.error('Test invite flow error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Email Debug Page</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email to test:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
              placeholder="test@example.com"
            />
          </div>

          <div className="space-y-2">
            <Button
              onClick={testDirectEmail}
              loading={loading}
              disabled={!email}
              variant="primary"
            >
              Test Direct Email API
            </Button>

            <Button
              onClick={testInviteFlow}
              loading={loading}
              disabled={!email}
              variant="secondary"
            >
              Test Full Invite Flow
            </Button>
          </div>

          {result && (
            <div className="mt-6 p-4 bg-gray-800 rounded">
              <h3 className="font-medium mb-2">Result:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
