import { PropsWithChildren } from "react";
import { AuthProvider } from "@/context/AuthContext";

export default function AuthLayout({ children }: PropsWithChildren) {
  return <AuthProvider>{children}</AuthProvider>;
}
