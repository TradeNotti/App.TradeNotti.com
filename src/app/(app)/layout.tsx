import Sidebar from "@/components/Sidebar";
import { MobileNavProvider } from "@/components/MobileNav";
import RefreshOnReturn from "@/components/RefreshOnReturn";
import { TabsProvider } from "@/components/tabs/TabsProvider";
import TabBar from "@/components/tabs/TabBar";
import TabTracker from "@/components/tabs/TabTracker";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return (
    <MobileNavProvider>
      <TabsProvider>
        <RefreshOnReturn />
        <TabTracker />
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
            <TabBar />
            {children}
          </div>
        </div>
      </TabsProvider>
    </MobileNavProvider>
  );
}
