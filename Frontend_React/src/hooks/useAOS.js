import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import AOS from "aos";

export function useAOS() {
  const location = useLocation();

  useEffect(() => {
    AOS.refresh();
  }, [location.pathname]);
}
