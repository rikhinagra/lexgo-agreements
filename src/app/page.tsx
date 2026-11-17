import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/session";

export default async function Home() {
  redirect((await getCurrentAdmin()) ? "/admin/mous" : "/login");
}
