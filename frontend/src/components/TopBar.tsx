import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { MachineSelect } from "./MachineSelect";

/** Top strip on every page: machine picker on the left, sign in or account menu on the right. */
export function TopBar() {
  return (
    <header className="flex shrink-0 items-center gap-2.5 px-4 pb-1 pt-[max(0.35rem,env(safe-area-inset-top))]">
      <MachineSelect />
      <Show
        when="signed-in"
        fallback={
          <SignInButton mode="redirect">
            <button
              type="button"
              className="glass flex h-11 shrink-0 items-center gap-2 rounded-2xl px-4 text-base font-medium text-milk transition hover:border-white/25 active:scale-95"
            >
              <span className="size-2 rounded-full bg-crema" aria-hidden="true" />
              Sign in
            </button>
          </SignInButton>
        }
      >
        <div className="glass flex h-11 items-center justify-center rounded-2xl px-2.5">
          <UserButton />
        </div>
      </Show>
    </header>
  );
}
