
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Zap, Droplets, Wind, Sparkles, Car, Scissors, 
  BookOpen, Hammer, Truck, Wrench, Camera, MoreHorizontal,
  Upload, Camera as CameraIcon, Plus, X, Lock, Bug, Palette
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchServices, registerUser } from "@/lib/api";
import { toast } from "sonner";
import { KarigarLoader, KarigarLoaderInline } from "@/components/ui/karigar-loader";

const serviceConfig: Record<string, { icon: any; color: string }> = {
  Locksmith: { icon: Lock, color: 'bg-amber-600' },
  'Pest Control': { icon: Bug, color: 'bg-red-600' },
  Electrician: { icon: Zap, color: 'bg-yellow-500' },
  'Appliance Repair': { icon: Wrench, color: 'bg-slate-500' },
  Painter: { icon: Palette, color: 'bg-indigo-400' },
  Plumbing: { icon: Droplets, color: 'bg-blue-500' },
  Beautician: { icon: Scissors, color: 'bg-pink-500' },
  Electrical: { icon: Zap, color: 'bg-yellow-600' },
  'AC Technician': { icon: Wind, color: 'bg-cyan-500' },
  Plumber: { icon: Droplets, color: 'bg-blue-600' },
  Carpenter: { icon: Hammer, color: 'bg-amber-700' },
  'Home Cleaning': { icon: Sparkles, color: 'bg-green-500' },
};

export default function Registration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string>("");
  const [services, setServices] = useState<{ service_type: string; provider_count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchServices()
      .then(setServices)
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  const handleCreateAccount = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await registerUser({
        name,
        phone,
        email,
        password,
        service_type: selectedService,
        avatar: avatarFile,
      });
      localStorage.setItem("token", result.data.token);
      localStorage.setItem("user", JSON.stringify(result.data.user));
      toast.success(result.message || "Account created successfully");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl overflow-hidden border-none">
        <div className="flex h-2 bg-gray-100">
          <div 
            className="bg-[#0D7377] transition-all duration-500" 
            style={{ width: `${(step / 2) * 100}%` }}
          />
        </div>

        <CardHeader className="space-y-1 pb-8 pt-6 px-10">
          <CardTitle className="text-2xl font-bold text-center">
            {step === 1 ? "Personal Profile" : "Select Your Expertise"}
          </CardTitle>
          <CardDescription className="text-center">
            {step === 1 
              ? "Tell us about yourself and upload a professional photo." 
              : "Choose your primary service category to get started."}
          </CardDescription>
        </CardHeader>

        <CardContent className="px-10 pb-10">
          {step === 1 ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="relative group">
                  <Avatar className="h-32 w-32 border-4 border-[#0D7377] shadow-lg">
                    <AvatarImage src={profileImage || ""} />
                    <AvatarFallback className="bg-gray-100 text-gray-400">
                      <CameraIcon size={40} />
                    </AvatarFallback>
                  </Avatar>
                  <label 
                    htmlFor="avatar-upload" 
                    className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                  >
                    <Plus size={24} />
                  </label>
                  <input 
                    id="avatar-upload"
                    type="file" 
                    accept="image/*"
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setAvatarFile(file);
                        setProfileImage(URL.createObjectURL(file));
                      }
                    }}
                  />
                  {profileImage && (
                    <button 
                      onClick={() => { setProfileImage(null); setAvatarFile(null); }}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-500">Professional photos build trust with customers</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="John Doe" className="h-11" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" placeholder="+1 (555) 000-0000" className="h-11" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="john@example.com" className="h-11" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="password">Create Password</Label>
                  <Input id="password" type="password" className="h-11" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </div>

              <Button 
                className="w-full h-12 text-lg bg-[#0D7377] hover:bg-[#0b6366]"
                onClick={() => setStep(2)}
              >
                Next Step
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {loading ? (
                <div className="flex justify-center py-12">
                  <KarigarLoader label="Loading services..." />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {services.map((service) => {
                    const config = serviceConfig[service.service_type];
                    const Icon = config?.icon || MoreHorizontal;
                    const color = config?.color || 'bg-gray-400';
                    const isSelected = selectedService === service.service_type;
                    
                    return (
                      <button
                        key={service.service_type}
                        onClick={() => setSelectedService(service.service_type)}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 gap-3",
                          isSelected 
                            ? "border-[#0D7377] bg-[#0D7377]/5 shadow-sm" 
                            : "border-gray-100 hover:border-[#0D7377]/30 hover:bg-gray-50"
                        )}
                      >
                        <div className={cn(
                          "p-3 rounded-full text-white shadow-sm",
                          color
                        )}>
                          <Icon size={24} />
                        </div>
                        <span className={cn(
                          "text-xs font-semibold text-center",
                          isSelected ? "text-[#0D7377]" : "text-gray-600"
                        )}>
                          {service.service_type}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button 
                  variant="outline" 
                  className="w-24 h-12"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button 
                  className="flex-1 h-12 text-lg bg-[#0D7377] hover:bg-[#0b6366]"
                  disabled={!selectedService || submitting}
                  onClick={handleCreateAccount}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <KarigarLoaderInline />
                      Creating...
                    </span>
                  ) : (
                    "Complete Registration"
                  )}
                </Button>
              </div>
            </div>
          )}
          
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <button 
                className="text-[#0D7377] font-semibold hover:underline"
                onClick={() => navigate("/login")}
              >
                Login here
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
