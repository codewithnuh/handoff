import { cn } from "@/lib/utils";

type ContainerProps = {
  children: React.ReactNode;
  className?: string;
  leftBorder?: boolean;
  rightBorder?: boolean;
};

export const Container = ({
  children,
  className,
  leftBorder = false,
  rightBorder = false,
}: ContainerProps) => {
  return (
    <div
      className={cn(
        "container mx-auto px-10 relative",

        // Left perforated border
        leftBorder && [
          "before:absolute before:left-0 before:top-0 before:h-full before:w-[3px]",
          "before:bg-[radial-gradient(circle,_#71717a_1.5px,_transparent_1.5px)]",
          "before:bg-[length:3px_10px]",
          "dark:before:bg-[radial-gradient(circle,_#a1a1aa_1.5px,_transparent_1.5px)]",
        ],

        // Right perforated border
        rightBorder && [
          "after:absolute after:right-0 after:top-0 after:h-full after:w-[3px]",
          "after:bg-[radial-gradient(circle,_#71717a_1.5px,_transparent_1.5px)]",
          "after:bg-[length:3px_10px]",
          "dark:after:bg-[radial-gradient(circle,_#a1a1aa_1.5px,_transparent_1.5px)]",
        ],

        className,
      )}
    >
      {children}
    </div>
  );
};
