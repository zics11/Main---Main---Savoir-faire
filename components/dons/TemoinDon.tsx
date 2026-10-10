"use client";

import { useEffect } from "react";
import { DUREE_TEMOIN_DON, TEMOIN_DON } from "@/lib/dons";

/**
 * Posé sur la page de remerciement : après un don, les encarts qui invitent
 * à donner se taisent quelque temps. Rien de personnel, juste « a donné ».
 */
export function TemoinDon() {
  useEffect(() => {
    document.cookie = `${TEMOIN_DON}=1; max-age=${DUREE_TEMOIN_DON}; path=/; samesite=lax`;
  }, []);
  return null;
}
