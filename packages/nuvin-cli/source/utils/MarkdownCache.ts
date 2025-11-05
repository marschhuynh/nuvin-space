interface CacheEntry {
	content: string;
	timestamp: number;
	result: string;
}

class MarkdownCache {
	private cache = new Map<string, CacheEntry>();
	private readonly maxAge = 5000;
	private readonly maxSize = 100;

	get(content: string, configHash: string): string | null {
		const key = this.generateKey(content, configHash);
		const entry = this.cache.get(key);

		if (!entry) return null;

		if (Date.now() - entry.timestamp > this.maxAge) {
			this.cache.delete(key);
			return null;
		}

		return entry.result;
	}

	set(content: string, configHash: string, result: string): void {
		const key = this.generateKey(content, configHash);

		if (this.cache.size >= this.maxSize) {
			const oldestKey = this.cache.keys().next().value;
			if (oldestKey) {
				this.cache.delete(oldestKey);
			}
		}

		this.cache.set(key, {
			content,
			timestamp: Date.now(),
			result,
		});
	}

	private generateKey(content: string, configHash: string): string {
		return `${configHash}:${content.length}:${content.slice(0, 100)}`;
	}

	clear(): void {
		this.cache.clear();
	}
}

export const markdownCache = new MarkdownCache();
