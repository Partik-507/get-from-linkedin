import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Building2, Check } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface College {
  id: string;
  name: string;
  type?: string;
  logoUrl?: string;
  shortName?: string;
}

const FALLBACK_COLLEGES: College[] = [
  { id: "iitm-bs", name: "IIT Madras BS", type: "Online Degree", shortName: "IITM" },
  { id: "iit-delhi", name: "IIT Delhi", type: "Engineering", shortName: "IITD" },
  { id: "iit-bombay", name: "IIT Bombay", type: "Engineering", shortName: "IITB" },
  { id: "nit-trichy", name: "NIT Trichy", type: "Engineering", shortName: "NITT" },
];

export const CollegeSelect = ({ onSelected }: { onSelected: (id: string) => void }) => {
  const { user, updateUserProfile } = useAuth();
  const [colleges, setColleges] = useState<College[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, "colleges"));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as College));
        setColleges(data.length > 0 ? data : FALLBACK_COLLEGES);
      } catch {
        setColleges(FALLBACK_COLLEGES);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = colleges.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.shortName?.toLowerCase().includes(search.toLowerCase())
  );

  const select = async (college: College) => {
    setSaving(college.id);
    try {
      if (user) {
        await updateUserProfile({ selectedCollegeId: college.id, selectedCollegeName: college.name } as any);
      }
      localStorage.setItem("vv_selected_college", college.id);
      localStorage.setItem("vv_selected_college_name", college.name);
      toast.success(`Welcome to ${college.name}`);
      onSelected(college.id);
    } catch {
      toast.error("Failed to select institution");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="min-h-screen w-full surface-base flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-[hsl(240,70%,50%)] flex items-center justify-center text-primary-foreground font-bold text-2xl mx-auto mb-5 shadow-lg shadow-primary/20">V</div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Choose your institution</h1>
          <p className="text-sm font-body text-muted-foreground mt-2">We'll personalize your homepage with relevant courses and resources.</p>
        </motion.div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search institutions..."
            className="pl-11 h-12 rounded-xl font-body" />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {filtered.map((c, i) => (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                onClick={() => select(c)}
                disabled={saving === c.id}
                className={cn(
                  "p-4 rounded-xl border text-left transition-all group flex items-center gap-3",
                  "border-border bg-card hover:border-primary/40 hover:bg-primary/[0.03]",
                  saving === c.id && "opacity-50"
                )}
              >
                <div className="h-12 w-12 rounded-xl bg-primary/8 flex items-center justify-center shrink-0 group-hover:bg-primary/12 transition-colors">
                  {c.logoUrl ? (
                    <img src={c.logoUrl} alt={c.name} className="h-8 w-8 object-contain" />
                  ) : (
                    <Building2 className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-heading font-semibold text-sm leading-tight">{c.name}</p>
                  {c.type && <p className="text-xs text-muted-foreground font-body mt-0.5">{c.type}</p>}
                </div>
                {saving === c.id && <Check className="h-4 w-4 text-primary" />}
              </motion.button>
            ))}
          </div>
        )}

        {filtered.length === 0 && !loading && (
          <p className="text-center text-sm text-muted-foreground font-body py-8">No institutions match your search.</p>
        )}
      </div>
    </div>
  );
};

export default CollegeSelect;
