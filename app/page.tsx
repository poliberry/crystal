import { redirect } from "next/navigation";
import { initialProfile } from "@/lib/initial-profile";
import { db } from "@/lib/db";

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

const HomePage = async () => {
  try {
    const profile = await initialProfile();
    
    const server = await db.server.findFirst({
      where: {
        members: {
          some: {
            profileId: profile.id,
          },
        },
      },
    });

    if (server) {
      redirect(`/servers/${server.id}`);
    } else {
      redirect("/setup");
    }
  } catch (error) {
    redirect("/sign-in");
  }
};

export default HomePage;
