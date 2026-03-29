import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, ExternalLink, Lock, Play, RotateCcw, LogIn, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const GRADIENT_COLORS = [
  "from-[hsl(263,70%,50%)] to-[hsl(280,60%,45%)]",
  "from-[hsl(210,80%,50%)] to-[hsl(230,70%,45%)]",
  "from-[hsl(340,70%,50%)] to-[hsl(320,60%,45%)]",
  "from-[hsl(160,70%,40%)] to-[hsl(180,60%,35%)]",
  "from-[hsl(30,80%,50%)] to-[hsl(15,70%,45%)]",
  "from-[hsl(190,70%,45%)] to-[hsl(210,60%,40%)]",
];

export type CourseStatus = "not-enrolled" | "enrolled" | "completed" | "locked" | "guest" | "coming-soon";

interface CourseCardProps {
  id: string;
  code: string;
  name: string;
  description: string;
  questionCount: number;
  status: CourseStatus;
  progress?: number;
  studiedCount?: number;
  index: number;
  branchTag?: string;
  levelTag?: string;
  photoUrl?: string;
  onEnroll?: () => void;
  onRequestAccess?: () => void;
  onSignIn?: () => void;
}

export const CourseCard = ({
  id, code, name, description, questionCount, status, progress = 0,
  studiedCount = 0, index, branchTag, levelTag, photoUrl,
  onEnroll, onRequestAccess, onSignIn,
}: CourseCardProps) => {
  const gradientClass = GRADIENT_COLORS[index % GRADIENT_COLORS.length];
  const isLocked = status === "locked";
  const isComingSoon = status === "coming-soon";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className={cn(
        "vv-card flex flex-col overflow-hidden h-full relative",
        isLocked && "opacity-75",
      )}>
        {isLocked && (
          <div className="absolute inset-0 z-10 bg-background/50 flex items-center justify-center rounded-2xl">
            <Badge className="gap-1.5 bg-muted text-muted-foreground font-body">
              <Lock className="h-3 w-3" /> Access Restricted
            </Badge>
          </div>
        )}

        {photoUrl && (
          <div className="h-36 w-full overflow-hidden">
            <img src={photoUrl} alt={name} className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}

        <div className="p-5 flex flex-col flex-1">
          {/* Header */}
          <div className="flex items-start gap-3.5 mb-3">
            <div className={cn(
              "h-11 w-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md",
              gradientClass
            )}>
              {code?.slice(0, 2) || "P"}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-heading font-bold tracking-tight leading-tight">{code}</h3>
              <p className="text-xs text-muted-foreground truncate font-body mt-0.5">{name}</p>
            </div>
            {questionCount > 0 && (
              <Badge variant="outline" className="text-[10px] font-body tabular-nums shrink-0">
                {questionCount} Q
              </Badge>
            )}
          </div>

          {/* Tags */}
          {(branchTag || levelTag || isComingSoon) && (
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {branchTag && <Badge variant="secondary" className="text-[10px] font-body">{branchTag}</Badge>}
              {levelTag && <Badge variant="secondary" className="text-[10px] font-body">{levelTag}</Badge>}
              {isComingSoon && <Badge className="text-[10px] bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] font-body">Coming Soon</Badge>}
            </div>
          )}

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-2 font-body leading-relaxed">
            {description || "Prepare with curated questions and community experiences."}
          </p>

          {/* Progress - show for enrolled/completed */}
          {(status === "enrolled" || status === "completed") && questionCount > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-body mb-1.5">
                <span>{studiedCount} studied</span>
                <span className="tabular-nums">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          {/* Footer buttons by status */}
          <div className="flex gap-2.5 mt-auto">
            {status === "not-enrolled" && (
              <>
                <Button onClick={onEnroll} className="flex-1 font-body text-sm gap-1.5 active:scale-[0.97] transition-all">
                  + Enroll
                </Button>
                <Button asChild variant="outline" className="font-body text-sm active:scale-[0.97]">
                  <Link to={`/project/${id}/resources`}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </>
            )}

            {status === "enrolled" && (
              <>
                <Button asChild className="flex-1 font-body text-sm gap-1.5 active:scale-[0.97] transition-all">
                  <Link to={`/project/${id}/viva`}>
                    <Play className="h-3.5 w-3.5" /> Continue
                  </Link>
                </Button>
                <Button asChild variant="outline" className="font-body text-sm active:scale-[0.97]">
                  <Link to={`/project/${id}/resources`}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </>
            )}

            {status === "completed" && (
              <>
                <Button asChild variant="outline" className="flex-1 font-body text-sm gap-1.5 text-[hsl(var(--success))] border-[hsl(var(--success))]/30 active:scale-[0.97]">
                  <Link to={`/project/${id}/viva`}>
                    <RotateCcw className="h-3.5 w-3.5" /> Review
                  </Link>
                </Button>
                <Button asChild variant="outline" className="font-body text-sm active:scale-[0.97]">
                  <Link to={`/project/${id}/resources`}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </>
            )}

            {status === "locked" && (
              <Button onClick={onRequestAccess} variant="outline" className="flex-1 font-body text-sm gap-1.5" disabled={isLocked}>
                <Lock className="h-3.5 w-3.5" /> Request Access
              </Button>
            )}

            {status === "guest" && (
              <Button onClick={onSignIn} variant="outline" className="flex-1 font-body text-sm gap-1.5 border-primary/30 text-primary">
                <LogIn className="h-3.5 w-3.5" /> Sign In to Access
              </Button>
            )}

            {status === "coming-soon" && (
              <Button disabled className="flex-1 font-body text-sm gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Coming Soon
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
