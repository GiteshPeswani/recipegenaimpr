import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="inline-block bg-[#FBF8F1] dark:bg-[#27221E] border-1.5 border-[#2B2118] dark:border-[#4E4238] rounded-[6px_10px_8px_12px] p-8 shadow-hard dark:shadow-hard-dark max-w-sm w-full space-y-3">
          <p className="font-serif text-lg font-bold text-[#2B2118] dark:text-[#EFE7DA]">
            Opening your kitchen notebook...
          </p>
          <p className="font-handwriting text-base text-[#B5502F] dark:text-[#D98E04] -rotate-1">
            checking your saved recipes
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
