import { makeValue, ValueFunctions } from "garbo-lib";
import {
  gamedayToInt,
  gametimeToInt,
  getCloset,
  getStorage,
  Item,
  myAscensions,
  myClosetMeat,
  myStorageMeat,
  myTurncount,
  print,
  toItem,
} from "kolmafia";
import { $item, $items, get, getFoldGroup, Session, set } from "libram";

let _valueFunctions: ValueFunctions | undefined;
function garboValueFunctions(): ValueFunctions {
  return (_valueFunctions ??= makeValue({
    itemValues: new Map([[$item`fake hand`, 50_000]]),
  }));
}

export function garboValue(item: Item): number {
  return garboValueFunctions().value(item);
}

export function garboAverageValue(...items: Item[]): number {
  return garboValueFunctions().averageValue(...items);
}

class DailySetting<T> {
  key: string;

  constructor(key: string) {
    this.key = key;
  }

  get(def: T): T {
    const saved = get(this.key, "");
    if (saved === "") return def;
    const json = JSON.parse(saved);
    if ("day" in json && "value" in json && json["day"] === gamedayToInt()) return json["value"];
    else return def;
  }

  set(value: T) {
    set(
      this.key,
      JSON.stringify({
        day: gamedayToInt(),
        value: value,
      })
    );
  }
}

export type ProfitRecord = {
  meat: number;
  items: number;
  turns: number;
  hours: number;
};
export type Records = {
  [name: string]: ProfitRecord;
};

export class ProfitTracker {
  setting: DailySetting<Records>;
  records: Records;
  session: Session;
  turns: number;
  hours: number;
  pulled: Set<Item>;
  ascensions: number;

  constructor(key: string) {
    this.setting = new DailySetting<Records>(key);

    this.records = this.setting.get({});
    this.session = getCurrentSession();
    this.turns = myTurncount();
    this.hours = gametimeToInt() / (1000 * 60 * 60);
    this.ascensions = myAscensions();
    this.pulled = new Set<Item>(
      get("_roninStoragePulls")
        .split(",")
        .map((id) => parseInt(id))
        .filter((id) => id > 0)
        .map((id) => Item.get(id))
    );
  }

  reset(): void {
    this.session = getCurrentSession();
    this.turns = myTurncount();
    this.hours = gametimeToInt() / (1000 * 60 * 60);
    this.ascensions = myAscensions();
    this.pulled = new Set<Item>(
      get("_roninStoragePulls")
        .split(",")
        .map((id) => parseInt(id))
        .filter((id) => id > 0)
        .map((id) => Item.get(id))
    );
  }

  record(tag: string, taskName: string): void {
    if (this.ascensions < myAscensions()) {
      // Session tracking is not accurate across ascensions
      this.reset();
      return;
    }

    // Pulled items are tracked oddly in the Session
    // (they are included in the Session diff by default)
    const newPulls = new Set<Item>(
      get("_roninStoragePulls")
        .split(",")
        .map((id) => parseInt(id))
        .filter((id) => id > 0)
        .map((id) => Item.get(id))
    );
    for (const item of newPulls) {
      if (this.pulled.has(item)) continue;
      this.session.items.set(item, 1 + (this.session.items.get(item) ?? 0));
    }

    const diff = getCurrentSession().diff(this.session);
    if (!(tag in this.records)) this.records[tag] = { meat: 0, items: 0, turns: 0, hours: 0 };

    const value = diff.value(garboValue);
    this.records[tag].meat += value.meat;
    this.records[tag].items += value.items;
    this.records[tag].turns += myTurncount() - this.turns;
    this.records[tag].hours += gametimeToInt() / (1000 * 60 * 60) - this.hours;
    print(
      `Profit for ${taskName}: ${value.meat}, ${value.items}, ${myTurncount() - this.turns}, ${
        gametimeToInt() / (1000 * 60 * 60) - this.hours
      }`
    );
    this.reset();
  }

  all(): Records {
    return this.records;
  }

  save(): void {
    this.setting.set(this.records);
  }
}

function getCurrentSession(): Session {
  /*
  Libram includes getStorage() in the generated session, since pulling an
  item in-ronin does indeed modify the underlying mafia session tracking,
  i.e., -1 from getStorage and +1 from mySessionItems.
  But pulling all items out of ronin does not modify the underling mafia
  session tracking, i.e., -1 from getStorage but +0 from mySessionItems.
  Since we already handle in-ronin pulls above (see ProfitTracker.pulled),
  we just ignore getStorage from the Session.
  This should be changed if libram/mafia changes how stored items are tracked.
  */
  const manyToOne = (primary: Item, mapped: Item[]): [Item, Item][] =>
    mapped.map((target: Item) => [target, primary]);
  const foldable = (item: Item): [Item, Item][] => manyToOne(item, getFoldGroup(item));
  const itemMappings = new Map<Item, Item>([
    ...foldable($item`liar's pants`),
    ...foldable($item`ice pick`),
    ...manyToOne($item`Spooky Putty sheet`, [
      $item`Spooky Putty monster`,
      ...getFoldGroup($item`Spooky Putty sheet`),
    ]),
    ...foldable($item`stinky cheese sword`),
    ...foldable($item`naughty paper shuriken`),
    ...foldable($item`Loathing Legion knife`),
    ...foldable($item`deceased crimbo tree`),
    ...foldable($item`makeshift turban`),
    ...foldable($item`turtle wax shield`),
    ...foldable($item`metallic foil bow`),
    ...foldable($item`ironic moustache`),
    ...foldable($item`bugged balaclava`),
    ...foldable($item`toggle switch (Bartend)`),
    ...foldable($item`mushroom cap`),
    ...manyToOne($item`can of Rain-Doh`, $items`empty Rain-Doh can`),
    ...manyToOne(
      $item`meteorite fragment`,
      $items`meteorite earring, meteorite necklace, meteorite ring`
    ),
    ...manyToOne(
      $item`Sneaky Pete's leather jacket`,
      $items`Sneaky Pete's leather jacket (collar popped)`
    ),
    ...manyToOne($item`Boris's Helm`, $items`Boris's Helm (askew)`),
    ...manyToOne($item`Jarlsberg's pan`, $items`Jarlsberg's pan (Cosmic portal mode)`),
    ...manyToOne(
      $item`tiny plastic sword`,
      $items`grogtini, bodyslam, dirty martini, vesper, cherry bomb, sangria del diablo`
    ),
    ...manyToOne(
      $item`earthenware muffin tin`,
      $items`blueberry muffin, bran muffin, chocolate chip muffin`
    ),
  ]);
  const result = Session.current();
  for (const inventoryFunc of [getCloset, getStorage]) {
    for (const [itemStr, quantity] of Object.entries(inventoryFunc())) {
      const item = toItem(itemStr);
      const mappedItem = itemMappings.get(item) ?? item;
      result.register(mappedItem, -1 * quantity);
    }
  }
  result.register("meat", -1 * myStorageMeat());
  result.register("meat", -1 * myClosetMeat());
  return result;
}

function sum(record: Records, where: (key: string) => boolean): ProfitRecord {
  const included: ProfitRecord[] = [];
  for (const key in record) {
    if (where(key)) included.push(record[key]);
  }
  return {
    meat: included.reduce((v, p) => v + p.meat, 0),
    items: included.reduce((v, p) => v + p.items, 0),
    turns: included.reduce((v, p) => v + p.turns, 0),
    hours: included.reduce((v, p) => v + p.hours, 0),
  };
}

function numberWithCommas(x: number): string {
  const str = x.toString();
  if (str.includes(".")) return x.toFixed(2);
  return str.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function printProfitSegment(key: string, record: ProfitRecord, color: string) {
  if (record === undefined) return;
  print(
    `${key}: ${numberWithCommas(record.meat)} meat + ${numberWithCommas(record.items)} items (${
      record.turns
    } turns + ${numberWithCommas(record.hours)} hours)`,
    color
  );
}

export function printProfits(records: Records): void {
  print("");
  print("== Daily Loop Profit ==");
  printProfitSegment(
    "Aftercore",
    sum(records, (key) => key.startsWith("0")),
    "blue"
  );
  for (const key in records) {
    if (key.startsWith("0")) printProfitSegment(`* ${key.substring(2)}`, records[key], "green");
  }

  printProfitSegment(
    "Grey You",
    sum(records, (key) => key.startsWith("1")),
    "blue"
  );
  for (const key in records) {
    if (key.startsWith("1")) printProfitSegment(`* ${key.substring(2)}`, records[key], "green");
  }

  printProfitSegment(
    "Total",
    sum(records, () => true),
    "black"
  );
}
