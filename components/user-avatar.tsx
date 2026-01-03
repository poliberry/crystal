import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  alt: string;
  src?: string;
  className?: string;
};

export const UserAvatar = ({ alt, src, className }: UserAvatarProps) => {
  return (
    <Avatar className={cn("h-6 w-6 md:h-8 md:w-8 rounded-none after:rounded-none", className)}>
      <AvatarImage src={src} alt={alt} className="rounded-none" />
    </Avatar>
  );
};
