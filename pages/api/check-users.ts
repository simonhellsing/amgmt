import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create a server-side client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { emails } = req.body;

    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({ error: 'Emails array is required' });
    }

    // Check which users already exist
    const existingUsers = await Promise.all(
      emails.map(async (email: string) => {
        try {
          const { data: userData, error } = await supabaseAdmin.auth.admin.listUsers();
          const user = userData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase().trim());
          return { 
            email: email.toLowerCase().trim(), 
            exists: !!user,
            error: error?.message 
          };
        } catch (err) {
          console.error('Error checking user:', email, err);
          return { 
            email: email.toLowerCase().trim(), 
            exists: false,
            error: 'Failed to check user' 
          };
        }
      })
    );

    const existingEmails = existingUsers.filter(u => u.exists).map(u => u.email);
    const newEmails = existingUsers.filter(u => !u.exists).map(u => u.email);

    res.status(200).json({
      existingEmails,
      newEmails,
      details: existingUsers
    });
  } catch (error) {
    console.error('Error in check-users API:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to check users' });
  }
}
