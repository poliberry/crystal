// This file provides a client-side wrapper for Convex
// It will be used to replace API calls with Convex hooks

import { ConvexReactClient } from "convex/react";

// Initialize Convex client
// The deployment URL should be set in environment variables
export const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL || ""
);

