import { auth } from "@clerk/nextjs";

import { db } from "./db";

export const currentProfile = async () => {
  const { userId, user } = auth();

  if (!userId) return null;

  const profile = await db.profile.findUnique({
    where: {
      userId,
    },
  });

  if(!profile) {
    const newProfile = await db.profile.create({
      data: {
        userId,
        name: user?.username || "Unnamed",
        email: user?.emailAddresses[0]?.emailAddress || "",
        imageUrl: user?.imageUrl || "",
      },
    });
    return newProfile;
  } else {
    return profile;
  }
};
