"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { cn } from "@/lib/utils";
import Image from "next/image";

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function SignInPage() {
  const router = useRouter();
  const signInMutation = useMutation(api.auth.signIn);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof signInSchema>) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await signInMutation({
        email: values.email,
        password: values.password,
      });

      if (result) {
        // Store user in localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("auth-user", JSON.stringify(result));
        }
        router.push("/conversations");
      }
    } catch (err: any) {
      setError(
        err.message || "Failed to sign in. Please check your credentials."
      );
      console.error("Sign in error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex items-center justify-center min-h-screen bg-[url('/images/crystal-bg.jpg')] bg-cover bg-center">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1">
          <Image src="/logos/crystal-dark.svg" alt="Crystal Logo" width={50} height={50} className="dark:hidden block" />
          <Image src="/logos/crystal-light.svg" alt="Crystal Logo" width={50} height={50} className="hidden dark:block" />
          <CardTitle className="text-3xl font-bold">
            Welcome back
          </CardTitle>
          <CardDescription>
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                disabled={isLoading}
                className={cn(errors.email && "border-red-500")}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                disabled={isLoading}
                className={cn(errors.password && "border-red-500")}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              Don't have an account?{" "}
            </span>
            <Link
              href="/sign-up"
              className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
            >
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
      <div className="absolute bottom-2 right-2 w-full h-fit">
        <p className="text-xs text-right text-muted-foreground">
          Photo by{" "}
          <Button variant="link" className="p-0">
            <a href="https://unsplash.com/@kirp?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">
              Andrew Kliatskyi
            </a>
          </Button>{" "}
          on{" "}
          <Button variant="link" className="p-0">
            <a href="https://unsplash.com/photos/abstract-dark-grey-flowing-waves-on-black-background-JdX0OeTj5S0?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">
              Unsplash
            </a>
          </Button>
        </p>
      </div>
    </div>
  );
}
