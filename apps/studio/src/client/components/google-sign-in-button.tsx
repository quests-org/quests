import { Button } from "@/client/components/ui/button";
import { useSignInSocial } from "@/client/hooks/use-sign-in-social";
import { SiGoogle } from "react-icons/si";

export function GoogleSignInButton({ className }: { className?: string }) {
  const { signIn } = useSignInSocial();

  const handleSignIn = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void signIn();
  };

  return (
    <form
      className="flex w-full items-center justify-center"
      onSubmit={handleSignIn}
    >
      <Button className={className} type="submit" variant="default">
        <SiGoogle />
        Continue with Google
      </Button>
    </form>
  );
}
