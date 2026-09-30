/**
 * Print jobs for the dashboard. Jobs run one after another in the background (a receipt printer
 * handles one job at a time), so the dashboard stays usable while printing. Every job can be
 * cancelled, gives up after a time limit instead of spinning forever, and the same thing can't be
 * queued twice while it is still waiting or printing.
 */

export type JobStatus = "preparing" | "printing" | "completed" | "cancelled" | "failed";

export interface PrintJob {
  id: string;
  /** Same key = same print (e.g. order id + ticket); a second request is ignored while one is active. */
  key: string;
  orderId: string;
  label: string;
  status: JobStatus;
  error: string;
  auto: boolean;
  createdAt: number;
}

export interface PrintRequest {
  key: string;
  orderId: string;
  label: string;
  auto?: boolean;
  /** Runs before printing (e.g. claim the order so only one device prints it). false = skip quietly. */
  before?: () => Promise<boolean>;
  run: (signal: AbortSignal) => Promise<void>;
  /** Runs once the job has finished, whatever the outcome. */
  after?: (status: JobStatus) => Promise<void> | void;
}

export const JOB_LABEL: Record<JobStatus, string> = {
  preparing: "Preparing print",
  printing: "Printing",
  completed: "Completed",
  cancelled: "Cancelled",
  failed: "Failed",
};

const TIME_LIMIT_MS = 30_000;
const KEEP_DONE_MS = 5_000;
const KEEP_PROBLEM_MS = 30_000;

export const isActive = (j: PrintJob) => j.status === "preparing" || j.status === "printing";

export class PrintQueue {
  private jobs: PrintJob[] = [];
  private requests = new Map<string, PrintRequest>();
  private controllers = new Map<string, AbortController>();
  private listeners = new Set<() => void>();
  private running = false;
  private seq = 0;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  snapshot = () => this.jobs;

  private emit() {
    this.jobs = [...this.jobs];
    this.listeners.forEach((l) => l());
  }

  private update(id: string, patch: Partial<PrintJob>) {
    this.jobs = this.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j));
    this.emit();
  }

  private forgetLater(id: string, ms: number) {
    setTimeout(() => {
      this.jobs = this.jobs.filter((j) => j.id !== id);
      this.emit();
    }, ms);
  }

  /** Adds a job; returns false if the same print is already waiting or printing. */
  add(req: PrintRequest): boolean {
    if (this.jobs.some((j) => j.key === req.key && isActive(j))) return false;
    const id = `job-${++this.seq}`;
    this.requests.set(id, req);
    this.jobs.push({ id, key: req.key, orderId: req.orderId, label: req.label, status: "preparing", error: "", auto: req.auto === true, createdAt: Date.now() });
    this.emit();
    void this.pump();
    return true;
  }

  cancel(id: string) {
    const job = this.jobs.find((j) => j.id === id);
    if (!job || !isActive(job)) return;
    const controller = this.controllers.get(id);
    if (controller) controller.abort();
    else this.finish(id, "cancelled", "");
  }

  dismiss(id: string) {
    this.jobs = this.jobs.filter((j) => j.id !== id || isActive(j));
    this.emit();
  }

  /** The newest job for an order (for showing its status on the order card). */
  latestFor(orderId: string): PrintJob | undefined {
    for (let i = this.jobs.length - 1; i >= 0; i--) if (this.jobs[i].orderId === orderId) return this.jobs[i];
    return undefined;
  }

  private finish(id: string, status: JobStatus, error: string) {
    const req = this.requests.get(id);
    this.requests.delete(id);
    this.controllers.delete(id);
    this.update(id, { status, error });
    this.forgetLater(id, status === "completed" ? KEEP_DONE_MS : KEEP_PROBLEM_MS);
    void Promise.resolve(req?.after?.(status)).catch(() => {});
  }

  private async pump() {
    if (this.running) return;
    this.running = true;
    try {
      for (;;) {
        const job = this.jobs.find((j) => j.status === "preparing" && this.requests.has(j.id));
        if (!job) break;
        await this.runOne(job.id);
      }
    } finally {
      this.running = false;
    }
  }

  private async runOne(id: string) {
    const req = this.requests.get(id);
    if (!req) return;
    const controller = new AbortController();
    this.controllers.set(id, controller);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    try {
      if (req.before && !(await req.before())) {
        // Another device is printing it: nothing to show.
        this.requests.delete(id);
        this.controllers.delete(id);
        this.jobs = this.jobs.filter((j) => j.id !== id);
        this.emit();
        return;
      }
      if (controller.signal.aborted) throw new DOMException("Printing cancelled", "AbortError");
      this.update(id, { status: "printing" });
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, TIME_LIMIT_MS);
      // Cancel and the time limit both stop waiting at once, even if the printer never answers.
      const stopped = new Promise<never>((_, reject) =>
        controller.signal.addEventListener("abort", () => reject(new DOMException("Printing stopped", "AbortError")))
      );
      await Promise.race([req.run(controller.signal), stopped]);
      this.finish(id, "completed", "");
    } catch (err) {
      if (timedOut) {
        this.finish(id, "failed", "The printer didn't respond within 30 seconds. Check it's on and connected, then print again.");
      } else if (err instanceof DOMException && err.name === "AbortError") {
        this.finish(id, "cancelled", "");
      } else {
        this.finish(id, "failed", err instanceof Error ? err.message : "The receipt didn't print");
      }
    } finally {
      clearTimeout(timer);
    }
  }
}
