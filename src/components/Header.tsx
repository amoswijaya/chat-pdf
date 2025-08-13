import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "./ui/button";
import Image from "next/image";

const Header = () => {
  return (
    <header
      className="
    fixed top-0 z-50 w-full h-16
    flex items-center justify-between
    px-6 sm:px-8
    border-b border-neutral-200 dark:border-neutral-800
    bg-white dark:bg-[#0b0f19]
    text-neutral-900 dark:text-neutral-100
    shadow-sm
  "
    >
      <Link href="/" className="flex items-center gap-3 font-semibold group">
        <span
          aria-hidden
          className="
        inline-grid h-8 w-8 place-items-center rounded-lg
        bg-blue-600 text-white
        transition-transform group-hover:scale-105
      "
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
        </span>

        <span className="flex items-center gap-2">
          <span className="tracking-tight">ChatPDF AI</span>
          <span
            className="
          rounded-full px-2 py-0.5 text-[10px] font-medium
          border border-neutral-300 text-neutral-600 bg-neutral-100
          dark:border-neutral-700 dark:text-neutral-300 dark:bg-neutral-800
        "
          >
            beta
          </span>
        </span>
      </Link>

      <SignedOut>
        <SignInButton
          signUpFallbackRedirectUrl={"/dashboard"}
          signUpForceRedirectUrl={"/dashboard"}
          oauthFlow="popup"
          mode="modal"
        >
          <Button
            variant="outline"
            size="lg"
            className="
          gap-2 rounded-lg
          border border-neutral-300 dark:border-neutral-700
          bg-white hover:bg-neutral-100
          dark:bg-neutral-900 dark:hover:bg-neutral-800
          text-neutral-900 dark:text-neutral-100
          transition-colors active:scale-[0.98] 
        "
          >
            <Image
              src="/icons/google.svg"
              width={20}
              height={20}
              alt="google"
              className="opacity-90"
            />
            <span>Login with Google</span>
          </Button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        <UserButton
          appearance={{
            elements: {
              userButtonAvatarBox:
                "rounded-full ring-2 ring-blue-500/30 hover:ring-blue-500/50 transition-shadow",
            },
          }}
        />
      </SignedIn>
    </header>
  );
};

export default Header;
