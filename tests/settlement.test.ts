import { test } from "node:test";
import assert from "node:assert/strict";
import { ObjectId, type Db, type MongoClient } from "mongodb";
import { PeopleEnum } from "../src/server/db/schema";
import { getNetBalances } from "../src/lib/settlement";
import {
  MongoDebtRepository,
  type DebtDoc,
  type DebtItem,
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
      filter: {
        _id: ObjectId;
        version?: number;
        $or?: Array<{ version: number | { $exists: boolean } }>;
      },
      update: {
        $set: { items?: DebtItem[]; title?: string; paidBy?: string };
        $inc?: { version: number };
      },
      options?: { arrayFilters: Array<{ "item.owner": string }> },
    ) {
      if (++writes === failOnWrite) throw new Error("write failed");
      const doc = docs.find((doc) => doc._id.equals(filter._id));
      if (
        !doc ||
        (filter.version !== undefined && doc.version !== filter.version) ||
        (filter.$or &&
          !filter.$or.some((condition) =>
            typeof condition.version === "number"
              ? doc.version === condition.version
              : doc.version === undefined,
          ))
      ) {
        return { matchedCount: 0, modifiedCount: 0 };
      }
      if (update.$set.items) doc.items = update.$set.items;
      if (options) {
        for (const item of doc.items)
          if (
            item.owner === options.arrayFilters[0]?.["item.owner"] &&
            !item.paid
          )
            item.paid = true;
      }
      if (update.$inc) doc.version = (doc.version ?? 0) + update.$inc.version;
      return { matchedCount: 1, modifiedCount: 1 };
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

void test("merged person summary uses net totals and offset items in both directions", async () => {
  const fixture = repository([
    debt("LO", "KK", 100000),
    debt("KK", "LO", 40000),
    debt("KK", "XY", 25000),
    debt("KK", "KK", 999),
    debt("LO", "KK", 999, true),
  ]);
  const payable = await fixture.repo.getDebtSummary("KK", "you_owe");
  assert.equal(payable.grandTotal, 60000);
  assert.equal(payable.parties[0]?.person, "LO");
  assert.deepEqual(
    payable.parties[0]?.items.map((item) => item.price).sort((a, b) => a - b),
    [-40000, 100000],
  );
  const receivable = await fixture.repo.getDebtSummary("LO", "owed_to_you");
  assert.equal(receivable.grandTotal, 60000);
  assert.equal(receivable.parties[0]?.person, "KK");
  assert.equal(
    await fixture.repo
      .getDebtSummary("KK", "owed_to_you")
      .then((s) => s.grandTotal),
    25000,
  );
  assert.equal(
    await fixture.repo
      .getDebtSummary("XY", "you_owe")
      .then((s) => s.grandTotal),
    25000,
  );
});

void test("person summary omits equal balances and updates after settlement", async () => {
  const fixture = repository([debt("LO", "KK", 100), debt("KK", "LO", 100)]);
  for (const direction of ["you_owe", "owed_to_you"] as const) {
    assert.deepEqual(
      (await fixture.repo.getDebtSummary("KK", direction)).parties,
      [],
    );
  }
  const outstanding = repository([debt("LO", "KK", 100), debt("KK", "LO", 40)]);
  const preview = await outstanding.repo.getSettlementPreview("KK", "LO");
  await outstanding.repo.settleBetween("KK", "LO", preview.revision);
  assert.equal(
    (await outstanding.repo.getDebtSummary("KK", "you_owe")).grandTotal,
    0,
  );
});

void test("XY can settle in either direction and only the confirmed pair's items become paid", async () => {
  assert.equal(PeopleEnum.parse("XY"), "XY");
  for (const [payer, receiver] of [
    ["XY", "GT"],
    ["GT", "XY"],
  ] as const) {
    const bill = debt(receiver, payer, 100000);
    bill.items.push({
      _id: "unrelated",
      name: "Teh",
      owner: "KK",
      price: 5000,
      paid: false,
    });
    bill.items.push({
      _id: "already-paid",
      name: "Nasi",
      owner: payer,
      price: 9000,
      paid: true,
    });
    const fixture = repository([bill, debt(payer, receiver, 21100)]);
    const preview = await fixture.repo.getSettlementPreview("XY", "GT");
    assert.equal(preview.from, payer);
    assert.equal(preview.to, receiver);
    assert.equal(preview.total, 78900);
    await fixture.repo.settleBetween("XY", "GT", preview.revision);
    assert.equal(fixture.docs()[0]?.items[0]?.paid, true);
    assert.equal(fixture.docs()[1]?.items[0]?.paid, true);
    assert.equal(fixture.docs()[0]?.items[1]?.paid, false);
    assert.equal(fixture.docs()[0]?.items[2]?.paid, true);
    assert.equal(
      (await fixture.repo.getSettlementPreview("XY", "GT")).items.length,
      0,
    );
    assert.equal(
      (await fixture.repo.getDebtSummary(payer, "you_owe")).grandTotal,
      0,
    );
  }
});

void test("an edit opened before settlement cannot reopen the settled items", async () => {
  const bill = debt("GT", "XY", 78900);
  const staleEdit = {
    title: bill.title,
    paidBy: bill.paidBy,
    items: bill.items.map((item) => ({ ...item })),
    expectedVersion: bill.version,
  };
  const fixture = repository([bill]);
  const preview = await fixture.repo.getSettlementPreview("XY", "GT");
  await fixture.repo.settleBetween("XY", "GT", preview.revision);
  assert.equal(
    await fixture.repo.update(bill._id.toHexString(), staleEdit),
    false,
  );
  assert.equal(fixture.docs()[0]?.items[0]?.paid, true);
});

void test("a new reciprocal item invalidates the preview even if the net amount is unchanged", async () => {
  const fixture = repository([debt("GT", "XY", 78900)]);
  const preview = await fixture.repo.getSettlementPreview("XY", "GT");
  fixture.docs().push(debt("GT", "XY", 1000), debt("XY", "GT", 1000));
  await assert.rejects(
    fixture.repo.settleBetween("XY", "GT", preview.revision),
    /Saldo berubah/,
  );
  assert.ok(
    fixture.docs().every((doc) => doc.items.every((item) => !item.paid)),
  );
});

void test("current edits and legacy documents work, but repeated stale edits are rejected", async () => {
  for (const legacy of [false, true]) {
    const bill = debt("GT", "XY", 78900);
    if (legacy) Reflect.deleteProperty(bill, "version");
    const fixture = repository([bill]);
    const edit = {
      title: bill.title,
      paidBy: bill.paidBy,
      items: bill.items.map((item) => ({ ...item })),
      expectedVersion: 0,
    };
    assert.equal(await fixture.repo.update(bill._id.toHexString(), edit), true);
    assert.equal(
      await fixture.repo.update(bill._id.toHexString(), edit),
      false,
    );
    assert.equal(
      await fixture.repo.update(bill._id.toHexString(), {
        ...edit,
        expectedVersion: 1,
      }),
      true,
    );
  }
});

void test("an empty pair cannot be settled and retrying an old confirmation leaves new debt unpaid", async () => {
  const fixture = repository([]);
  const empty = await fixture.repo.getSettlementPreview("XY", "GT");
  await assert.rejects(
    fixture.repo.settleBetween("XY", "GT", empty.revision),
    /Saldo berubah/,
  );
  fixture.docs().push(debt("GT", "XY", 78900));
  const preview = await fixture.repo.getSettlementPreview("XY", "GT");
  await fixture.repo.settleBetween("XY", "GT", preview.revision);
  fixture.docs().push(debt("GT", "XY", 25000));
  await assert.rejects(
    fixture.repo.settleBetween("XY", "GT", preview.revision),
    /Saldo berubah/,
  );
  assert.equal(fixture.docs()[1]?.items[0]?.paid, false);
  assert.equal(
    (await fixture.repo.getSettlementPreview("XY", "GT")).total,
    25000,
  );
});
