import { Hash } from "lucide-react";
import { PT_Serif } from "next/font/google";
import localFont from "next/font/local";
import { Separator } from "../ui/separator";

type ChatWelcomeProps = {
  name: string;
  type: "channel" | "conversation" | "personal-space";
};

const font = PT_Serif({ subsets: ["latin"], weight: ["400", "700"], style: "italic" })

export const ChatWelcome = ({ name, type }: ChatWelcomeProps) => {
  return (
    <div className="space-y-2 px-4 mb-4">
      <p className={`text-xl md:text-3xl font-normal ${font.className}`}>
        {type === "channel" ? "Welcome to #" : ""}
        {name}
      </p>

      <p className="text-zinc-600 dark:text-zinc-400 text-sm">
        {type === "channel"
          ? `This is the start of #${name} channel.`
          : type === "conversation"
          ? `This is the start of your conversation with ${name}`
          : `This is your personal space. You can use it to chat with yourself (if that's your thing) or to store messages and files for later use.`}
      </p>
      <Separator />
    </div>
  );
};
