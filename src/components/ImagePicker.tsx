import { useRef, useState } from "react";
import { Upload, X, Image as ImageIcon, Loader2, Replace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { compressImage, uploadToFirebase, uploadToLocalFS, type ImageFormat } from "@/lib/imageUtils";
import { useStorage } from "@/contexts/StorageContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImagePickerProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  readOnly?: boolean;
  bucket?: string; // path prefix in firebase storage
  maxSizeMB?: number;
  aspectRatio?: number; // width / height
  className?: string;
  label?: string;
}

export const ImagePicker = ({
  value,
  onChange,
  readOnly = false,
  bucket = "uploads",
  maxSizeMB = 10,
  aspectRatio,
  className,
  label = "Image",
}: ImagePickerProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { storageMode, localVault } = useStorage();
  const [busy, setBusy] = useState(false);
  const [format, setFormat] = useState<ImageFormat>("auto");
  const [drag, setDrag] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Image too large (max ${maxSizeMB}MB)`);
      return;
    }
    setBusy(true);
    try {
      const blob = await compressImage(file, { format, maxWidth: 2000, quality: 0.85 });
      const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
      const name = `${bucket}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      let url: string;
      if (storageMode === "local" && localVault?.dirHandle) {
        url = await uploadToLocalFS(blob, localVault.dirHandle, name.split("/").pop()!);
      } else {
        url = await uploadToFirebase(blob, name);
      }
      onChange(url);
      toast.success("Image uploaded");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onPick = () => inputRef.current?.click();

  // Read-only view
  if (readOnly) {
    if (!value) {
      return (
        <div className={cn("flex items-center justify-center rounded-xl bg-muted/50 text-muted-foreground", className)}
             style={aspectRatio ? { aspectRatio } : undefined}>
          <ImageIcon className="h-8 w-8" />
        </div>
      );
    }
    return (
      <img
        src={value}
        alt={label}
        className={cn("rounded-xl object-cover w-full", className)}
        style={aspectRatio ? { aspectRatio } : undefined}
        loading="lazy"
      />
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {value ? (
        <div className="relative group rounded-xl overflow-hidden border border-border/60 bg-card">
          <img
            src={value}
            alt={label}
            className="w-full object-cover"
            style={aspectRatio ? { aspectRatio } : { maxHeight: 280 }}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <Button size="sm" variant="secondary" onClick={onPick} disabled={busy} className="gap-1.5">
              <Replace className="h-4 w-4" /> Replace
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onChange(null)} disabled={busy} className="gap-1.5">
              <X className="h-4 w-4" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onPick}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          disabled={busy}
          className={cn(
            "w-full rounded-xl border-2 border-dashed border-border/60 bg-muted/30 p-6 flex flex-col items-center justify-center gap-2 transition",
            "hover:border-primary/50 hover:bg-muted/50 active:scale-[0.99]",
            drag && "border-primary bg-primary/5",
            busy && "opacity-50 pointer-events-none",
          )}
          style={aspectRatio ? { aspectRatio } : { minHeight: 160 }}
        >
          {busy ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-6 w-6 text-muted-foreground" />
          )}
          <div className="text-sm font-medium">{busy ? "Uploading…" : `Tap or drop to upload ${label}`}</div>
          <div className="text-xs text-muted-foreground">PNG · JPG · WebP · max {maxSizeMB}MB</div>
        </button>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Format</span>
        <Select value={format} onValueChange={(v) => setFormat(v as ImageFormat)}>
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto</SelectItem>
            <SelectItem value="jpg">JPG</SelectItem>
            <SelectItem value="png">PNG</SelectItem>
            <SelectItem value="webp">WebP</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
