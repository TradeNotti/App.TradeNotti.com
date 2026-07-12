import Sidebar from "@/components/Sidebar";
import { MobileNavProvider } from "@/components/MobileNav";
import RefreshOnReturn from "@/components/RefreshOnReturn";
import { TabsProvider } from "@/components/tabs/TabsProvider";
import TabBar from "@/components/tabs/TabBar";
import { ConfirmProvider } from "@/components/ConfirmDialog";
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
        <ConfirmProvider>
          <RefreshOnReturn />
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
              <TabBar />
              {children}
            </div>
          </div>
        </ConfirmProvider>
      </TabsProvider>
    </MobileNavProvider>
  );
}
