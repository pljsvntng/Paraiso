"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/reservations";

// Ignore superseded requests, including when a search changes before its reply arrives.
export function useAdminResource<T>(path: string) {
  const request = useRef(0),
    controller = useRef<AbortController | null>(null);
  const [state, setState] = useState<{
    path: string;
    data: T | null;
    error: string;
    loading: boolean;
  }>({ path, data: null, error: "", loading: true });
  const reload = useCallback(async () => {
    const version = ++request.current;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setState({ path, data: null, error: "", loading: true });
    try {
      const data = await api<T>(path, undefined, "GET", {
        signal: current.signal,
      });
      if (version === request.current && !current.signal.aborted)
        setState({ path, data, error: "", loading: false });
    } catch (e) {
      if (version === request.current && !current.signal.aborted)
        setState({
          path,
          data: null,
          loading: false,
          error:
            e instanceof Error ? e.message : "Unable to load these records.",
        });
      throw e;
    }
  }, [path]);
  useEffect(() => {
    let active = true;
    void Promise.resolve()
      .then(() => {
        if (active) return reload();
      })
      .catch(() => {});
    return () => {
      active = false;
      controller.current?.abort();
    };
  }, [reload]);
  return {
    ...(state.path === path ? state : { data: null, error: "", loading: true }),
    reload,
  };
}
