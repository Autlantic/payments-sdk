import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { paginateById } from "./list-page";

describe("paginateById", () => {
  const rows = Array.from({ length: 5 }, (_, i) => ({ id: `id_${i}` }));

  it("returns first page with hasMore", () => {
    const page = paginateById(rows, { limit: 2 });
    assert.deepEqual(
      page.data.map((r) => r.id),
      ["id_0", "id_1"],
    );
    assert.equal(page.hasMore, true);
    assert.equal(page.nextCursor, "id_1");
  });

  it("continues after cursor", () => {
    const page = paginateById(rows, { limit: 2, startingAfter: "id_1" });
    assert.deepEqual(
      page.data.map((r) => r.id),
      ["id_2", "id_3"],
    );
    assert.equal(page.nextCursor, "id_3");
  });

  it("ends without nextCursor", () => {
    const page = paginateById(rows, { limit: 10 });
    assert.equal(page.data.length, 5);
    assert.equal(page.hasMore, false);
    assert.equal(page.nextCursor, null);
  });
});
