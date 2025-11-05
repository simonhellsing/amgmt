import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Spinner from '../components/Spinner';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // User is authenticated, redirect to home
        router.push('/home');
      } else {
        // User not authenticated, redirect to login
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen bg-[#121212]">
      <Spinner size="lg" />
    </div>
  );
}
