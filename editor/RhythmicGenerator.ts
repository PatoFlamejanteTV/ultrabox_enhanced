// Copyright (C) 2024 John Nesky and contributing authors, distributed under the MIT license, see the accompanying LICENSE.md file.

export interface RhythmStep {
	active: boolean;
	accent?: boolean;
	probability?: number;
}

export enum RhythmMode {
	Euclidean = "euclidean",
	Clusters = "clusters",
	BalancedBinary = "balancedBinary",
	Accents = "accents",
	Polyrhythmic = "polyrhythmic",
	Subdivision = "subdivision",
	Mirrored = "mirrored",
	Probabilistic = "probabilistic",
	QuestionAndAnswer = "questionAndAnswer",
	VisualShape = "visualShape",
}

export enum RhythmComplexity {
	Suave = 0,
	Notable = 1,
	Bold = 2,
}

export enum RhythmStyle {
	Regular = 0,
	Saltado = 1,
	Vivo = 2,
}

export class Random {
	private seed: number;
	constructor(seed: number) {
		this.seed = seed % 233280;
		if (this.seed <= 0) this.seed += 233280;
	}
	public next(): number {
		this.seed = (this.seed * 9301 + 49297) % 233280;
		return this.seed / 233280;
	}
}

export class RhythmicGenerator {
	public static generate(
		mode: RhythmMode,
		steps: number,
		density: number,
		rotation: number,
		complexity: RhythmComplexity,
		style: RhythmStyle,
		seed: number
	): RhythmStep[] {
		const rng = new Random(seed);
		let pattern: RhythmStep[] = [];

		switch (mode) {
			case RhythmMode.Euclidean:
				pattern = this._generateEuclidean(steps, density, rotation);
				break;
			case RhythmMode.Clusters:
				pattern = this._generateClusters(steps, density, rotation, rng);
				break;
			case RhythmMode.BalancedBinary:
				pattern = this._generateBalancedBinary(steps, density, rotation, rng);
				break;
			case RhythmMode.Accents:
				pattern = this._generateAccents(steps, density, rotation, rng);
				break;
			case RhythmMode.Polyrhythmic:
				pattern = this._generatePolyrhythmic(steps, density, rotation, rng);
				break;
			case RhythmMode.Subdivision:
				pattern = this._generateSubdivision(steps, density, rotation);
				break;
			case RhythmMode.Mirrored:
				pattern = this._generateMirrored(steps, density, rotation, rng);
				break;
			case RhythmMode.Probabilistic:
				pattern = this._generateProbabilistic(steps, density, rotation, rng);
				break;
			case RhythmMode.QuestionAndAnswer:
				pattern = this._generateQuestionAndAnswer(steps, density, rotation, complexity, rng);
				break;
			case RhythmMode.VisualShape:
				pattern = this._generateVisualShape(steps, density, rotation, style);
				break;
			default:
				pattern = this._generateEuclidean(steps, density, rotation);
		}

		// Apply complexity variations
		if (complexity > RhythmComplexity.Suave) {
			this._applyComplexity(pattern, complexity, rng);
		}

		// Apply style variations
		this._applyStyle(pattern, style, rng);

		// Musical Safety Rules
		this._ensureMusicalSafety(pattern, steps, rng);

		return pattern;
	}

	private static _generateEuclidean(steps: number, density: number, rotation: number): RhythmStep[] {
		const pulses = Math.max(1, Math.round(steps * density));
		const bjorklund = this._bjorklund(steps, pulses);

		// Rotation
		const rotated = this._rotate(bjorklund, rotation);

		return rotated.map(active => ({ active: active === 1 }));
	}

	private static _bjorklund(steps: number, pulses: number): number[] {
		steps = Math.max(1, steps);
		pulses = Math.max(0, Math.min(steps, pulses));

		let columns: number[][] = [];
		for (let step = 0; step < steps; step++) {
			columns.push([step < pulses ? 1 : 0]);
		}

		let a = pulses;
		let b = steps - pulses;
		while (b > 1) {
			const amountToMove = Math.min(a, b);
			for (let i = 0; i < amountToMove; i++) {
				const moved = columns.pop()!;
				for (const v of moved) columns[i].push(v);
			}
			if (a > b) {
				a = b;
				b = a - b; // This is not exactly Bjorklund but Euclidean-like
				// Bjorklund is more about grouping.
			} else {
				b = b - a;
			}
			// Toussaint's actual Bjorklund is a bit different, let's use a simpler iterative approach for Euclidean distribution
		}

		// Let's use the Bresenham-based Euclidean algorithm for better reliability
		const pattern: number[] = [];
		let accumulator = 0;
		for (let i = 0; i < steps; i++) {
			accumulator += pulses;
			if (accumulator >= steps) {
				pattern.push(1);
				accumulator -= steps;
			} else {
				pattern.push(0);
			}
		}
		return pattern;
	}

	private static _rotate<T>(arr: T[], rotation: number): T[] {
		const n = arr.length;
		const offset = ((rotation % n) + n) % n;
		if (offset === 0) return [...arr];
		return arr.slice(n - offset).concat(arr.slice(0, n - offset));
	}

	private static _generateClusters(steps: number, density: number, rotation: number, rng: Random): RhythmStep[] {
		const pulses = Math.max(1, Math.round(steps * density));
		const pattern = new Array(steps).fill(0);

		let remainingPulses = pulses;
		let i = 0;
		while (remainingPulses > 0) {
			const clusterSize = rng.next() > 0.5 ? 2 : 1;
			const size = Math.min(clusterSize, remainingPulses);
			for (let j = 0; j < size; j++) {
				pattern[(i + j) % steps] = 1;
			}
			remainingPulses -= size;
			i += size + (rng.next() > 0.3 ? 2 : 1);
			if (i >= steps * 2) break; // Safety
		}

		const rotated = this._rotate(pattern, rotation);
		return rotated.map(active => ({ active: active === 1 }));
	}

	private static _generateBalancedBinary(steps: number, density: number, rotation: number, rng: Random): RhythmStep[] {
		const pattern: number[] = [];
		let balance = 0;
		for (let i = 0; i < steps; i++) {
			const threshold = density - (balance * 0.2);
			const active = rng.next() < threshold ? 1 : 0;
			pattern.push(active);
			balance += active === 1 ? 1 : -1;
		}
		const rotated = this._rotate(pattern, rotation);
		return rotated.map(active => ({ active: active === 1 }));
	}

	private static _generateAccents(steps: number, density: number, rotation: number, rng: Random): RhythmStep[] {
		const base = this._generateEuclidean(steps, density, rotation);
		for (let i = 0; i < steps; i++) {
			if (base[i].active) {
				// Prioritize accents: start, groups (divisible by 4 or 3), end
				if (i === 0 || i === steps - 1 || i % 4 === 0 || i % 3 === 0) {
					base[i].accent = rng.next() < 0.7;
				} else {
					base[i].accent = rng.next() < 0.2;
				}
			}
		}
		return base;
	}

	private static _generatePolyrhythmic(steps: number, density: number, rotation: number, rng: Random): RhythmStep[] {
		const cycleB = steps % 4 === 0 ? steps * 0.75 : steps * 0.66;
		const lenB = Math.max(2, Math.floor(cycleB));

		const pattern: RhythmStep[] = [];
		for (let i = 0; i < steps; i++) {
			const activeA = (i * Math.round(steps * density / 2)) % steps < Math.round(steps * density / 2);
			const activeB = (i * Math.round(lenB * density / 2)) % lenB < Math.round(lenB * density / 2);
			pattern.push({ active: activeA || activeB });
		}

		return this._rotate(pattern, rotation);
	}

	private static _generateSubdivision(steps: number, density: number, rotation: number): RhythmStep[] {
		const pattern = new Array(steps).fill(false);
		const layers = [1, 2, 4, 8, 16, 32].filter(l => l <= steps);
		const layersToUse = Math.max(1, Math.round(layers.length * density));

		for (let l = 0; l < layersToUse; l++) {
			const interval = steps / layers[l];
			for (let i = 0; i < steps; i += interval) {
				pattern[Math.floor(i)] = true;
			}
		}

		const rotated = this._rotate(pattern, rotation);
		return rotated.map(active => ({ active }));
	}

	private static _generateMirrored(steps: number, density: number, rotation: number, rng: Random): RhythmStep[] {
		const halfSteps = Math.floor(steps / 2);
		const halfPattern = this._generateEuclidean(halfSteps, density, 0);
		const pattern = [...halfPattern];
		for (let i = halfSteps - 1; i >= 0; i--) {
			pattern.push({ ...halfPattern[i] });
		}
		while (pattern.length < steps) {
			pattern.push({ active: false });
		}
		return this._rotate(pattern, rotation);
	}

	private static _generateProbabilistic(steps: number, density: number, rotation: number, rng: Random): RhythmStep[] {
		const pattern: RhythmStep[] = [];
		for (let i = 0; i < steps; i++) {
			if (i === 0 || i === steps - 1) {
				pattern.push({ active: true });
			} else if (i % 2 !== 0) { // Weak beats
				pattern.push({ active: rng.next() < density, probability: 0.5 + density * 0.5 });
			} else {
				pattern.push({ active: rng.next() < density * 0.5 });
			}
		}
		return this._rotate(pattern, rotation);
	}

	private static _generateQuestionAndAnswer(steps: number, density: number, rotation: number, complexity: RhythmComplexity, rng: Random): RhythmStep[] {
		const halfSteps = Math.floor(steps / 2);
		const qPattern = this._generateEuclidean(halfSteps, density, 0);
		const aPattern = qPattern.map(s => ({ ...s }));

		const changeProb = complexity === RhythmComplexity.Bold ? 0.3 : 0.15;
		for (let i = 0; i < halfSteps; i++) {
			if (rng.next() < changeProb) {
				aPattern[i].active = !aPattern[i].active;
			}
		}

		const pattern = qPattern.concat(aPattern);
		while (pattern.length < steps) {
			pattern.push({ active: false });
		}
		return this._rotate(pattern, rotation);
	}

	private static _generateVisualShape(steps: number, density: number, rotation: number, style: RhythmStyle): RhythmStep[] {
		const pattern: RhythmStep[] = [];
		for (let i = 0; i < steps; i++) {
			let localDensity = density;
			const progress = i / steps;

			// Define some shapes based on style if we don't have a drawing
			if (style === RhythmStyle.Regular) {
				// Flat
			} else if (style === RhythmStyle.Saltado) {
				// Arch
				localDensity *= 1.0 - Math.abs(progress - 0.5) * 2;
			} else if (style === RhythmStyle.Vivo) {
				// Ramp up
				localDensity *= progress;
			}

			pattern.push({ active: (i * 1.618) % 1.0 < localDensity });
		}
		return this._rotate(pattern, rotation);
	}

	private static _applyComplexity(pattern: RhythmStep[], complexity: RhythmComplexity, rng: Random): void {
		const changeAmount = complexity === RhythmComplexity.Bold ? 0.3 : 0.15;
		for (let i = 0; i < pattern.length; i++) {
			if (i === 0) continue; // Preserve downbeat
			if (rng.next() < changeAmount) {
				// Flip active state or add accent
				if (rng.next() > 0.5) {
					pattern[i].active = !pattern[i].active;
				} else if (pattern[i].active) {
					pattern[i].accent = !pattern[i].accent;
				}
			}
		}
	}

	private static _applyStyle(pattern: RhythmStep[], style: RhythmStyle, rng: Random): void {
		if (style === RhythmStyle.Regular) return;

		for (let i = 0; i < pattern.length; i++) {
			if (style === RhythmStyle.Saltado && i % 2 !== 0 && pattern[i].active) {
				// Swing feel: push offbeats slightly
				pattern[i].probability = 0.8;
			}
			if (style === RhythmStyle.Vivo && !pattern[i].active && rng.next() < 0.1) {
				// Add ghost notes
				pattern[i].active = true;
				pattern[i].probability = 0.4;
			}
		}
	}

	private static _ensureMusicalSafety(pattern: RhythmStep[], steps: number, rng: Random): void {
		// Never empty
		if (!pattern.some(s => s.active)) {
			pattern[0].active = true;
		}
		// Preserve first beat (usually)
		if (!pattern[0].active && rng.next() < 0.9) {
			pattern[0].active = true;
		}
		// Close strong on last step
		if (steps > 1 && !pattern[steps - 1].active && rng.next() < 0.5) {
			pattern[steps - 1].active = true;
			pattern[steps - 1].accent = true;
		}
	}
}
