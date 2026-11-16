import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export const LoginPage = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim() || !emailRegex.test(email.trim())) {
      newErrors.email = "That email doesn't look right";
    }
    if (!password) {
      newErrors.password = "Password is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      showToast("Welcome back! Notebook is open.", "success");
      const destination = (location.state as any)?.from?.pathname || "/";
      navigate(destination, { replace: true });
    } catch (err: any) {
      showToast(err.message || "Email or password is incorrect", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
        {/* Left Column: Asymmetric Brand Intro */}
        <div className="lg:col-span-5 text-left pt-2">
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-[#2B2118] dark:text-[#EFE7DA] leading-[1.15]">
            Welcome back, chef.
          </h1>
          <p className="font-handwriting text-2xl text-[#B5502F] dark:text-[#D98E04] mt-3 -rotate-1">
            your recipes are right where you left them.
          </p>

          <div className="mt-8 pt-6 border-t border-[#2B2118]/20 dark:border-[#4E4238] hidden lg:block text-xs font-mono text-[#2B2118]/60 dark:text-[#EFE7DA]/60 space-y-2">
            <p>• Private kitchen history</p>
            <p>• Saved favorites notebook</p>
            <p>• Personal food waste reduction tracker</p>
          </div>
        </div>

        {/* Right Column: Notebook Card Form */}
        <div className="lg:col-span-7">
          <div className="bg-[#FBF8F1] dark:bg-[#27221E] border-1.5 border-[#2B2118] dark:border-[#4E4238] rounded-[8px_12px_6px_10px] p-6 sm:p-10 shadow-hard dark:shadow-hard-dark relative">
            {/* Top pin hole */}
            <div className="w-2.5 h-2.5 rounded-full border border-[#2B2118]/40 dark:border-[#4E4238] bg-[#E8DFC8] dark:bg-[#1E1915] absolute top-3 left-1/2 -translate-x-1/2 shadow-inner" />

            <h2 className="font-serif text-2xl font-bold text-[#2B2118] dark:text-[#EFE7DA] mb-1">
              Sign In
            </h2>
            <p className="text-xs font-mono text-[#2B2118]/60 dark:text-[#EFE7DA]/60 mb-6">
              Enter your credentials to access your recipes
            </p>

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* Email */}
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-mono uppercase tracking-wider text-[#2B2118]/70 dark:text-[#EFE7DA]/70 mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder="chef@kitchen.com"
                  className="w-full bg-[#F6F0E4]/70 dark:bg-[#1E1915]/60 border-1.5 border-dashed border-[#2B2118]/70 dark:border-[#4E4238] rounded-[4px_6px_5px_4px] px-3.5 py-2.5 text-sm text-[#2B2118] dark:text-[#EFE7DA] placeholder:text-[#2B2118]/30 dark:placeholder:text-[#EFE7DA]/30 focus:outline-none focus:border-solid focus:border-[#2B2118] dark:focus:border-[#EFE7DA]"
                />
                {errors.email && (
                  <p className="font-handwriting text-sm text-[#B5502F] dark:text-[#D98E04] mt-1 -rotate-1">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-mono uppercase tracking-wider text-[#2B2118]/70 dark:text-[#EFE7DA]/70 mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    placeholder="••••••••"
                    className="w-full bg-[#F6F0E4]/70 dark:bg-[#1E1915]/60 border-1.5 border-dashed border-[#2B2118]/70 dark:border-[#4E4238] rounded-[4px_6px_5px_4px] px-3.5 py-2.5 pr-10 text-sm text-[#2B2118] dark:text-[#EFE7DA] placeholder:text-[#2B2118]/30 dark:placeholder:text-[#EFE7DA]/30 focus:outline-none focus:border-solid focus:border-[#2B2118] dark:focus:border-[#EFE7DA]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2B2118]/50 dark:text-[#EFE7DA]/50 hover:text-[#2B2118] dark:hover:text-[#EFE7DA] transition-colors p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="font-handwriting text-sm text-[#B5502F] dark:text-[#D98E04] mt-1 -rotate-1">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 bg-[#D98E04] hover:bg-[#c47f03] text-[#2B2118] font-serif font-bold text-base rounded-[6px_10px_8px_12px] border-1.5 border-[#2B2118] dark:border-[#4E4238] shadow-hard dark:shadow-hard-dark active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isSubmitting ? "Leafing through the book..." : "Open my notebook"}
              </button>
            </form>

            {/* Switch to Register */}
            <div className="mt-6 pt-5 border-t border-[#2B2118]/20 dark:border-[#4E4238] text-center">
              <Link
                to="/register"
                className="text-xs font-mono text-[#2B2118]/80 dark:text-[#EFE7DA]/80 hover:text-[#B5502F] dark:hover:text-[#D98E04] underline underline-offset-2 transition-colors"
              >
                New here? Start your kitchen notebook
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
