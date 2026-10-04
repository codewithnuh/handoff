import Image from "next/image";

type HandoffMarkProps = {
  size?: number;
  className?: string;
};

export function HandoffMark({ size = 32, className }: HandoffMarkProps) {
  return (
    <Image
      src="/logo.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      unoptimized
      className={className}
    />
  );
}
