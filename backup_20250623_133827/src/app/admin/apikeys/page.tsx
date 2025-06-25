'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminApiKeysPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the main API keys page
    router.replace('/api-keys');
  }, [router]);
  
  return null;
}
