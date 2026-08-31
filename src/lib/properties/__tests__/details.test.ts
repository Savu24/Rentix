import { describe, expect, it } from "vitest";

import { formatDistance, mapsUrl } from "@/lib/properties/details";

describe("formatDistance", () => {
  it("do kilometra podaje metry", () => {
    expect(formatDistance(350)).toBe("350 m");
    expect(formatDistance(999)).toBe("999 m");
  });

  it("od kilometra przechodzi na kilometry z przecinkiem", () => {
    // „1300 m" nikt tak nie mówi, a przecinek dziesiętny jest polski.
    expect(formatDistance(1300)).toBe("1,3 km");
    expect(formatDistance(2450)).toBe("2,5 km");
  });

  it("pełne kilometry zostawia bez ogona", () => {
    expect(formatDistance(1000)).toBe("1 km");
    expect(formatDistance(3000)).toBe("3 km");
  });

  it("zero to zero metrów, nie puste pole", () => {
    // „Przystanek pod blokiem" to informacja, a nie brak danych.
    expect(formatDistance(0)).toBe("0 m");
  });
});

describe("mapsUrl", () => {
  it("usuwa spację między współrzędnymi", () => {
    // Ze spacją mapy traktują parametr jak wyszukiwanie tekstu i nie stawiają
    // pinezki w punkcie.
    expect(mapsUrl("52.2297, 21.0122")).toBe("https://www.google.com/maps?q=52.2297%2C21.0122");
  });
});
