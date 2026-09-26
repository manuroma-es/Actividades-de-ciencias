import type { Metadata } from 'next';
import { AdminClient } from './admin-client';

export const metadata: Metadata = { title: 'Administración | Actividades de repaso', robots: { index: false, follow: false } };

export default function AdminPage() { return <AdminClient />; }
