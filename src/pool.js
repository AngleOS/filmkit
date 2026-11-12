// HyperFrames runs at once. Each `hyperframes check` holds a Chrome of about 0.6 GB resident (measured on the smoke
// film, 2026-11-12) and keeps a core or two busy, so allow one per 4 GB of memory and per two cores: 2 on an 8 GB
// laptop. Total memory, not free: macOS counts its file cache as used, so its free memory reads near zero.
import { availableParallelism, totalmem } from "node:os";

const GB = 1024 ** 3;

/** @param {number} [cores] @param {number} [memory] in bytes */
export const slots = (cores = availableParallelism(), memory = totalmem()) =>
  Math.max(1, Math.min(Math.floor(cores / 2), Math.floor(memory / (4 * GB))));

/**
 * Runs `task` on every item, at most `limit` at a time, and resolves to the results in the items' order.
 * @template T, R
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T) => Promise<R>} task
 * @returns {Promise<R[]>}
 */
export async function pool(items, limit, task) {
  /** @type {R[]} */
  const results = [];
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await task(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
