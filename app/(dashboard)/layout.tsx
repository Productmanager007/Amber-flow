import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { supabase } from "@/lib/supabase";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authSupabase = await createClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  
  let fullName = "Manu Sharma";
  const userEmail = user?.email || "manu@amberstudent.com";
  
  if (userEmail) {
    const { data: teamMember } = await supabase.from('team_members').select('name').eq('email', userEmail).single();
    if (teamMember?.name) {
      fullName = teamMember.name;
    }
  }

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header userName={fullName} />
        <main className="flex-1 overflow-y-auto px-8 pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
