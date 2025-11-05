import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid organization ID' });
  }

  // Get the authenticated user
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Create a Supabase client with service role for admin operations
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  
  // Verify the user's token
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    // Get organization details
    const { data: organization, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(organization);
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    // Check if user has full access to this organization
    // Using service role to bypass RLS since we're checking permissions manually
    const { data: accessGrant } = await supabaseAdmin
      .from('access_grants')
      .select('access_level')
      .eq('resource_type', 'organization')
      .eq('resource_id', id)
      .eq('user_id', user.id)
      .eq('access_level', 'full')
      .eq('is_active', true)
      .single();

    if (!accessGrant) {
      return res.status(403).json({ 
        error: 'You do not have permission to update this organization'
      });
    }

    // Update organization
    const { name, image_url } = req.body;

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name;
    if (image_url !== undefined) updates.image_url = image_url;

    const { data: updatedOrg, error } = await supabaseAdmin
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(updatedOrg);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

