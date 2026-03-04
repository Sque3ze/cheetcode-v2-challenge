/**
 * CheetCode v2 — Seed-based deterministic data generation.
 *
 * Produces a seeded PRNG from sessionId + SERVER_SECRET.
 * All challenge data for a session is derived from this seed,
 * making it deterministic (same seed = same data) but unpredictable
 * without the secret.
 */

import { createHash } from "crypto";

/**
 * Derive a numeric seed from a sessionId and server secret.
 * Uses SHA-256 to produce a deterministic hash, then extracts
 * a 32-bit integer from the first 4 bytes.
 */
export function deriveSeed(sessionId: string, serverSecret: string): number {
  const hash = createHash("sha256")
    .update(`${sessionId}:${serverSecret}`)
    .digest();
  // Read first 4 bytes as unsigned 32-bit integer
  return hash.readUInt32BE(0);
}

// Fast, well-distributed 32-bit PRNG. Good enough for data generation.

export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  /** Returns a float in [0, 1) */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns an integer in [min, max] (inclusive) */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Returns a float in [min, max) */
  float(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /** Pick a random element from an array */
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** Pick N unique elements from an array */
  pickN<T>(arr: readonly T[], n: number): T[] {
    const copy = [...arr];
    const count = Math.min(n, copy.length);
    const result: T[] = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(this.next() * copy.length);
      result.push(copy[idx]);
      copy.splice(idx, 1);
    }
    return result;
  }

  /** Shuffle an array (Fisher-Yates) */
  shuffle<T>(arr: readonly T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /** Generate a random string of given length from a charset */
  string(length: number, charset = "abcdefghijklmnopqrstuvwxyz0123456789"): string {
    let result = "";
    for (let i = 0; i < length; i++) {
      result += charset[Math.floor(this.next() * charset.length)];
    }
    return result;
  }
}

const FIRST_NAMES = [
  "Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Henry",
  "Iris", "Jack", "Karen", "Leo", "Maya", "Nathan", "Olivia", "Paul",
  "Quinn", "Rachel", "Sam", "Tina", "Uma", "Victor", "Wendy", "Xavier",
  "Yara", "Zane", "Aria", "Blake", "Cleo", "Derek", "Ella", "Finn",
  "Gemma", "Hugo", "Ivy", "Joel", "Kira", "Liam", "Mila", "Noah",
] as const;

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
  "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark",
  "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King",
  "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
] as const;

const DEPARTMENTS = [
  "Engineering", "Design", "Marketing", "Sales", "Finance",
  "Operations", "Product", "Support", "Legal", "HR",
] as const;

const PRODUCT_NAMES = [
  "CloudSync", "DataFlow", "NetShield", "AppForge", "CodeVault",
  "StreamLine", "TaskPilot", "LogicHub", "ByteWave", "PixelForge",
  "FlowStack", "NodePulse", "GridSpark", "LinkBridge", "CoreShift",
] as const;

const CITIES = [
  "New York", "San Francisco", "London", "Tokyo", "Berlin",
  "Sydney", "Toronto", "Singapore", "Austin", "Seattle",
  "Portland", "Denver", "Chicago", "Boston", "Miami",
] as const;

const COLORS = [
  "red", "blue", "green", "yellow", "purple", "orange", "teal",
  "pink", "cyan", "indigo", "amber", "emerald", "rose", "violet",
] as const;

export interface PersonData {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  department: string;
  role: string;
  salary: number;
  startDate: string;
  city: string;
  age: number;
}

export interface ProductData {
  name: string;
  price: number;
  category: string;
  stock: number;
  rating: number;
  sku: string;
}

/**
 * ChallengeDataGenerator provides deterministic data generation
 * methods for building challenge content. Each method call advances
 * the PRNG state, so the order of calls matters for reproducibility.
 *
 * Usage:
 *   const gen = new ChallengeDataGenerator(sessionId, serverSecret);
 *   const data = gen.forChallenge("tier1-form-fill");
 *   // data.rng is a SeededRandom scoped to this challenge
 *   // data.people(), data.products(), etc. generate arrays
 */
export class ChallengeDataGenerator {
  private baseSeed: number;

  constructor(sessionId: string, serverSecret: string) {
    this.baseSeed = deriveSeed(sessionId, serverSecret);
  }

  /**
   * Get a challenge-scoped RNG and data helpers.
   * Each challenge gets its own deterministic sub-seed so
   * adding/removing challenges doesn't affect other challenges' data.
   */
  forChallenge(challengeId: string): ChallengeData {
    const challengeSeed = deriveSeed(
      `${this.baseSeed}:${challengeId}`,
      challengeId
    );
    return new ChallengeData(new SeededRandom(challengeSeed));
  }
}

export class ChallengeData {
  readonly rng: SeededRandom;

  constructor(rng: SeededRandom) {
    this.rng = rng;
  }

  /** Generate a person with all fields populated */
  person(): PersonData {
    const firstName = this.rng.pick(FIRST_NAMES);
    const lastName = this.rng.pick(LAST_NAMES);
    const department = this.rng.pick(DEPARTMENTS);
    const roles: Record<string, string[]> = {
      Engineering: ["Software Engineer", "Senior Engineer", "Tech Lead", "Staff Engineer", "Principal Engineer"],
      Design: ["UI Designer", "UX Researcher", "Design Lead", "Product Designer", "Visual Designer"],
      Marketing: ["Marketing Manager", "Content Strategist", "Growth Lead", "Brand Manager", "SEO Analyst"],
      Sales: ["Account Executive", "Sales Manager", "BDR", "VP Sales", "Solutions Engineer"],
      Finance: ["Financial Analyst", "Controller", "CFO", "Accountant", "Treasury Manager"],
      Operations: ["Operations Manager", "Project Manager", "Scrum Master", "DevOps Engineer", "SRE"],
      Product: ["Product Manager", "Senior PM", "VP Product", "Product Analyst", "Program Manager"],
      Support: ["Support Engineer", "Support Lead", "Customer Success Manager", "Technical Writer", "QA Engineer"],
      Legal: ["Legal Counsel", "Paralegal", "Compliance Officer", "Contract Manager", "IP Attorney"],
      HR: ["HR Manager", "Recruiter", "People Ops", "Talent Lead", "HR Business Partner"],
    };
    const role = this.rng.pick(roles[department] ?? ["Associate"]);
    const salary = this.rng.int(50, 200) * 1000;
    const year = this.rng.int(2018, 2025);
    const month = this.rng.int(1, 12);
    const day = this.rng.int(1, 28);
    const startDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    return {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      department,
      role,
      salary,
      startDate,
      city: this.rng.pick(CITIES),
      age: this.rng.int(22, 62),
    };
  }

  /** Generate N people */
  people(count: number): PersonData[] {
    return Array.from({ length: count }, () => this.person());
  }

  /** Generate a product */
  product(): ProductData {
    const categories = ["Software", "Hardware", "Services", "Analytics", "Security"];
    return {
      name: this.rng.pick(PRODUCT_NAMES),
      price: this.rng.int(10, 500) + this.rng.int(0, 99) / 100,
      category: this.rng.pick(categories),
      stock: this.rng.int(0, 1000),
      rating: Math.round(this.rng.float(1, 5) * 10) / 10,
      sku: this.rng.string(8, "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"),
    };
  }

  /** Generate N products */
  products(count: number): ProductData[] {
    return Array.from({ length: count }, () => this.product());
  }

  /** Generate a random integer in [min, max] */
  int(min: number, max: number): number {
    return this.rng.int(min, max);
  }

  /** Pick from an array */
  pick<T>(arr: readonly T[]): T {
    return this.rng.pick(arr);
  }

  /** Pick N unique from an array */
  pickN<T>(arr: readonly T[], n: number): T[] {
    return this.rng.pickN(arr, n);
  }

  /** Shuffle an array */
  shuffle<T>(arr: readonly T[]): T[] {
    return this.rng.shuffle(arr);
  }

  /** Generate a color */
  color(): string {
    return this.rng.pick(COLORS);
  }

  /** Generate a city */
  city(): string {
    return this.rng.pick(CITIES);
  }

  /** Generate a name */
  name(): string {
    return `${this.rng.pick(FIRST_NAMES)} ${this.rng.pick(LAST_NAMES)}`;
  }
}
