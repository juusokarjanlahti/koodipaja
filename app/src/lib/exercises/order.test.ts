import { describe, expect, it } from "vitest";
import { exerciseNumber, firstUnsolved, numberedTitle } from "./order";

describe("exercise order", () => {
  it("reads the number from the NN- prefix", () => {
    expect(exerciseNumber("03-kahden-luvun-summa")).toBe(3);
    expect(exerciseNumber("java-lukujen-summa")).toBeNull();
  });
  it("prefixes the title with the number", () => {
    expect(numberedTitle("03-kahden-luvun-summa", "Kahden luvun summa")).toBe("3. Kahden luvun summa");
    expect(numberedTitle("java-lukujen-summa", "Lukujen summa")).toBe("Lukujen summa");
  });
  it("finds the first unsolved exercise", () => {
    const items = [{ id: "01-a" }, { id: "02-b" }, { id: "03-c" }];
    expect(firstUnsolved(items, (id) => id === "01-a")?.id).toBe("02-b");
    expect(firstUnsolved(items, () => true)).toBeUndefined();
  });
});
