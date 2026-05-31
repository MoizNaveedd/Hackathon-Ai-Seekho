
import * as React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn } from "lucide-react";
import { loginUser } from "@/lib/api";
import { toast } from "sonner";
import { KarigarLoaderInline } from "@/components/ui/karigar-loader";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await loginUser(email, password);
      localStorage.setItem("token", result.data.token);
      localStorage.setItem("user", JSON.stringify(result.data.user));
      toast.success(result.message || "Login successful");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 leading-relaxed tracking-tight">
      <Card className="w-full max-w-md shadow-xl border-none">
        <CardHeader className="space-y-4 pb-8 pt-6 text-center">
          <div className="mx-auto w-12 h-12 bg-[#0D7377] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#0D7377]/20">
            <LogIn size={24} />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold tracking-tight">Welcome Back</CardTitle>
            <CardDescription className="text-base">
              Enter your credentials to access your dashboard.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-8 pb-10">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="alex@provider.com" 
                className="h-12 bg-gray-50 border-gray-100 focus:bg-white transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button type="button" className="text-sm font-medium text-[#0D7377] hover:underline">
                  Forgot password?
                </button>
              </div>
              <Input 
                id="password" 
                type="password" 
                className="h-12 bg-gray-50 border-gray-100 focus:bg-white transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 text-lg bg-[#0D7377] hover:bg-[#0b6366] font-semibold"
              disabled={submitting}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <KarigarLoaderInline />
                  Logging in...
                </span>
              ) : (
                "Log In"
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              New here?{" "}
              <button 
                className="text-[#0D7377] font-semibold hover:underline"
                onClick={() => navigate("/register")}
              >
                Create a provider account
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
