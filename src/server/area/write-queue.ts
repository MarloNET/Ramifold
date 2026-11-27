// Jobs per plan one after another (TechSpec 2.0, 2.12, FIND-024): write jobs (compare stamp, write, refresh stamp)
// and check jobs when opening run in the order they were enqueued; a job ends only after its stamp is refreshed.
// Jobs of different plans do not wait for each other.

export class WriteQueue {
  private readonly tails = new Map<string, Promise<void>>();

  run<T>(planId: string, job: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(planId) ?? Promise.resolve();
    const result = previous.then(job);
    const tail = result.then(
      () => undefined,
      () => undefined,
    );
    this.tails.set(planId, tail);
    void tail.then(() => {
      if (this.tails.get(planId) === tail) this.tails.delete(planId);
    });
    return result;
  }
}
