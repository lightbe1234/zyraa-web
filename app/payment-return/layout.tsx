import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata('Payment Status', 'Check your ZYRA payment status.', '/payment-return', undefined, false);
export default function PaymentLayout({ children }: { children: ReactNode }) { return children; }
