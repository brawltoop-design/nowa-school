const globalForAutomation = globalThis as {
  automationWorkerInterval?: ReturnType<typeof setInterval>;
};

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  if (process.env.AUTOMATION_WORKER_DISABLED === "1") {
    return;
  }

  if (globalForAutomation.automationWorkerInterval) {
    return;
  }

  const { processAutomationQueue } = await import(
    "@/server/automations/engine"
  );

  const tick = () => {
    void processAutomationQueue({ limit: 20 }).catch((error) => {
      console.error("Automation worker tick failed", error);
    });
  };

  tick();
  globalForAutomation.automationWorkerInterval = setInterval(tick, 60_000);
  globalForAutomation.automationWorkerInterval.unref?.();
}
