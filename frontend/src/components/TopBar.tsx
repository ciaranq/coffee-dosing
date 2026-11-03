import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { MachineSelect } from "./MachineSelect";

/** Top strip on every page: machine picker on the left, sign in or account menu on the right. */
export function TopBar() {
  return (
    <div className="flex shrink-0 items-center gap-3 px-4 pb-1 pt-[max(0.25rem,env(safe-area-inset-top))]">
      <MachineSelect />
      <Show
        when="signed-in"
        fallback={
          <SignInButton mode="redirect">
            <button type="button" className="glass h-11 shrink-0 rounded-xl px-4 text-base font-medium active:scale-95">
              Sign in
            </button>
          </SignInButton>
        }
      >
        <UserButton />
      </Show>
    </div>
  );
}
