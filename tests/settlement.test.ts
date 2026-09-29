import { test } from "node:test";
import assert from "node:assert/strict";
import { ObjectId, type Db, type MongoClient } from "mongodb";
import { getNetBalances } from "../src/lib/settlement";
import {
  MongoDebtRepository,
  type DebtDoc,
} from "../src/server/repositories/debt";

const debt = (
  paidBy: string,
  owner: string,
  price: number,
  paid = false,
): DebtDoc => ({
  _id: new ObjectId(),
  title: "Makan",
  paidBy,
  items: [
    { _id: new ObjectId().toHexString(), name: "Nasi", owner, price, paid },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 0,
});

void test("reciprocal debts require only the difference, independent of order", () => {
  const debts = [debt("LO", "KK", 100000), debt("KK", "LO", 40000)];
  assert.deepEqual(getNetBalances(debts), [
    {
      personA: "KK",
      personB: "LO",
      aOwesB: 100000,
      bOwesA: 40000,
      from: "KK",
      to: "LO",
      amount: 60000,
    },
  ]);
  assert.deepEqual(getNetBalances([...debts].reverse()), getNetBalances(debts));
});
void test("reverse direction, equal balances, paid items and personal expenses", () => {
  assert.equal(
    getNetBalances([debt("LO", "KK", 100), debt("KK", "LO", 150)])[0]?.from,
    "LO",
  );
  assert.equal(
    getNetBalances([debt("LO", "KK", 100), debt("KK", "LO", 100)])[0]?.amount,
    0,
  );
  assert.deepEqual(
    getNetBalances([debt("KK", "KK", 100), debt("LO", "KK", 100, true)]),
    [],
  );
});
void test("third parties are kept separate and repeated expenses are added", () => {
  const balances = getNetBalances([
    debt("LO", "KK", 100),
    debt("LO", "KK", 50),
    debt("PP", "LO", 70),
  ]);
  assert.equal(balances.length, 2);
  assert.equal(balances[0]?.amount, 150);
  assert.equal(balances[1]?.amount, 70);
});

// In-memory adapter exercises repository behavior and rolls back on write failure.
function repository(initial: DebtDoc[], failOnWrite = 0) {
  let docs = initial;
  let writes = 0;
  let ended = false;
  const session = {
    async withTransaction<T>(callback: () => Promise<T>) {
      const snapshot = docs.map((doc) => ({
        ...doc,
        items: doc.items.map((item) => ({ ...item })),
      }));
      try {
        return await callback();
      } catch (error) {
        docs = snapshot;
        throw error;
      }
    },
    async endSession() {
      ended = true;
    },
  };
  const collection = {
    find() {
      return {
        async toArray() {
          return docs;
        },
      };
    },
    async updateOne(
      filter: { _id: ObjectId },
      _update: unknown,
      options: { arrayFilters: Array<{ "item.owner": string }> },
    ) {
      if (++writes === failOnWrite) throw new Error("write failed");
      const doc = docs.find((doc) => doc._id.equals(filter._id))!;
      for (const item of doc.items)
        if (item.owner === options.arrayFilters[0]?.["item.owner"])
          item.paid = true;
      return { modifiedCount: 1 };
    },
  };
  return {
    repo: new MongoDebtRepository(
      { collection: () => collection } as unknown as Db,
      { startSession: () => session } as unknown as MongoClient,
    ),
    docs: () => docs,
    ended: () => ended,
  };
}
void test("settlement clears both directions while preserving unrelated and paid items", async () => {
  const a = debt("LO", "KK", 100000);
  a.items.push({
    _id: "third",
    name: "Teh",
    owner: "PP",
    price: 5000,
    paid: false,
  });
  const fixture = repository([a, debt("KK", "LO", 40000)]);
  const preview = await fixture.repo.getSettlementPreview("KK", "LO");
  assert.equal(preview.total, 60000);
  assert.equal(preview.items.length, 2);
  assert.equal(
    await fixture.repo.settleBetween("KK", "LO", preview.revision),
    2,
  );
  assert.equal(fixture.docs()[0]?.items[1]?.paid, false);
  assert.equal(
    (await fixture.repo.getSettlementPreview("KK", "LO")).items.length,
    0,
  );
  await assert.rejects(
    fixture.repo.settleBetween("KK", "LO", preview.revision),
    /Saldo berubah/,
  );
  assert.equal(fixture.ended(), true);
});
void test("stale preview is rejected before any write", async () => {
  const fixture = repository([debt("LO", "KK", 100)]);
  const preview = await fixture.repo.getSettlementPreview("KK", "LO");
  fixture.docs()[0]!.items[0]!.price = 200;
  await assert.rejects(
    fixture.repo.settleBetween("KK", "LO", preview.revision),
    /Saldo berubah/,
  );
  assert.equal(fixture.docs()[0]?.items[0]?.paid, false);
});
void test("equal balances settle without transfer and both sides roll back on failure", async () => {
  const fixture = repository([debt("LO", "KK", 100), debt("KK", "LO", 100)]);
  const preview = await fixture.repo.getSettlementPreview("KK", "LO");
  assert.equal(preview.total, 0);
  await fixture.repo.settleBetween("KK", "LO", preview.revision);
  assert.deepEqual(getNetBalances(fixture.docs()), []);
  const failing = repository([debt("LO", "KK", 100), debt("KK", "LO", 50)], 2);
  const before = await failing.repo.getSettlementPreview("KK", "LO");
  await assert.rejects(
    failing.repo.settleBetween("KK", "LO", before.revision),
    /write failed/,
  );
  assert.ok(
    failing.docs().every((doc) => doc.items.every((item) => !item.paid)),
  );
  assert.equal(failing.ended(), true);
});
