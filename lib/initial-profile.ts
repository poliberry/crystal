import { auth, currentUser, redirectToSignIn } from "@clerk/nextjs";

import { db } from "./db";

export const initialProfile = async () => {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId)
      return redirectToSignIn();

    const profile = await db.profile.findUnique({
      where: {
        userId: userId as string,
      },
    });

    if (profile)
      return profile;

    const newProfile = await db.profile.create({
      data: {
        userId: userId,
        name: `${user?.username}`,
        imageUrl: `${user?.imageUrl}`,
        email: `${user?.emailAddresses[0].emailAddress}`,
      },
    });

    return newProfile;
  } catch (error) {
    console.error("Error in initialProfile:", error);
    throw error;
  }
};
