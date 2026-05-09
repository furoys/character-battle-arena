import { SignUp } from "@clerk/react";
import { clerkAppearance } from "@/lib/clerk-appearance";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-8">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        fallbackRedirectUrl={`${basePath}/`}
        appearance={clerkAppearance}
      />
    </div>
  );
}
