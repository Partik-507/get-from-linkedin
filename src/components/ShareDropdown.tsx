import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Share2, Copy, MessageCircle, Mail, Twitter } from "lucide-react";
import { toast } from "sonner";

const APP_URL = "https://vivavault.app";

export const ShareDropdown = () => {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(APP_URL);
    toast.success("Link copied!");
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Check out VivaVault - the study companion for IITM BS students! ${APP_URL}`)}`, "_blank");
  };

  const handleEmail = () => {
    window.open(`mailto:?subject=${encodeURIComponent("Check out VivaVault!")}&body=${encodeURIComponent(`Hey! I've been using VivaVault for exam prep. Check it out: ${APP_URL}`)}`, "_blank");
  };

  const handleTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Studying for IITM BS exams? Check out VivaVault! ${APP_URL}`)}`, "_blank");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 font-body text-xs">
          <Share2 className="h-3.5 w-3.5" /> Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 dropdown-shadow">
        <DropdownMenuItem onClick={handleCopy} className="gap-2 font-body">
          <Copy className="h-4 w-4" /> Copy Link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleWhatsApp} className="gap-2 font-body">
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEmail} className="gap-2 font-body">
          <Mail className="h-4 w-4" /> Email
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleTwitter} className="gap-2 font-body">
          <Twitter className="h-4 w-4" /> Twitter/X
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
