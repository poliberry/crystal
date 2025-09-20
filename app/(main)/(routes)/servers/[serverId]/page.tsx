import { redirectToSignIn } from "@clerk/nextjs";

import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

type ServerIdPageProps = {
  params: {
    serverId: string;
  };
};

const ServerIdPage = async ({ params }: ServerIdPageProps) => {
  const profile = await currentProfile();

  if (!profile) return redirectToSignIn();

  const server = await db.server.findFirst({
    id: params.serverId,
  });

  const initialChannel = await db.channel.findMany({
    serverId: params.serverId,
  }).then(channels => channels[0]); // Get the first channel

  redirect(`/servers/${params.serverId}/channels/${initialChannel?.id}`);
};

export default ServerIdPage;
