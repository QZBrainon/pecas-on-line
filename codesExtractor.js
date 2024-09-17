const fs = require("fs");

function extractCodes(filename) {
  const codesSet = [];
  let currentRow = [];

  // Read the file line by line
  fs.readFile(filename, "utf8", (err, data) => {
    if (err) throw err;

    const lines = data.split("\n");
    for (const line of lines) {
      const code = line.trim().split(" ")[0];
      currentRow.push(code);

      // If the row has 5 codes, add it to the codesSet and start a new row
      if (currentRow.length === 5) {
        codesSet.push(currentRow);
        currentRow = [];
      }
    }

    // If the last row has less than 5 codes, add it to the codesSet
    if (currentRow.length > 0) {
      codesSet.push(currentRow);
    }

    // Save the codesSet to a JSON file
    fs.writeFile("codes.json", JSON.stringify(codesSet), (err) => {
      if (err) throw err;
      console.log("Codes saved to codes.json");
    });
  });
}

extractCodes("PD195.txt");
