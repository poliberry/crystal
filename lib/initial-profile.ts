import { auth, currentUser, redirectToSignIn } from "@clerk/nextjs";

import { db } from "./db";

export const initialProfile = async () => {
  try {
    const user = await auth();

    if (!user)
      return redirectToSignIn();

    const profile = await db.profile.findUnique({
      where: {
        userId: user.userId as string,
      },
    });

    if (profile)
      return profile;

    const newProfile = await db.profile.create({
      data: {
        userId: user.userId as string,
        name: `${user.user?.username}`,
        imageUrl: `${user.user?.imageUrl}`,
        email: `${user.user?.emailAddresses[0].emailAddress}`,
      },
    });

    return newProfile;
  } catch (error) {
    console.error("Error in initialProfile:", error);
    throw error;
  }
};
