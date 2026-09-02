import { cn } from "@/lib/utils";

type ContainerProps = {
  children: React.ReactNode;
  className?: string;
  border?: boolean;
};

export const Container = ({
  children,
  className,
  border = false,
}: ContainerProps) => {
  return (
    <div
      className={cn(
        "max-w-6xl mx-auto  px-4 md:px-10 relative",
        border && "border-l-3 border-r-3 border-dotted",
        className,
      )}
    >
      {children}
    </div>
  );
};
