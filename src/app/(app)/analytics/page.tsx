import { redirect } from "next/navigation";

// Analytics was merged into the Dashboard (home). Keep this route as a redirect
// so old links, tabs, and bookmarks still land somewhere sensible.
export default function AnalyticsPage() {
  redirect("/today");
}
