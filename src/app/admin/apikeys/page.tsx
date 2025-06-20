'use client';

import { useRouter } from 'next/navigation';

export default function AdminApiKeysPage() {
  const router = useRouter();
  
  // Redirect to the main API keys page
  router.replace('/api-keys');
  
  return null;
}