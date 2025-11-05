import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { OrganizationProvider } from "@/lib/OrganizationContext";
import { PageTransitionProvider } from "@/lib/pageTransition";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";

function AppContent({ Component, pageProps }: AppProps) {
  const router = useRouter();

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div 
        key={router.asPath}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <Component {...pageProps} />
      </motion.div>
    </AnimatePresence>
  );
}

export default function App(appProps: AppProps) {
  return (
    <OrganizationProvider>
      <PageTransitionProvider>
        <AppContent {...appProps} />
      </PageTransitionProvider>
    </OrganizationProvider>
  );
}
