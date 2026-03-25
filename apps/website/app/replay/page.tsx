"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import type { eventWithTime } from "@posthog/rrweb";
import { ReplayViewer } from "@/components/replay/replay-viewer";
import { startRecording, stopRecording } from "@/lib/rrweb";
import { useMountEffect } from "@/hooks/use-mount-effect";
import type { ViewerRunState } from "@/lib/replay-types";

const POLL_INTERVAL_MS = 1000;

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

const RecordingMode = () => {
  const [recording, setRecording] = useState(true);
  const [events, setEvents] = useState<eventWithTime[]>([]);

  useMountEffect(() => {
    void startRecording();
  });

  const handleCompleteRecording = () => {
    const recordedEvents = stopRecording();
    if (recordedEvents.length < 2) return;
    setEvents(recordedEvents);
    setRecording(false);
  };

  if (!recording) {
    return <ReplayViewer events={events} />;
  }

  return (
    <div className="relative flex h-screen flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="flex size-16 items-center justify-center rounded-full bg-red-500/10">
          <div className="size-4 animate-pulse rounded-full bg-red-500" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
            Recording session...
          </h1>
          <p className="text-sm text-neutral-500">
            Interact with the page, then complete the recording to replay it.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCompleteRecording}
          className="rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white shadow-lg transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          Complete Recording
        </button>
      </div>
    </div>
  );
};

const fetchLatestEvents = async (): Promise<eventWithTime[]> => {
  const response = await fetch("/latest.json");
  if (!response.ok) return [];
  return response.json();
};

const fetchSteps = async (): Promise<ViewerRunState> => {
  const response = await fetch("/steps");
  if (!response.ok) return { title: "", status: "running", summary: undefined, steps: [] };
  return response.json();
};

const LiveMode = () => {
  const addEventsRef = useRef<((newEvents: eventWithTime[]) => void) | undefined>(undefined);
  const prevEventCountRef = useRef(0);

  const eventsQuery = useQuery({
    queryKey: ["replay-events"],
    queryFn: fetchLatestEvents,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const stepsQuery = useQuery({
    queryKey: ["replay-steps"],
    queryFn: fetchSteps,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const events = eventsQuery.data ?? [];
  const steps = stepsQuery.data;
  const isRunning = !steps || steps.status === "running";

  useEffect(() => {
    if (events.length <= prevEventCountRef.current) return;
    const newEvents = events.slice(prevEventCountRef.current);
    prevEventCountRef.current = events.length;
    addEventsRef.current?.(newEvents);
  }, [events.length]);

  const handleAddEventsRef = (handler: (newEvents: eventWithTime[]) => void) => {
    addEventsRef.current = handler;
  };

  return (
    <ReplayViewer
      events={events}
      steps={steps}
      live={isRunning}
      onAddEventsRef={handleAddEventsRef}
    />
  );
};

const ReplayPageInner = () => {
  const searchParams = useSearchParams();
  const isLive = searchParams.get("live") === "true";

  if (isLive) {
    return <LiveMode />;
  }

  return <RecordingMode />;
};

export default function ReplayPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense>
        <ReplayPageInner />
      </Suspense>
    </QueryClientProvider>
  );
}
