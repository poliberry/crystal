import { redirect } from "next/navigation";

import { InitialModal } from "@/components/modals/initial-modal";
import { db } from "@/lib/db";
import { initialProfile } from "@/lib/initial-profile";

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SetupPage = async () => {
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

    if (server) redirect(`/servers/${server.id}`);

    return <InitialModal />;
  } catch (error) {
    console.error("Setup page error:", error);
    // Redirect to sign-in if there's an authentication error
    redirect("/sign-in");
  }
};

export default SetupPage;
