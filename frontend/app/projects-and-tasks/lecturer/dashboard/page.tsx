import { redirect } from 'next/navigation';

export default function LecturerDashboardRedirectPage() {
  redirect('/projects-and-tasks/lecturer');
}
