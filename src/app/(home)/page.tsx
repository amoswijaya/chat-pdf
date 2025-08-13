import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
export default function Page() {
  return (
    <>
      <section className="relative bg-[#0b0f19] text-neutral-100 h-screen">
        <div className="container mx-auto max-w-7xl px-6 lg:px-10 py-16 md:py-24 xl:py-28">
          <div className="grid items-center gap-12 lg:gap-16 xl:gap-20 lg:grid-cols-2">
            {/* Left: copy & actions */}
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-6">
              <Badge
                variant="secondary"
                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-neutral-800 text-neutral-200 border border-neutral-700 text-[11px]"
              >
                <Star className="h-4 w-4 text-blue-400" />
                <span className="font-semibold tracking-wide">
                  Powered by Advance AI
                </span>
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] tracking-tight">
                Beyond Reading: Talk to Your PDFs for Deeper Insights
              </h1>

              <p className="text-lg sm:text-xl lg:text-2xl text-neutral-400 max-w-3xl">
                Upload any PDF, ask questions, and get precise answers powered
                by AI. Transform how you interact with information.
              </p>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <SignedOut>
                  <SignInButton
                    signUpFallbackRedirectUrl={"/dashboard"}
                    signUpForceRedirectUrl={"/dashboard"}
                    oauthFlow="popup"
                    mode="modal"
                  >
                    <Button
                      size="lg"
                      className="h-12 px-6 text-base gap-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100 transition-colors active:scale-[0.98] "
                    >
                      <Image
                        src="/icons/google.svg"
                        width={20}
                        height={20}
                        alt="Google"
                      />
                      Login with Google
                    </Button>
                  </SignInButton>
                </SignedOut>

                <SignedIn>
                  <Link href="/dashboard">
                    <Button
                      size="lg"
                      className="h-12 px-6 text-base bg-blue-600 hover:bg-blue-500 text-white"
                    >
                      Go to Dashboard
                    </Button>
                  </Link>
                </SignedIn>
              </div>
            </div>

            {/* Right: hero image lebih besar */}
            <div className="relative">
              <Image
                src="/hero.png"
                width={1400}
                height={1000}
                alt="ChatPDF AI hero illustration"
                className="w-full max-w-2xl lg:max-w-4xl mx-auto rounded-xl border border-neutral-800 bg-neutral-900 object-cover"
                priority
                sizes="(min-width: 1024px) 50vw, 90vw"
              />
              <div className="mx-auto mt-5 h-1 w-56 rounded-full bg-neutral-800" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
