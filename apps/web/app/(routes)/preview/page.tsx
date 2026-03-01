import { Suspense } from 'react';
import { PreviewClient } from '@/components/PreviewClient';

export default function PreviewPage() {
  return (
    <Suspense fallback={<main className="p-6 text-slate-200">Loading preview...</main>}>
      <PreviewClient />
    </Suspense>
  );
}
