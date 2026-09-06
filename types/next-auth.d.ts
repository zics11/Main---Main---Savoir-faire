import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/db/schema";

declare module "next-auth" {
  interface User {
    role: Role;
  }
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/adapters" {
  interface AdapterUser {
    role: Role;
  }
}
