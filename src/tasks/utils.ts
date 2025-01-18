import {
  chew,
  cliExecute,
  Effect,
  Familiar,
  fullnessLimit,
  getCampground,
  inebrietyLimit,
  Item,
  itemAmount,
  Location,
  mallPrice,
  Monster,
  myAdventures,
  myClass,
  myFamiliar,
  myFullness,
  myInebriety,
  myLevel,
  mySpleenUse,
  retrieveItem,
  spleenLimit,
  use,
  visitUrl,
} from "kolmafia";
import {
  $class,
  $effects,
  $familiar,
  $familiars,
  $item,
  $items,
  $location,
  $phylum,
  $skill,
  get,
  getBanishedMonsters,
  have,
  Macro,
  Snapper,
} from "libram";
import { CombatStrategy, OutfitSpec, Task } from "grimoire-kolmafia";
import { garboAverageValue, garboValue } from "../engine/profits";
import { args } from "../args";

export function haveAll(its: Item[]): boolean {
  return its.reduce((a, it) => a && have(it), true);
}
export function haveAny(its: Item[]): boolean {
  return its.reduce((a, it) => a || have(it), false);
}

type MoonSign =
  | number
  | "mongoose"
  | "wallaby"
  | "vole"
  | "platypus"
  | "opossum"
  | "marmot"
  | "wombat"
  | "blender"
  | "packrat"
  | "gnomads"
  | "knoll"
  | "canadia";
export function toMoonSign(str: string | MoonSign): MoonSign {
  if (
    typeof str === "string" &&
    [
      "mongoose",
      "wallaby",
      "vole",
      "platypus",
      "opossum",
      "marmot",
      "wombat",
      "blender",
      "packrat",
      "gnomads",
      "knoll",
      "canadia",
    ].includes(str)
  )
    return str as MoonSign;
  throw new Error(`${str} is not a valid MoonSign`);
}

const minusMLItems = $items`nasty rat mask, Drowsy Sword, HOA regulation book, pocketwatch on a chain, security flashlight, Space Trip safety headphones, pine cone necklace, red badge, mushroom badge, water wings for babies, white earbuds, discarded bowtie`;
export function noML(): string {
  return `-ml, ${minusMLItems
    .filter((it) => have(it))
    .map((it) => `-equip ${it.name}`)
    .join(", ")}`;
}

export function maxBase(): string {
  return `175 bonus June Cleaver, ${
    garboValue($item`FunFunds™`) / 20 + 5
  } bonus lucky gold ring, 250 bonus Mr. Cheeng's spectacles, ${
    0.4 * get("valueOfAdventure")
  } bonus mafia thumb ring, ${
    get("sweat") + get("_sweatOutSomeBoozeUsed") * 25 < 75 ? "250 bonus designer sweatpants," : ""
  } 100 bonus Pantsgiving, 10 bonus tiny stillsuit`;
}

function famValue(fam: Familiar, mob?: Monster) {
  switch (fam) {
    case $familiar`Grey Goose`:
      return (myClass() === $class`Grey Goo` || myLevel() < args.targetlevel) &&
        $familiar`Grey Goose`.experience < 400
        ? 6000
        : 0;
    case $familiar`Red-Nosed Snapper`:
      if (mob && Snapper.getTrackedPhylum() && mob.phylum === Snapper.getTrackedPhylum())
        return (
          garboValue(
            Snapper.phylumItem.get(Snapper.getTrackedPhylum() || $phylum`none`) || $item`none`
          ) / 11
        );
      return 0;
    case $familiar`Cookbookbat`:
      return $items``.find((it) => it.name.indexOf("Recipe of Before Yore") >= 0 && have(it))
        ? garboAverageValue(
            ...$items`Yeast of Boris, Vegetable of Jarlsberg, St. Sneaky Pete's Whey`
          ) *
            (3.0 / 11)
        : 5000;
    case $familiar`Shorter-Order Cook`:
      return (
        garboAverageValue(
          ...$items`short white, short beer, short glass of water, short stack of pancakes, short stick of butter`
        ) / 11
      );
  }
  return 0;
}

export function meatFam() {
  return (
    $familiars`Space Jellyfish, Robortender, Hobo Monkey, Cat Burglar`.find((fam) => have(fam)) ||
    $familiar`Leprechaun`
  );
}

export function bestFam(mob?: Monster) {
  const fams = $familiars`Grey Goose, Red-Nosed Snapper, Cookbookbat, Shorter-Order Cook`
    .filter((fam) => have(fam))
    .sort((a, b) => famValue(b, mob) - famValue(a, mob));
  return fams.find((fam) => have(fam));
}

export function canDiet(): boolean {
  return (
    myFullness() < fullnessLimit() ||
    mySpleenUse() < spleenLimit() ||
    myInebriety() < inebrietyLimit() ||
    (have($item`distention pill`) && !get("_distentionPillUsed")) ||
    (have($item`synthetic dog hair pill`) && !get("_syntheticDogHairPillUsed")) ||
    (have($item`designer sweatpants`) && get("_sweatOutSomeBoozeUsed") < 3 && get("sweat") >= 25) ||
    (have($item`mime army shotglass`) && !get("_mimeArmyShotglassUsed")) ||
    (get("currentMojoFilters") < 3 &&
      mallPrice($item`mojo filter`) + mallPrice($item`transdermal smoke patch`) <
        2.5 * get("valueOfAdventure"))
  );
}

export function stooperDrunk(): boolean {
  return (
    myInebriety() > inebrietyLimit() ||
    (myInebriety() === inebrietyLimit() && myFamiliar() === $familiar`Stooper`)
  );
}

export function totallyDrunk(): boolean {
  return have($familiar`Stooper`) && myFamiliar() !== $familiar`Stooper`
    ? myInebriety() > inebrietyLimit() + 1
    : myInebriety() > inebrietyLimit();
}

export function doneAdventuring(): boolean {
  return (!canDiet() && myAdventures() === 0) || stooperDrunk();
}

export function backstageItemsDone(): boolean {
  return (
    (have($item`giant marshmallow`) ? 1 : 0) +
      (have($item`beer-scented teddy bear`) ? 1 : 0) +
      itemAmount($item`gin-soaked blotter paper`) >=
      2 &&
    (have($item`booze-soaked cherry`) ? 1 : 0) +
      (have($item`comfy pillow`) ? 1 : 0) +
      itemAmount($item`sponge cake`) >=
      2
  );
}

const gardens = $items`packet of pumpkin seeds, Peppermint Pip Packet, packet of dragon's teeth, packet of beer seeds, packet of winter seeds, packet of thanksgarden seeds, packet of tall grass seeds, packet of mushroom spores, packet of rock seeds`;
export function getGarden(): Item {
  return gardens.find((it) => it.name in getCampground()) || $item`none`;
}

let banishes: Item[];
export function nextUnusedBanishItem(): Item {
  if (!banishes)
    banishes = $items`human musk, tennis ball, Louder Than Bomb, divine champagne popper`.sort(
      (a, b) => mallPrice(a) - mallPrice(b)
    ); //sorted from cheapest to most expensive
  return banishes.find((it) => !getBanishedMonsters().get(it)) || $item`none`; //return the cheapest free banish not currently in use
}

export function chewOrWish(it: Item, ef: Effect): void {
  if (mallPrice(it) + mallPrice($item`mojo filter`) < mallPrice($item`pocket wish`)) {
    if (mySpleenUse() === spleenLimit()) use(1, $item`mojo filter`);
    chew(it);
  } else {
    retrieveItem($item`pocket wish`);
    cliExecute(`genie effect ${ef.name}`);
  }
}

export function isGoodGarboScript(scr: string): boolean {
  // Returns true if scr includes "garbo", and doesn't include a semicolon
  return scr.includes("garbo") && !scr.includes(";");
}

export const cyberOutfit: OutfitSpec = {
  equip: [
    $item`giant yellow hat`,
    $item`June cleaver`,
    $item`visual packet sniffer`,
    $item`zero-trust tanktop`,
  ].concat(
    have($item`familiar-in-the-middle wrapper`) ? [$item`familiar-in-the-middle wrapper`] : []
  ),
  acc1: $item`retro floppy disk`,
  acc2: $item`retro floppy disk`,
  acc3: $item`retro floppy disk`,
  familiar: $familiar`Shorter-Order Cook`,
};

export function nextCyberZone(): Location {
  const mapping = {
    _cyberZone1Turns: $location`Cyberzone 1`,
    _cyberZone2Turns: $location`Cyberzone 2`,
    _cyberZone3Turns: $location`Cyberzone 3`,
  };
  for (const [pref, loc] of Object.entries(mapping)) {
    if (get(pref, 0) < 20) return loc;
  }
  return $location`none`;
}

export const cyberTasks = (): Task[] => [
  {
    name: "CyberRealm Freebies",
    completed: () => get("_cyberTrashCollected", false),
    do: () => {
      visitUrl("place.php?whichplace=serverroom&action=serverroom_chipdrawer");
      visitUrl("place.php?whichplace=serverroom&action=serverroom_trash1");
    },
  },
  {
    name: "CyberRealm",
    completed: () => nextCyberZone() === $location`none`,
    do: () => nextCyberZone(),
    effects: () => $effects`Astral Shell, Elemental Saucesphere, Scarysauce, Minor Invulnerability`,
    outfit: cyberOutfit,
    combat: new CombatStrategy().macro(() =>
      Macro.if_(
        "!monsterphylum construct",
        Macro.tryItem([$item`porquoise-handled sixgun`, $item`train whistle`])
          .attack()
          .repeat()
      )
        .skill($skill`Throw Cyber Rock`)
        .repeat()
    ),
    choices: () => ({
      1545: 1,
      1546: 1,
      1547: 1,
      1548: 1,
      1549: 1,
      1550: 1,
    }),
    limit: { tries: 60 },
  },
];
