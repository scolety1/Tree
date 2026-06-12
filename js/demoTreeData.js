function fakeBirthDate(year, month, day) {
  return {
    toDate() {
      return new Date(year, month - 1, day);
    }
  };
}

function createDemoPerson(id, firstName, lastName, birthYear, parentIds = [], spouseIds = []) {
  return {
    id,
    firstName: firstName.toLowerCase(),
    lastName: lastName.toLowerCase(),
    birthDate: fakeBirthDate(birthYear, ((birthYear + id.length) % 12) + 1, ((birthYear + id.length) % 24) + 1),
    parentIds,
    spouseIds,
  };
}

export function generateLargeDemoTree() {
  const people = [];
  const add = (...args) => {
    const person = createDemoPerson(...args);
    people.push(person);
    return person;
  };

  const founders = [
    [add("demo-g1-01", "Eleanor", "Johnson", 1931), add("demo-g1-02", "Harold", "Johnson", 1929)],
    [add("demo-g1-03", "Dorothy", "Miller", 1934), add("demo-g1-04", "Arthur", "Miller", 1930)],
    [add("demo-g1-05", "June", "Parker", 1936), add("demo-g1-06", "Mateo", "Parker", 1933)],
    [add("demo-g1-07", "Clara", "Brooks", 1938), add("demo-g1-08", "Walter", "Brooks", 1935)],
  ];

  founders.forEach(([a, b]) => {
    a.spouseIds = [b.id];
    b.spouseIds = [a.id];
  });

  const generationTwo = [];
  founders.forEach(([parentA, parentB], familyIndex) => {
    for (let i = 0; i < 4; i++) {
      generationTwo.push(add(
        `demo-g2-${familyIndex + 1}${i + 1}`,
        ["Graham", "Nora", "Cal", "Mara", "Lou", "Iris", "Ben", "Tess", "Sam", "Lena", "Dean", "Ruth", "Max", "Vera", "Owen", "Nell"][familyIndex * 4 + i],
        parentA.lastName,
        1957 + familyIndex * 4 + i,
        [parentA.id, parentB.id]
      ));
    }
  });

  const pairings = [
    [generationTwo[0], generationTwo[5]],
    [generationTwo[1], generationTwo[8]],
    [generationTwo[2], generationTwo[12]],
    [generationTwo[3], generationTwo[9]],
    [generationTwo[4], generationTwo[13]],
    [generationTwo[6], generationTwo[10]],
    [generationTwo[7], generationTwo[15]],
  ];

  pairings.forEach(([a, b]) => {
    a.spouseIds = [b.id];
    b.spouseIds = [a.id];
  });

  const generationThree = [];
  pairings.forEach(([parentA, parentB], pairIndex) => {
    const childCount = pairIndex % 2 === 0 ? 4 : 3;
    for (let i = 0; i < childCount; i++) {
      generationThree.push(add(
        `demo-g3-${pairIndex + 1}${i + 1}`,
        ["Alex", "Jamie", "Casey", "Morgan", "Taylor", "Jordan", "Riley", "Quinn", "Avery", "Parker", "Rowan", "Hayden", "Emery", "Reese", "Finley", "Sage", "Drew", "Blair", "Kai", "Remy", "Lane", "Noel", "Skye", "Arden", "Wren"][generationThree.length],
        parentA.lastName,
        1982 + pairIndex * 2 + i,
        [parentA.id, parentB.id]
      ));
    }
  });

  const generationFourParents = [
    [generationThree[0], generationThree[6]],
    [generationThree[2], generationThree[10]],
    [generationThree[4], generationThree[12]],
    [generationThree[7], generationThree[15]],
    [generationThree[9], generationThree[18]],
  ];

  generationFourParents.forEach(([a, b]) => {
    a.spouseIds = [b.id];
    b.spouseIds = [a.id];
  });

  const generationFour = [];
  generationFourParents.forEach(([parentA, parentB], pairIndex) => {
    for (let i = 0; i < 3; i++) {
      generationFour.push(add(
        `demo-g4-${pairIndex + 1}${i + 1}`,
        ["Milo", "Ivy", "Theo", "Ada", "Ezra", "Cleo", "Leo", "Mae", "Otis", "Faye", "Hugo", "Mina", "Jude", "Elle", "Arlo"][pairIndex * 3 + i],
        parentA.lastName,
        2011 + pairIndex + i,
        [parentA.id, parentB.id]
      ));
    }
  });

  const generationFiveParents = [
    [generationFour[0], generationFour[4]],
    [generationFour[2], generationFour[7]],
    [generationFour[5], generationFour[10]],
    [generationFour[8], generationFour[13]],
  ];

  generationFiveParents.forEach(([a, b]) => {
    a.spouseIds = [b.id];
    b.spouseIds = [a.id];
  });

  const generationFive = [];
  generationFiveParents.forEach(([parentA, parentB], pairIndex) => {
    for (let i = 0; i < 3; i++) {
      generationFive.push(add(
        `demo-g5-${pairIndex + 1}${i + 1}`,
        ["Nico", "Lila", "Rory", "Eden", "Miles", "Nia", "Oscar", "Mira", "Caleb", "Esme", "Jonah", "Zara"][pairIndex * 3 + i],
        parentA.lastName,
        2005 + pairIndex + i,
        [parentA.id, parentB.id]
      ));
    }
  });

  const generationSixParents = [
    [generationFive[0], generationFive[5]],
    [generationFive[3], generationFive[9]],
  ];

  generationSixParents.forEach(([a, b]) => {
    a.spouseIds = [b.id];
    b.spouseIds = [a.id];
  });

  generationSixParents.forEach(([parentA, parentB], pairIndex) => {
    for (let i = 0; i < 2; i++) {
      add(
        `demo-g6-${pairIndex + 1}${i + 1}`,
        ["Poppy", "Finn", "Maeve", "Owen"][pairIndex * 2 + i],
        parentA.lastName,
        2022 + pairIndex + i,
        [parentA.id, parentB.id]
      );
    }
  });

  return people;
}
