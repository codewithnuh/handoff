import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { IconEye } from "@tabler/icons-react";
export const Hero = () => {
  return (
    <div className="py-10 mx-auto gap-y-3  max-w-2xl my-20 flex flex-col items-center justify-center">
      <Badge>
        <div className="bg-accent w-1 h-1 rounded-full animate-ping"></div>{" "}
        <span>For Freelancers</span>
      </Badge>
      <h1 className="text-4xl text-center text-wrap font-bold text-foreground">
        Client updates without the chaos
      </h1>
      <p className="text-foreground text-center">
        Create projects and deliverables, then share one private link. Clients
        see progress, leave comments, and accept or reject — without another
        tool to learn.{" "}
      </p>
      <div className="flex items-center justify-center gap-3">
        <Button>Get Started</Button>
        <Button>
          Watch Demo <IconEye />
        </Button>
      </div>
    </div>
  );
};
