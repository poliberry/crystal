import { redirect } from "next/navigation";
import { initialProfile } from "@/lib/initial-profile";
import { db } from "@/lib/db";
import { PathRestorer } from "@/components/path-restorer";

const HomePage = async () => {
  // First check if user is authenticated and has a profile
  try {
    const profile = await initialProfile();
    
    // Check if user has any servers
    const server = await db.server.findFirst({
      where: {
        members: {
          some: {
            profileId: profile.id,
          },
        },
      },
    });

    // If user has a server, let the client-side path restorer handle it
    // Otherwise redirect to setup
    if (!server) {
      redirect("/setup");
    }

    // Render the path restorer which will handle client-side navigation
    return <PathRestorer hasServer={!!server} serverId={server?.id} />;
  } catch (error) {
    // If not authenticated, redirect to sign-in
    redirect("/sign-in");
  }
};

export default HomePage;
