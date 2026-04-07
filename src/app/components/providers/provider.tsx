"use client";

import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RealtimeProvider } from "@upstash/realtime/client";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <RealtimeProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </RealtimeProvider>
  );
}
