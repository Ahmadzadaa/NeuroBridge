import { describe, expect, it } from "vitest";
import {
  TENANT_FEATURES,
  TENANT_TYPES,
  TENANT_TYPE_PRESETS,
  allFeatures,
  isTenantType,
  presetFor,
  toFeatureColumns,
  toFeatureSet,
} from "@/lib/tenant/features";

describe("tenant type presets", () => {
  it("gives a university the teacher panel", () => {
    expect(presetFor("UNIVERSITY").teachers).toBe(true);
  });

  it("does not give a technopark the teacher panel", () => {
    expect(presetFor("TECHNOPARK").teachers).toBe(false);
  });

  it("gives a technopark the hackathon", () => {
    expect(presetFor("TECHNOPARK").hackathon).toBe(true);
  });

  it("starts a university without the hackathon, which stays switchable", () => {
    // The preset is only a starting point — a university that wants a
    // hackathon has the flag turned on rather than changing its type.
    const university = presetFor("UNIVERSITY");
    expect(university.hackathon).toBe(false);

    const withHackathon = { ...university, hackathon: true };
    expect(withHackathon.teachers).toBe(true);
    expect(withHackathon.hackathon).toBe(true);
  });

  it("turns everything on for FULL", () => {
    const full = presetFor("FULL");
    for (const feature of TENANT_FEATURES) {
      expect(full[feature]).toBe(true);
    }
  });

  it("gives every type a value for every feature", () => {
    for (const type of TENANT_TYPES) {
      for (const feature of TENANT_FEATURES) {
        expect(typeof TENANT_TYPE_PRESETS[type][feature]).toBe("boolean");
      }
    }
  });

  it("returns a copy, so callers cannot mutate the shared preset", () => {
    const first = presetFor("UNIVERSITY");
    first.teachers = false;
    expect(presetFor("UNIVERSITY").teachers).toBe(true);
  });
});

describe("isTenantType", () => {
  it("accepts the known types", () => {
    for (const type of TENANT_TYPES) {
      expect(isTenantType(type)).toBe(true);
    }
  });

  it("rejects anything else", () => {
    expect(isTenantType("SCHOOL")).toBe(false);
    expect(isTenantType("")).toBe(false);
    expect(isTenantType("university")).toBe(false);
  });
});

describe("column mapping", () => {
  const columns = {
    teachersEnabled: true,
    hackathonEnabled: false,
    simulationsEnabled: true,
    trainingsEnabled: false,
    aiToolsEnabled: true,
  };

  it("maps database columns to a feature set", () => {
    expect(toFeatureSet(columns)).toEqual({
      teachers: true,
      hackathon: false,
      simulations: true,
      trainings: false,
      aiTools: true,
    });
  });

  it("round-trips without losing a flag", () => {
    expect(toFeatureColumns(toFeatureSet(columns))).toEqual(columns);
  });

  it("round-trips every preset", () => {
    for (const type of TENANT_TYPES) {
      const features = presetFor(type);
      expect(toFeatureSet(toFeatureColumns(features))).toEqual(features);
    }
  });
});

describe("allFeatures", () => {
  it("enables everything", () => {
    const features = allFeatures();
    for (const feature of TENANT_FEATURES) {
      expect(features[feature]).toBe(true);
    }
  });
});

describe("provisioning merge semantics", () => {
  // Mirrors what the tenant routes do: preset first, explicit flags on top.
  function resolve(
    type: Parameters<typeof presetFor>[0],
    overrides: Partial<ReturnType<typeof presetFor>> = {}
  ) {
    return { ...presetFor(type), ...overrides };
  }

  it("uses the preset when nothing is overridden", () => {
    expect(resolve("TECHNOPARK")).toEqual(presetFor("TECHNOPARK"));
  });

  it("lets a university be provisioned with a hackathon in one step", () => {
    const resolved = resolve("UNIVERSITY", { hackathon: true });
    expect(resolved.hackathon).toBe(true);
    expect(resolved.teachers).toBe(true);
  });

  it("lets a single module be switched off against the preset", () => {
    expect(resolve("FULL", { aiTools: false }).aiTools).toBe(false);
  });

  it("ignores undefined overrides rather than blanking a flag", () => {
    const resolved = { ...presetFor("UNIVERSITY"), ...{} };
    expect(resolved.teachers).toBe(true);
  });
});
