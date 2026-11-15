import {requireAdmin} from '@/lib/auth';
import Sidebar from './Sidebar';
import '../admin.css';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Shlvy Admin', robots: {index: false}};

export default async function PanelLayout({children}: {children: React.ReactNode}) {
  await requireAdmin();
  return (
    <div className="adm">
      <Sidebar />
      <main className="adm-main">{children}</main>
    </div>
  );
}
