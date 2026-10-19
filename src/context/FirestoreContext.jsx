import { createContext, useContext } from "react";
import { useFirestore } from "../hooks/useFirestore";

// ─── Firestore Context ─────────────────────────────────────────────────────────
// Single source of truth for all Firestore data across routes.
// Prevents data flicker / re-subscription when navigating between pages.
const FirestoreCtx = createContext(null);

export function FirestoreProvider({ children }) {
  const store = useFirestore();
  return <FirestoreCtx.Provider value={store}>{children}</FirestoreCtx.Provider>;
}

export function useFirestoreContext() {
  const ctx = useContext(FirestoreCtx);
  if (!ctx) throw new Error("useFirestoreContext must be used inside <FirestoreProvider>");
  return ctx;
}
