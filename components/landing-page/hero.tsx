import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { IconEye } from "@tabler/icons-react";

export const Hero = () => {
  return (
    <div className="py-10 mx-auto gap-y-3 max-w-2xl my-26 flex flex-col items-center justify-center">
      <div className="relative z-10 flex flex-col items-center gap-y-3">
        <Badge className="gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          <span>For Freelancers</span>
        </Badge>
        <h1 className="text-4xl text-center text-wrap font-bold text-foreground">
          Stop chasing status updates
        </h1>
        <p className="text-foreground text-center">
          Send one link. Your client sees what&apos;s done, approves or rejects
          work, and leaves feedback, all in one place. No more digging through
          email and WhatsApp for the latest answer.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button>Get started free</Button>
          <Button>
            Watch Demo <IconEye />
          </Button>
        </div>
      </div>
    </div>
  );
};
